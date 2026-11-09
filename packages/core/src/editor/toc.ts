/**
 * Table of contents: a Word TOC field whose result is one paragraph per heading, each a link to
 * a hidden `_Toc` bookmark on the heading, followed by a dot leader and the page number.
 */
import type { Node as PMNode } from 'prosemirror-model';
import { TextSelection, type Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type { DocxDocument } from '../core/document';
import { schema } from '../core/model/schema';
import { listBookmarks, listHeadings } from './bookmarks';
import { contentWidthPx } from './commands';
import { REFRESH } from './meta';

export const TOC_INSTR = ' TOC \\o "1-3" \\h \\z \\u ';

export interface TocRegion {
  /** Block range of the paragraphs holding the field. */
  from: number;
  to: number;
  instr: string;
}

/** The first TOC field of the document. */
export function findToc(doc: PMNode): TocRegion | null {
  const stack: { para: number; instr: string }[] = [];
  let para = -1;
  let found: TocRegion | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.isTextblock) {
      para = pos;
      return true;
    }
    if (node.type === schema.nodes.field_char) {
      if (node.attrs.type === 'begin') stack.push({ para, instr: '' });
      else if (node.attrs.type === 'end') {
        const f = stack.pop();
        if (f && /^\s*TOC\b/i.test(f.instr)) {
          const end = doc.nodeAt(para);
          found = { from: f.para, to: para + (end?.nodeSize ?? 0), instr: f.instr };
        }
      }
    } else if (node.type === schema.nodes.instr_text && stack.length) {
      stack[stack.length - 1].instr += node.attrs.text;
    }
    return true;
  });
  return found;
}

function levelsOf(instr: string): [number, number] {
  const m = /\\o\s+"(\d)-(\d)"/.exec(instr);
  return m ? [Number(m[1]), Number(m[2])] : [1, 3];
}

function tocBookmarkIn(doc: PMNode, headingPos: number): string | null {
  const heading = doc.nodeAt(headingPos);
  if (!heading) return null;
  const end = headingPos + heading.nodeSize;
  return listBookmarks(doc, true).find((b) => b.pos > headingPos && b.pos < end && b.name.startsWith('_Toc'))?.name ?? null;
}

function newTocName(used: Set<string>): string {
  let name = '';
  do name = `_Toc${100000000 + Math.floor(Math.random() * 899999999)}`;
  while (used.has(name));
  used.add(name);
  return name;
}

/** Add a hidden `_Toc` bookmark around every heading that lacks one (last to first). */
function bookmarkHeadings(tr: Transaction, headings: { pos: number }[]): void {
  const used = new Set(listBookmarks(tr.doc, true).map((b) => b.name));
  let maxId = 0;
  tr.doc.descendants((n) => {
    if (n.type === schema.nodes.bookmark_start || n.type === schema.nodes.bookmark_end) maxId = Math.max(maxId, Number(n.attrs.id) || 0);
    return true;
  });
  for (let i = headings.length - 1; i >= 0; i--) {
    const pos = headings[i].pos;
    if (tocBookmarkIn(tr.doc, pos)) continue;
    const node = tr.doc.nodeAt(pos);
    if (!node) continue;
    const id = String(++maxId);
    tr.insert(pos + node.nodeSize - 1, schema.nodes.bookmark_end.create({ id }));
    tr.insert(pos + 1, schema.nodes.bookmark_start.create({ id, name: newTocName(used) }));
  }
}

