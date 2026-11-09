/**
 * Markdown export: headings, emphasis, links, lists, tables (nested tables as HTML), footnotes
 * and endnotes as `[^n]`, and tracked deletions as ~~strikethrough~~. Comments, headers,
 * footers and pictures are left out; it is the text of the document for docs and AI tools.
 */
import type { Mark, Node as PMNode } from 'prosemirror-model';
import type { DocxDocument } from '../document';
import { schema } from '../model/schema';
import type { NumPr } from '../model/types';

export interface MarkdownOptions {
  /** Show tracked deletions as ~~struck~~ text (default) or leave them out. */
  deletions?: 'strike' | 'omit';
  /** Text of a PAGE / NUMPAGES field at a body position (the page it is on), when known. */
  pageField?: (pos: number, kind: string) => string | undefined;
}

/** Characters that mean something anywhere in a line, HTML tags and entities. */
const ESCAPE = /([\\`*_[\]|~])|<(?=[A-Za-z/!?])|&(?=#?\w+;)/g;

/** Escape characters that Markdown would read as syntax inside a line. */
export function escapeMarkdown(s: string): string {
  return s.replace(ESCAPE, (m, ch: string | undefined) => (ch ? `\\${ch}` : m === '<' ? '\\<' : '&amp;'));
}

/** Escape what would make a paragraph a heading, list item, quote or rule. */
export function escapeLineStart(s: string): string {
  return s.replace(/^(\s*)(?:([#>+=-])|(\d+)(?=[.)](?:\s|$)))/, (_m, sp: string, ch: string | undefined, num: string | undefined) => (ch ? `${sp}\\${ch}` : `${sp}${num}\\`));
}

function numPrOf(docx: DocxDocument, node: PMNode): NumPr | null {
  const direct = node.attrs.numPr as NumPr | null;
  const fromStyle = docx.styles.resolveParagraphStyle(node.attrs.styleId).pPr.numPr;
  if (direct) {
    if (direct.numId) return direct.numId === '0' ? null : direct;
    if (fromStyle?.numId) return { numId: fromStyle.numId, ilvl: direct.ilvl };
    return null;
  }
  return fromStyle?.numId && fromStyle.numId !== '0' ? fromStyle : null;
}

function headingLevel(docx: DocxDocument, node: PMNode): number {
  const id: string = node.attrs.styleId ?? '';
  const m = /^Heading([1-6])$/i.exec(id);
  if (m) return Number(m[1]);
  if (/^Title$/i.test(id)) return 1;
  const lvl = node.attrs.outlineLvl ?? docx.styles.effectiveParagraph(id).outlineLvl;
  return typeof lvl === 'number' && lvl < 6 ? lvl + 1 : 0;
}

const has = (marks: readonly Mark[], name: string) => marks.some((m) => m.type.name === name && m.attrs.value !== false);

class Writer {
  private notes: { label: string; text: string }[] = [];

  constructor(private docx: DocxDocument, private opts: MarkdownOptions) {}

  /**
   * Inline content of a textblock. `html` writes HTML (for nested tables); `base` is the
   * position of the paragraph's content in the body, when known.
   */
  inline(para: PMNode, html = false, base: number | null = null): string {
    let out = '';
    let open = { b: false, i: false, s: false, del: false };
    let link: string | null = null;
    const close = () => {
      let s = '';
      if (open.del) s += html ? '</del>' : '~~';
      if (open.s) s += html ? '</s>' : '~~';
      if (open.i) s += html ? '</em>' : '*';
      if (open.b) s += html ? '</strong>' : '**';
      open = { b: false, i: false, s: false, del: false };
      return s;
    };
    const flushLink = () => {
      if (link === null) return '';
      const href = link;
      link = null;
      return href ? (html ? '</a>' : `](${href})`) : '';
    };
    para.forEach((node, offset) => {
      const marks = node.marks;
      const deleted = marks.some((m) => m.type === schema.marks.deletion);
      if (deleted && this.opts.deletions === 'omit') return;
      const linkMark = marks.find((m) => m.type === schema.marks.link);
      const href = linkMark && linkMark.attrs.href && /^(https?:|mailto:)/i.test(linkMark.attrs.href) ? linkMark.attrs.href : '';
      const want = {
        b: has(marks, 'bold') || marks.some((m) => m.type.name === 'charStyle' && /^Strong$/i.test(m.attrs.styleId)),
        i: has(marks, 'italic') || marks.some((m) => m.type.name === 'charStyle' && /^Emphasis$/i.test(m.attrs.styleId)),
        s: has(marks, 'strike') || has(marks, 'dstrike'),
        del: deleted,
      };
      const text = node.type === schema.nodes.page_field
        ? (base !== null ? this.opts.pageField?.(base + offset, node.attrs.kind) : undefined) ?? ''
        : this.leafText(node, html);
      if (!text) return;
      const blank = !text.trim();
      if ((link ?? '') !== href) {
        out += close();
        out += flushLink();
        if (href) {
          out += html ? `<a href="${href.replace(/"/g, '&quot;')}">` : '[';
          link = href;
        }
      }
      if (!blank && (want.b !== open.b || want.i !== open.i || want.s !== open.s || want.del !== open.del)) {
        out += close();
        if (want.b) out += html ? '<strong>' : '**';
        if (want.i) out += html ? '<em>' : '*';
        if (want.s) out += html ? '<s>' : '~~';
        if (want.del) out += html ? '<del>' : '~~';
        open = { ...want };
      }
      out += text;
    });
    out += close();
    out += flushLink();
    return out;
  }

  private leafText(node: PMNode, html: boolean): string {
    switch (node.type.name) {
      case 'text': return html ? (node.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;') : escapeMarkdown(node.text ?? '');
      case 'tab': return ' ';
      case 'hard_break': return html ? '<br>' : '  \n';
      case 'footnote_ref': {
        const kind = node.attrs.kind === 'endnote' ? 'endnote' : 'footnote';
        const key = `${kind}:${node.attrs.id}`;
        const doc = this.docx.notes.get(key);
        const n = this.notes.length + 1;
        const text = doc ? [...Array(doc.childCount).keys()].map((i) => this.inline(doc.child(i))).join(' ').replace(/^\s+/, '') : '';
        this.notes.push({ label: String(n), text });
        return `[^${n}]`;
      }
      case 'opaque_inline': return node.attrs.label === 'Text box' || node.attrs.label === 'Equation' ? escapeMarkdown(node.attrs.text ?? '') : '';
      case 'page_field': return '';
      case 'image': return node.attrs.alt ? (html ? escapeHtml(node.attrs.alt) : `*${escapeMarkdown(node.attrs.alt)}*`) : '';
      default: return node.isText ? escapeMarkdown(node.text ?? '') : '';
    }
  }

  /** Cell content for a pipe table: paragraphs joined with <br>, nested tables as HTML. */
  private cell(cell: PMNode): string {
    const parts: string[] = [];
    cell.forEach((block) => {
      if (block.type === schema.nodes.table) parts.push(this.htmlTable(block));
      else if (block.isTextblock) {
        const kind = this.listKind(block);
        const text = this.inline(block).replace(/\n/g, ' ');
        if (text) parts.push(kind ? `- ${text}` : text);
      }
    });
    return parts.join('<br>').replace(/\|/g, '\\|');
  }

  private htmlTable(table: PMNode): string {
    let out = '<table>';
    table.forEach((row) => {
      out += '<tr>';
      row.forEach((cell) => {
        const span = cell.attrs.colspan > 1 ? ` colspan="${cell.attrs.colspan}"` : '';
        const inner: string[] = [];
        cell.forEach((b) => {
          if (b.type === schema.nodes.table) inner.push(this.htmlTable(b));
          else if (b.isTextblock) inner.push(this.inline(b, true));
        });
        out += `<td${span}>${inner.join('<br>')}</td>`;
      });
      out += '</tr>';
    });
    return `${out}</table>`;
  }

  private listKind(node: PMNode): 'bullet' | 'ordered' | null {
    const numPr = numPrOf(this.docx, node);
    return numPr ? this.docx.numbering.kind(numPr.numId) ?? null : null;
  }

  table(table: PMNode): string {
    const rows: string[][] = [];
    const aligns: string[] = [];
    table.forEach((row, _o, r) => {
      const cells: string[] = [];
      row.forEach((cell) => {
        if (cell.attrs.placeholder) return;
        cells.push(this.cell(cell));
        for (let k = 1; k < cell.attrs.colspan; k++) cells.push('');
        if (r === 0) {
          const align = cell.firstChild?.attrs.align;
          aligns.push(align === 'center' ? ':---:' : align === 'right' ? '---:' : '---');
          for (let k = 1; k < cell.attrs.colspan; k++) aligns.push('---');
        }
      });
      rows.push(cells);
    });
    const width = Math.max(...rows.map((r) => r.length), 1);
    const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`;
    const out = [line(rows[0] ?? []), `| ${Array.from({ length: width }, (_, i) => aligns[i] ?? '---').join(' | ')} |`];
    for (const r of rows.slice(1)) out.push(line(r));
    return out.join('\n');
  }

  blocks(doc: PMNode): string {
    const out: string[] = [];
    const counters: number[] = [];
    let prevList = false;
    doc.forEach((block, offset) => {
      if (block.type === schema.nodes.table) {
        out.push(this.table(block));
        prevList = false;
        return;
      }
      if (!block.isTextblock) return;
      const numPr = numPrOf(this.docx, block);
      const kind = numPr ? this.docx.numbering.kind(numPr.numId) : undefined;
      const text = this.inline(block, false, offset + 1).trim();
      if (kind) {
        const level = Math.min(Number(numPr!.ilvl ?? 0), 8);
        counters.length = level + 1;
        counters[level] = (counters[level] ?? 0) + 1;
        const marker = kind === 'ordered' ? `${counters[level]}.` : '-';
        const item = `${'   '.repeat(level)}${marker} ${text}`;
        if (prevList) out[out.length - 1] += `\n${item}`;
        else out.push(item);
        prevList = true;
        return;
      }
      counters.length = 0;
      prevList = false;
      const level = headingLevel(this.docx, block);
      if (level && text) out.push(`${'#'.repeat(level)} ${text}`);
      else out.push(escapeLineStart(text));
    });
    return out.join('\n\n').replace(/\n{3,}/g, '\n\n');
  }

  footnotes(): string {
    return this.notes.map((n) => `[^${n.label}]: ${n.text}`).join('\n');
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The document (current body) as Markdown. */
export function exportMarkdown(docx: DocxDocument, body: PMNode, opts: MarkdownOptions = {}): string {
  const w = new Writer(docx, { deletions: 'strike', ...opts });
  const text = w.blocks(body).trim();
  const notes = w.footnotes();
  return `${text}${notes ? `\n\n${notes}` : ''}\n`;
}
