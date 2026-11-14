/**
 * Picture properties: wrapping, position, size, alternative text, rotation and flips. Changing
 * the placement drops the original drawing XML so the exporter writes the new placement.
 */
import type { Node as PMNode } from 'prosemirror-model';
import { type EditorState, NodeSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { schema } from '../core/model/schema';
import type { AnchorInfo } from '../core/model/types';
import { REFRESH } from './meta';

export type WrapKind = 'inline' | 'square' | 'squareLeft' | 'squareRight' | 'tight' | 'through' | 'topAndBottom' | 'behind' | 'inFront';
export const WRAP_KINDS: WrapKind[] = ['inline', 'square', 'squareLeft', 'squareRight', 'tight', 'through', 'topAndBottom', 'behind', 'inFront'];
export const H_RELATIVE = ['page', 'column', 'margin', 'character'] as const;
export const V_RELATIVE = ['page', 'margin', 'paragraph', 'line'] as const;

export function selectedImage(state: EditorState): { node: PMNode; pos: number } | null {
  const sel = state.selection;
  if (sel instanceof NodeSelection && sel.node.type === schema.nodes.image) return { node: sel.node, pos: sel.from };
  return null;
}

export function wrapKind(anchor: AnchorInfo | null): WrapKind {
  if (!anchor) return 'inline';
  switch (anchor.wrap) {
    case 'square': return anchor.hAlign === 'left' ? 'squareLeft' : anchor.hAlign === 'right' ? 'squareRight' : 'square';
    case 'tight': return 'tight';
    case 'through': return 'through';
    case 'topAndBottom': return 'topAndBottom';
    default: return anchor.behindDoc ? 'behind' : 'inFront';
  }
}

const DIST = 114300;

/** Floating placement for a wrap kind, keeping the current position where it applies. */
export function anchorFor(kind: WrapKind, cur: AnchorInfo | null): AnchorInfo | null {
  if (kind === 'inline') return null;
  const base: AnchorInfo = cur ? { ...cur } : { wrap: 'square', behindDoc: false, hRelative: 'column', vRelative: 'paragraph', vOffset: 0, distT: 0, distB: 0, distL: DIST, distR: DIST };
  base.behindDoc = false;
  switch (kind) {
    case 'square':
      base.wrap = 'square';
      if (base.hAlign === undefined && base.hOffset === undefined) base.hOffset = 0;
      break;
    case 'squareLeft':
    case 'squareRight':
      base.wrap = 'square';
      base.hRelative = 'margin';
      base.hAlign = kind === 'squareLeft' ? 'left' : 'right';
      delete base.hOffset;
      break;
    case 'tight':
    case 'through':
      base.wrap = kind;
      break;
    case 'topAndBottom':
      base.wrap = 'topAndBottom';
      if (base.hAlign === undefined && base.hOffset === undefined) base.hOffset = 0;
      break;
    case 'behind':
    case 'inFront':
      base.wrap = 'none';
      base.behindDoc = kind === 'behind';
      if (base.hAlign === undefined && base.hOffset === undefined) base.hOffset = 0;
      break;
  }
  if (base.vAlign === undefined && base.vOffset === undefined) base.vOffset = 0;
  return base;
}

export interface ImagePatch {
  width?: number;
  height?: number;
  alt?: string;
  title?: string;
  wrap?: WrapKind;
  hOffset?: number;
  vOffset?: number;
  hRelative?: string;
  vRelative?: string;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  /** Link address; empty removes the link. */
  href?: string;
}

/** Change the picture at `pos` (keeping it selected). */
export function setImageProps(view: EditorView, pos: number, patch: ImagePatch): boolean {
  const node = view.state.doc.nodeAt(pos);
  if (!node || node.type !== schema.nodes.image) return false;
  const a = { ...node.attrs };
  let placement = false;
  if (patch.width !== undefined && patch.width > 0) a.width = Math.round(patch.width);
  if (patch.height !== undefined && patch.height > 0) a.height = Math.round(patch.height);
  if (patch.alt !== undefined) a.alt = patch.alt;
  if (patch.title !== undefined) a.title = patch.title;
  if (patch.wrap !== undefined && patch.wrap !== wrapKind(a.anchor)) {
    a.anchor = anchorFor(patch.wrap, a.anchor);
    placement = true;
  }
  if (a.anchor && (patch.hOffset !== undefined || patch.vOffset !== undefined || patch.hRelative || patch.vRelative)) {
    const an: AnchorInfo = { ...a.anchor };
    if (patch.hOffset !== undefined) {
      an.hOffset = Math.round(patch.hOffset);
      delete an.hAlign;
    }
    if (patch.vOffset !== undefined) {
      an.vOffset = Math.round(patch.vOffset);
      delete an.vAlign;
    }
    if (patch.hRelative) an.hRelative = patch.hRelative;
    if (patch.vRelative) an.vRelative = patch.vRelative;
    a.anchor = an;
    placement = true;
  }
  if (patch.rotation !== undefined) a.rotation = ((Math.round(patch.rotation) % 360) + 360) % 360;
  if (patch.flipH !== undefined) a.flipH = patch.flipH;
  if (patch.flipV !== undefined) a.flipV = patch.flipV;
  // A new placement is written from the attributes; other drawing XML is kept.
  if (placement) a.raw = null;
  const tr = view.state.tr.setNodeMarkup(pos, undefined, a);
  if (patch.href !== undefined) {
    tr.removeMark(pos, pos + 1, schema.marks.link);
    const href = patch.href.trim();
    if (href) tr.addMark(pos, pos + 1, schema.marks.link.create({ href: /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') ? href : `https://${href}` }));
  }
  tr.setSelection(NodeSelection.create(tr.doc, pos));
  view.dispatch(tr.setMeta(REFRESH, true));
  return true;
}

/** Rotate by 90° steps or flip the selected picture. */
export function transformImage(view: EditorView, op: 'rotateRight' | 'rotateLeft' | 'flipH' | 'flipV'): boolean {
  const img = selectedImage(view.state);
  if (!img) return false;
  const a = img.node.attrs;
  if (op === 'rotateRight') return setImageProps(view, img.pos, { rotation: (a.rotation ?? 0) + 90 });
  if (op === 'rotateLeft') return setImageProps(view, img.pos, { rotation: (a.rotation ?? 0) - 90 });
  if (op === 'flipH') return setImageProps(view, img.pos, { flipH: !a.flipH });
  return setImageProps(view, img.pos, { flipV: !a.flipV });
}

/** The link on a picture, if any. */
export function imageLink(node: PMNode): string {
  return node.marks.find((m) => m.type === schema.marks.link)?.attrs.href ?? '';
}

/** Natural size of a picture in EMU (from the decoded image). */
export function naturalSize(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth ? { width: img.naturalWidth * 9525, height: img.naturalHeight * 9525 } : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
