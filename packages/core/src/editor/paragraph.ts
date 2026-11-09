/**
 * Paragraph properties for the Paragraph dialog and the line spacing menu: the effective values
 * of the selected paragraphs (style cascade plus direct formatting) and direct changes to them.
 */
import type { Node as PMNode } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';
import type { DocxDocument } from '../core/document';
import type { Indent, Spacing, TabStop } from '../core/model/types';
import { selectedParagraphs, updateParagraphs } from './commands';

export type LineRule = 'multiple' | 'atLeast' | 'exactly';
export type Special = 'none' | 'firstLine' | 'hanging';
export type TabAlign = 'left' | 'center' | 'right' | 'decimal' | 'bar';
export type TabLeader = 'none' | 'dot' | 'hyphen' | 'underscore';

/**
 * Paragraph settings in dialog units: inches for indents and tabs (centimetres where the ruler is
 * metric: `metric` below), points for spacing.
 */
export interface ParagraphSettings {
  align: 'left' | 'center' | 'right' | 'both';
  rtl: boolean;
  /** Inches, or centimetres. */
  left: number;
  right: number;
  special: Special;
  by: number;
  /** Points. */
  before: number;
  after: number;
  lineRule: LineRule;
  /** Lines for multiple, points otherwise. */
  lineValue: number;
  contextual: boolean;
  keepNext: boolean;
  keepLines: boolean;
  widowControl: boolean;
  pageBreakBefore: boolean;
  tabs: { pos: number; align: TabAlign; leader: TabLeader }[];
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const TW_PER_IN = 1440;
/** Twips per unit of the dialog's lengths. */
const twipsPer = (metric: boolean) => (metric ? TW_PER_IN / 2.54 : TW_PER_IN);

function effective(docx: DocxDocument, node: PMNode) {
  const a = node.attrs;
  return docx.styles.effectiveParagraph(a.styleId, {
    align: a.align ?? undefined,
    indent: a.indent ?? undefined,
    spacing: a.spacing ?? undefined,
    contextualSpacing: a.contextualSpacing ?? undefined,
    keepNext: a.keepNext ?? undefined,
    keepLines: a.keepLines ?? undefined,
    widowControl: a.widowControl ?? undefined,
    pageBreakBefore: a.pageBreakBefore ?? undefined,
    tabs: a.tabs ?? undefined,
    bidi: a.bidi ?? undefined,
  });
}

/** Settings of one paragraph. */
export function paragraphSettings(docx: DocxDocument, node: PMNode, metric = false): ParagraphSettings {
  const p = effective(docx, node);
  const u = twipsPer(metric);
  const ind: Indent = p.indent ?? {};
  const sp: Spacing = p.spacing ?? {};
  const rule: LineRule = sp.lineRule === 'exact' ? 'exactly' : sp.lineRule === 'atLeast' ? 'atLeast' : 'multiple';
  const align = p.align === 'center' || p.align === 'right' || p.align === 'both' ? p.align : p.align === 'end' ? 'right' : p.align === 'distribute' ? 'both' : 'left';
  return {
    align,
    rtl: !!p.bidi,
    left: round((ind.left ?? 0) / u),
    right: round((ind.right ?? 0) / u),
    special: ind.hanging ? 'hanging' : ind.firstLine ? 'firstLine' : 'none',
    by: round((ind.hanging ?? ind.firstLine ?? 0) / u),
    before: round((sp.before ?? 0) / 20, 1),
    after: round((sp.after ?? 0) / 20, 1),
    lineRule: rule,
    lineValue: rule === 'multiple' ? round((sp.line ?? 240) / 240) : round((sp.line ?? 240) / 20, 1),
    contextual: !!p.contextualSpacing,
    keepNext: !!p.keepNext,
    keepLines: !!p.keepLines,
    widowControl: p.widowControl !== false,
    pageBreakBefore: !!p.pageBreakBefore,
    tabs: (p.tabs ?? []).filter((t: TabStop) => t.val !== 'clear').map((t: TabStop) => ({
      pos: round(t.pos / u),
      align: (['left', 'center', 'right', 'decimal', 'bar'].includes(t.val) ? t.val : t.val === 'start' ? 'left' : t.val === 'end' ? 'right' : 'left') as TabAlign,
      leader: (['dot', 'hyphen', 'underscore'].includes(t.leader ?? '') ? t.leader : 'none') as TabLeader,
    })).sort((a, b) => a.pos - b.pos),
  };
}

/** Settings of the selected paragraphs; fields where they differ are listed in `mixed`. */
export function selectionSettings(view: EditorView, docx: DocxDocument, metric = false): { settings: ParagraphSettings; mixed: Set<keyof ParagraphSettings> } {
  const paras = selectedParagraphs(view.state);
  const all = paras.map((p) => paragraphSettings(docx, p.node, metric));
  const settings = all[0] ?? paragraphSettings(docx, view.state.selection.$from.parent, metric);
  const mixed = new Set<keyof ParagraphSettings>();
  for (const s of all.slice(1)) {
    for (const k of Object.keys(settings) as (keyof ParagraphSettings)[]) {
      if (JSON.stringify(s[k]) !== JSON.stringify(settings[k])) mixed.add(k);
    }
  }
  return { settings, mixed };
}

/** Apply the changed fields of `next` (relative to `prev`, both read with the same `metric`) to the selected paragraphs. */
export function applyParagraphSettings(view: EditorView, prev: ParagraphSettings, next: ParagraphSettings, metric = false): boolean {
  const u = twipsPer(metric);
  const changed = (k: keyof ParagraphSettings) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]);
  if (!(Object.keys(next) as (keyof ParagraphSettings)[]).some(changed)) return false;
  return updateParagraphs(view, (a) => {
    const out = { ...a };
    if (changed('align')) out.align = next.align;
    if (changed('rtl')) out.bidi = next.rtl;
    if (changed('left') || changed('right') || changed('special') || changed('by')) {
      const ind: Indent = { ...((a.indent as Indent) ?? {}) };
      if (changed('left')) ind.left = Math.round(next.left * u);
      if (changed('right')) ind.right = Math.round(next.right * u);
      if (changed('special') || changed('by')) {
        delete ind.firstLine;
        delete ind.hanging;
        if (next.special === 'firstLine') ind.firstLine = Math.round(next.by * u);
        else if (next.special === 'hanging') ind.hanging = Math.round(next.by * u);
        else ind.firstLine = 0;
      }
      out.indent = ind;
    }
    if (changed('before') || changed('after') || changed('lineRule') || changed('lineValue')) {
      const sp: Spacing = { ...((a.spacing as Spacing) ?? {}) };
      if (changed('before')) {
        sp.before = Math.round(next.before * 20);
        delete sp.beforeAutospacing;
      }
      if (changed('after')) {
        sp.after = Math.round(next.after * 20);
        delete sp.afterAutospacing;
      }
      if (changed('lineRule') || changed('lineValue')) {
        if (next.lineRule === 'multiple') {
          sp.lineRule = 'auto';
          sp.line = Math.round(Math.max(0.06, next.lineValue) * 240);
        } else {
          sp.lineRule = next.lineRule === 'exactly' ? 'exact' : 'atLeast';
          sp.line = Math.round(Math.max(0.7, next.lineValue) * 20);
        }
      }
      out.spacing = sp;
    }
    if (changed('contextual')) out.contextualSpacing = next.contextual;
    if (changed('keepNext')) out.keepNext = next.keepNext;
    if (changed('keepLines')) out.keepLines = next.keepLines;
    if (changed('widowControl')) out.widowControl = next.widowControl;
    if (changed('pageBreakBefore')) out.pageBreakBefore = next.pageBreakBefore;
    if (changed('tabs')) {
      // Tabs inherited from the style but removed here are cleared explicitly.
      const kept = new Set(next.tabs.map((t) => Math.round(t.pos * u)));
      const cleared = prev.tabs.filter((t) => !kept.has(Math.round(t.pos * u))).map((t) => ({ pos: Math.round(t.pos * u), val: 'clear' }));
      out.tabs = [
        ...next.tabs.map((t) => ({ pos: Math.round(t.pos * u), val: t.align, ...(t.leader !== 'none' ? { leader: t.leader } : {}) })),
        ...cleared,
      ].sort((x, y) => x.pos - y.pos);
    }
    return out;
  }, true);
}

/** "Add space before/after paragraph" (12 pt) or remove it. */
export function toggleParagraphSpace(view: EditorView, docx: DocxDocument, side: 'before' | 'after'): boolean {
  const first = selectedParagraphs(view.state)[0];
  if (!first) return false;
  const cur = paragraphSettings(docx, first.node)[side];
  const value = cur > 0 ? 0 : 240;
  return updateParagraphs(view, (a) => ({ ...a, spacing: { ...((a.spacing as Spacing) ?? {}), [side]: value } }), true);
}

/** Paragraph direction (Format › Left-to-right / Right-to-left text). */
export function setDirection(view: EditorView, rtl: boolean): boolean {
  return updateParagraphs(view, (a) => ({ ...a, bidi: rtl }), true);
}