/** The field result: one paragraph per heading. `pageOf` gives the page label of a position. */
function buildEntries(doc: PMNode, docx: DocxDocument, instr: string, pageOf: (pos: number) => string, rightTab: number, empty: string, skip?: TocRegion): PMNode[] {
  const [lo, hi] = levelsOf(instr);
  const heads = listHeadings(doc).filter((h) => h.level >= lo && h.level <= hi && !(skip && h.pos >= skip.from && h.pos < skip.to));
  const begin = [schema.nodes.field_char.create({ type: 'begin' }), schema.nodes.instr_text.create({ text: instr }), schema.nodes.field_char.create({ type: 'separate' })];
  const end = schema.nodes.field_char.create({ type: 'end' });
  if (!heads.length) return [schema.nodes.paragraph.create({ styleId: docx.styles.ensureStyle('TOC1') ? 'TOC1' : null }, [...begin, schema.text(empty), end])];
  return heads.map((h, i) => {
    const level = Math.min(h.level - lo + 1, 9);
    const styleId = `TOC${level}`;
    const hasStyle = docx.styles.ensureStyle(styleId) || !!docx.styles.get(styleId);
    const bookmark = tocBookmarkIn(doc, h.pos);
    const link = schema.marks.link.create({ href: '', anchor: bookmark });
    const content: PMNode[] = [];
    if (i === 0) content.push(...begin);
    content.push(schema.text(h.text, bookmark ? [link] : []), schema.nodes.tab.create(null, null, bookmark ? [link] : []), schema.text(pageOf(h.pos) || '1', bookmark ? [link] : []));
    if (i === heads.length - 1) content.push(end);
    return schema.nodes.paragraph.create({
      styleId: hasStyle ? styleId : null,
      tabs: [{ pos: rightTab, val: 'right', leader: 'dot' }],
      indent: hasStyle ? null : { left: (level - 1) * 220 },
    }, content);
  });
}

export interface TocLabels {
  title: string;
  empty: string;
}

/** Insert a table of contents at the caret (a title, then the field). */
export function insertToc(view: EditorView, docx: DocxDocument, pageOf: (pos: number) => string, labels: TocLabels): boolean {
  const tr = view.state.tr;
  bookmarkHeadings(tr, listHeadings(tr.doc));
  const rightTab = Math.round(contentWidthPx(view.state) * 15);
  const entries = buildEntries(tr.doc, docx, TOC_INSTR, (p) => pageOf(tr.mapping.invert().map(p)), rightTab, labels.empty);
  const title = schema.nodes.paragraph.create({ styleId: docx.styles.ensureStyle('TOCHeading') ? 'TOCHeading' : null }, [schema.text(labels.title)]);
  const $from = tr.doc.resolve(tr.mapping.map(view.state.selection.from));
  // Block position: replace an empty paragraph, otherwise insert after the current paragraph.
  let depth = $from.depth;
  while (depth > 0 && !$from.node(depth).isTextblock) depth--;
  const para = $from.node(depth);
  const at = depth > 0 ? (para.content.size === 0 ? $from.before(depth) : $from.after(depth)) : $from.pos;
  if (depth > 0 && para.content.size === 0) tr.replaceWith(at, at + para.nodeSize, [title, ...entries]);
  else tr.insert(at, [title, ...entries]);
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(tr.doc.content.size, at + 1))));
  view.dispatch(tr.setMeta(REFRESH, true).scrollIntoView());
  return true;
}

/** Rebuild the first table of contents (entries and page numbers). */
export function refreshToc(view: EditorView, docx: DocxDocument, pageOf: (pos: number) => string, labels: TocLabels): boolean {
  const region = findToc(view.state.doc);
  if (!region) return false;
  const tr = view.state.tr;
  bookmarkHeadings(tr, listHeadings(tr.doc).filter((h) => h.pos < region.from || h.pos >= region.to));
  const mapped = { from: tr.mapping.map(region.from), to: tr.mapping.map(region.to), instr: region.instr };
  const rightTab = Math.round(contentWidthPx(view.state) * 15);
  const entries = buildEntries(tr.doc, docx, region.instr, (p) => pageOf(tr.mapping.invert().map(p)), rightTab, labels.empty, mapped);
  const old = tr.doc.slice(mapped.from, mapped.to).content;
  const next = schema.nodes.doc.create(null, entries).content;
  if (old.eq(next)) return false;
  tr.replaceWith(mapped.from, mapped.to, entries);
  view.dispatch(tr.setMeta(REFRESH, true).setMeta('addToHistory', true));
  return true;
}

/** Whether a position lies inside the table of contents. */
export function inToc(doc: PMNode, pos: number): boolean {
  const r = findToc(doc);
  return !!r && pos >= r.from && pos <= r.to;
}
