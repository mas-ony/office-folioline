/** Texts and small helpers of the panels and dialogs, shared by the React and Vue interfaces. */
import qrcode from 'qrcode-generator';
import type { BookmarkNameProblem } from '../editor/bookmarks';
import type { CollabStatus } from '../collab/session';
import type { DocxEditor } from '../editor/DocxEditor';
import type { MessageKey } from '../i18n';

export const EMU_PER_PT = 12700;
export const EMU_PER_IN = 914400;

/** The invitation link of a live session as a QR code (SVG markup). */
export function qrSvg(text: string): string {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 3, margin: 2, scalable: true });
}

export function collabStatusKey(status: CollabStatus): MessageKey {
  return status === 'live' ? 'collab.live' : status === 'offline' ? 'collab.offline' : status === 'ended' ? 'collab.ended' : 'collab.connecting';
}

/** A bookmark name made from the selected text. */
export function suggestedBookmarkName(editor: DocxEditor): string {
  const sel = editor.view.state.selection;
  return editor.view.state.doc.textBetween(sel.from, sel.to, ' ').replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/^[^\p{L}]+/u, '').slice(0, 40);
}

export function bookmarkProblemKey(problem: NonNullable<BookmarkNameProblem>): MessageKey {
  return `bookmark.name${problem === 'empty' ? 'Empty' : problem === 'tooLong' ? 'TooLong' : problem === 'start' ? 'Start' : 'Chars'}` as MessageKey;
}

/**
 * The address a typed link points at: web addresses get https://, e-mail addresses mailto:.
 * Null for an empty or a script address.
 */
export function linkUrl(typed: string): string | null {
  let url = typed.trim();
  if (!url) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('#')) url = /^[^\s@]+@[^\s@]+$/.test(url) ? `mailto:${url}` : `https://${url}`;
  return /^javascript:/i.test(url) ? null : url;
}

/** Counts that describe a document without its text, for problem reports. */
export function diagnostics(editor: DocxEditor): Record<string, string | number> {
  const doc = editor.view.state.doc;
  let paragraphs = 0;
  let words = 0;
  let tables = 0;
  let images = 0;
  doc.descendants((n) => {
    if (n.type.name === 'paragraph') paragraphs++;
    if (n.type.name === 'table') tables++;
    if (n.type.name === 'image') images++;
    if (n.isText) words += (n.text ?? '').split(/\s+/).filter(Boolean).length;
    return true;
  });
  return {
    app: 'Folioline 0.1.0',
    browser: navigator.userAgent,
    secureContext: String(window.isSecureContext),
    viewport: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}`,
    pages: editor.pageCount,
    paragraphs,
    words,
    tables,
    images,
    comments: editor.comments().length,
    trackedChanges: editor.trackedChanges().length,
    sections: editor.pageSetup().sections,
    mode: editor.editMode,
    view: editor.viewMode,
  };
}

/** A problem report: what happened, then the diagnostics. */
export function reportText(what: string, info: Record<string, string | number>): string {
  return `${what.trim()}\n\n---\n${Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('\n')}`;
}
