/**
 * A batching object model shaped after the Office.js Word API, over the editor: queue reads and
 * edits on proxies, then `await context.sync()` applies the batch in order, all or nothing.
 *
 *   const runtime = DocxEditorAPI.createBrowser(docxEditor.getEditor());
 *   await runtime.run(async (context) => {
 *     const hits = context.document.body.search('within 7 days', { matchCase: true });
 *     hits.load('items');
 *     await context.sync();
 *     hits.items[0].insertText('within 30 days', 'Replace');
 *     await context.sync();
 *   });
 */
import type { Mark, Node as PMNode } from 'prosemirror-model';
import { TextSelection, type Transaction } from 'prosemirror-state';
import type { Mapping } from 'prosemirror-transform';
import type { EditorView } from 'prosemirror-view';
import { schema } from '../core/model/schema';
import { findMatches } from '../editor/plugins/search';
import { setParagraphStyle } from '../editor/commands';
import type { DocxEditor } from '../editor/DocxEditor';

export type InsertLocation = 'Replace' | 'Start' | 'End' | 'Before' | 'After';
export type RangeLocation = 'Whole' | 'Start' | 'End' | 'Content';
export type ChangeTrackingMode = 'Off' | 'TrackAll' | 'TrackMineOnly';
export type Alignment = 'Left' | 'Centered' | 'Right' | 'Justified';

/** An error with an Office.js-style code. */
export class ApiError extends Error {
  constructor(readonly code: 'InvalidArgument' | 'ItemNotFound' | 'PropertyNotLoaded' | 'NotAllowed' | 'GeneralException' | 'InvalidObjectPath', message: string) {
    super(`${code}: ${message}`);
    this.name = 'ApiError';
  }
}

/** A document span kept current while the batch edits the document. */
interface Live {
  from: number;
  to: number;
}

class Batch {
  private ops: (() => void)[] = [];
  private live = new Set<Live>();

  constructor(readonly editor: DocxEditor) {}

  get view(): EditorView {
    return this.editor.view;
  }

  queue(op: () => void) {
    this.ops.push(op);
  }

  track(from: number, to: number): Live {
    const l = { from, to };
    this.live.add(l);
    return l;
  }

  /** Apply a transaction and move every tracked span through it. */
  dispatch(tr: Transaction) {
    this.editor.lastMapping = null;
    this.view.dispatch(tr);
    // Suggesting mode rewrites edits (deleted text stays, marked); map through what was applied.
    const mapping = this.editor.lastMapping as Mapping | null;
    if (!mapping) throw new ApiError('NotAllowed', 'The edit was refused (the document is read-only or protected).');
    for (const l of this.live) {
      l.from = mapping.map(l.from, -1);
      l.to = Math.max(l.from, mapping.map(l.to, 1));
    }
  }

  async sync() {
    const ops = this.ops;
    this.ops = [];
    const before = this.view.state;
    try {
      for (const op of ops) op();
    } catch (e) {
      // All or nothing: the document returns to its state before the batch.
      this.view.updateState(before);
      this.editor.relayout();
      throw e;
    }
  }
}

/** Text of [from, to) with paragraph breaks as \r (Word API text). */
function textOf(doc: PMNode, from: number, to: number): string {
  return doc.textBetween(from, to, '\r', (n) => (n.type === schema.nodes.tab ? '\t' : n.type === schema.nodes.hard_break ? '\v' : ''));
}

function marksAt(doc: PMNode, pos: number): readonly Mark[] {
  const $p = doc.resolve(pos);
  return ($p.nodeBefore ?? $p.nodeAfter)?.marks.filter((m) => m.type !== schema.marks.comment) ?? [];
}

/** Text as inline nodes and paragraphs: \n, \r and \r\n start a new paragraph, \v is a line break. */
function insertNodes(batch: Batch, at: number, text: string): { from: number; to: number } {
  const view = batch.view;
  const marks = marksAt(view.state.doc, at);
  const inline = (s: string): PMNode[] => {
    const out: PMNode[] = [];
    s.split('\v').forEach((part, i) => {
      if (i > 0) out.push(schema.nodes.hard_break.create(null, null, marks));
      part.split('\t').forEach((seg, j) => {
        if (j > 0) out.push(schema.nodes.tab.create(null, null, marks));
        if (seg) out.push(schema.text(seg, marks));
      });
    });
    return out;
  };
  const parts = text.split(/\r\n|\r|\n/);
  let tr = view.state.tr;
  let pos = at;
  parts.forEach((p, i) => {
    if (i > 0) {
      tr = tr.split(pos);
      pos += 2;
    }
    const nodes = inline(p);
    if (nodes.length) {
      tr = tr.insert(pos, nodes);
      pos += nodes.reduce((n, x) => n + x.nodeSize, 0);
    }
  });
  batch.dispatch(tr);
  return { from: at, to: pos };
}

// -----------------------------------------------------------------------------------------------

class FontProxy {
  constructor(private range: Range) {}

  private set(apply: (tr: Transaction, from: number, to: number) => void) {
    const r = this.range;
    r.batch.queue(() => {
      const l = r.resolve();
      if (l.from === l.to) return;
      const tr = r.batch.view.state.tr;
      apply(tr, l.from, l.to);
      r.batch.dispatch(tr);
    });
  }

  private toggle(name: string, on: boolean) {
    this.set((tr, f, t) => {
      tr.removeMark(f, t, schema.marks[name]);
      if (on) tr.addMark(f, t, schema.marks[name].create({ value: true }));
    });
  }

  private has(name: string): boolean {
    const l = this.range.resolve();
    return this.range.batch.view.state.doc.rangeHasMark(l.from, l.to, schema.marks[name]);
  }

  get bold() { return this.has('bold'); }
  set bold(v: boolean) { this.toggle('bold', v); }
  get italic() { return this.has('italic'); }
  set italic(v: boolean) { this.toggle('italic', v); }
  get strikeThrough() { return this.has('strike'); }
  set strikeThrough(v: boolean) { this.toggle('strike', v); }
  set underline(v: 'None' | 'Single' | 'Double' | boolean) {
    this.set((tr, f, t) => {
      tr.removeMark(f, t, schema.marks.underline);
      if (v && v !== 'None') tr.addMark(f, t, schema.marks.underline.create({ type: v === 'Double' ? 'double' : 'single' }));
    });
  }
  set color(v: string) {
    this.set((tr, f, t) => tr.addMark(f, t, schema.marks.color.create({ color: v.replace('#', '').toUpperCase() })));
  }
  set size(pt: number) {
    if (!(pt > 0)) throw new ApiError('InvalidArgument', 'size must be positive');
    this.set((tr, f, t) => tr.addMark(f, t, schema.marks.fontSize.create({ size: Math.round(pt * 2) })));
  }
  set name(font: string) {
    this.set((tr, f, t) => tr.addMark(f, t, schema.marks.font.create({ ascii: font, hAnsi: font, eastAsia: font, cs: font })));
  }
  set highlightColor(v: string | null) {
    this.set((tr, f, t) => {
      tr.removeMark(f, t, schema.marks.highlight);
      if (v) tr.addMark(f, t, schema.marks.highlight.create({ color: v.startsWith('#') ? 'yellow' : v }));
    });
  }
}

export class Range {
  private live: Live | null = null;
  readonly font: FontProxy;

  constructor(readonly batch: Batch, private resolver: () => Live) {
    this.font = new FontProxy(this);
  }

  /** The current span (resolved when the batch runs). */
  resolve(): Live {
    if (!this.live) this.live = this.resolver();
    return this.live;
  }

  private loaded(): Live {
    if (!this.live) throw new ApiError('PropertyNotLoaded', 'Call context.sync() before reading this range.');
    return this.live;
  }

  load(_props?: string | string[]): this {
    this.batch.queue(() => void this.resolve());
    return this;
  }

  get text(): string {
    const l = this.loaded();
    return textOf(this.batch.view.state.doc, l.from, l.to);
  }

  get isEmpty(): boolean {
    const l = this.loaded();
    return l.from === l.to;
  }

  /** Insert text relative to the range; returns the inserted text as a range. */
  insertText(text: string, location: InsertLocation): Range {
    if (typeof text !== 'string') throw new ApiError('InvalidArgument', 'text must be a string');
    let out: Live | null = null;
    this.batch.queue(() => {
      const l = this.resolve();
      const view = this.batch.view;
      if (location === 'Replace') {
        if (l.from !== l.to) this.batch.dispatch(view.state.tr.delete(l.from, l.to));
        const r = insertNodes(this.batch, l.from, text);
        l.from = r.from;
        l.to = r.to;
        out = this.batch.track(r.from, r.to);
      } else {
        const at = location === 'Start' || location === 'Before' ? l.from : l.to;
        const r = insertNodes(this.batch, at, text);
        if (location === 'Start') l.to = Math.max(l.to, r.to);
        if (location === 'End') l.to = r.to;
        out = this.batch.track(r.from, r.to);
      }
    });
    return new Range(this.batch, () => {
      if (!out) throw new ApiError('InvalidObjectPath', 'The inserted range has no address until context.sync().');
      return out;
    });
  }

  /** Part of the range: its start or end point, or the whole range. */
  getRange(location: RangeLocation = 'Whole'): Range {
    return new Range(this.batch, () => {
      const l = this.resolve();
      if (location === 'Start') return this.batch.track(l.from, l.from);
      if (location === 'End') return this.batch.track(l.to, l.to);
      return this.batch.track(l.from, l.to);
    });
  }

  /** The span from the start of this range to the end of another. */
  expandTo(other: Range): Range {
    return new Range(this.batch, () => {
      const a = this.resolve();
      const b = other.resolve();
      return this.batch.track(Math.min(a.from, b.from), Math.max(a.to, b.to));
    });
  }

  delete(): void {
    this.batch.queue(() => {
      const l = this.resolve();
      if (l.from < l.to) this.batch.dispatch(this.batch.view.state.tr.delete(l.from, l.to));
    });
  }

  /** Comment on the range; returns its id after sync. */
  insertComment(text: string): { id: string | null } {
    const result: { id: string | null } = { id: null };
    this.batch.queue(() => {
      const l = this.resolve();
      if (l.from === l.to) throw new ApiError('InvalidArgument', 'A comment needs a range of text.');
      result.id = this.batch.editor.addCommentAt({ from: l.from, to: l.to }, text);
    });
    return result;
  }

  /** Select the range in the editor and scroll to it. */
  select(): void {
    this.batch.queue(() => {
      const l = this.resolve();
      const view = this.batch.view;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, l.from, l.to)).scrollIntoView());
    });
  }

  /** Add or replace a hyperlink on the range. */
  set hyperlink(href: string) {
    this.batch.queue(() => {
      const l = this.resolve();
      const tr = this.batch.view.state.tr.removeMark(l.from, l.to, schema.marks.link);
      if (href) tr.addMark(l.from, l.to, schema.marks.link.create(href.startsWith('#') ? { href: '', anchor: href.slice(1) } : { href }));
      this.batch.dispatch(tr);
    });
  }
}

export class RangeCollection {
  private found: Range[] | null = null;

  constructor(readonly batch: Batch, private finder: () => Live[]) {
    batch.queue(() => this.run());
  }

  private run(): Range[] {
    if (!this.found) this.found = this.finder().map((l) => new Range(this.batch, () => l));
    for (const r of this.found) r.resolve();
    return this.found;
  }

  load(_props?: string | string[]): this {
    return this;
  }

  get items(): Range[] {
    if (!this.found) throw new ApiError('PropertyNotLoaded', 'Call context.sync() before reading items.');
    return this.found;
  }

  /** The first match; using it before a match exists fails with ItemNotFound. */
  getFirst(): Range {
    return new Range(this.batch, () => {
      const first = this.run()[0];
      if (!first) throw new ApiError('ItemNotFound', 'No item matches.');
      return first.resolve();
    });
  }

  getFirstOrNullObject(): Range | null {
    return this.found ? this.found[0] ?? null : this.getFirst();
  }
}

/** Positions of the textblocks in document order (body text, including table cells). */
function paragraphSpans(doc: PMNode): Live[] {
  const out: Live[] = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      out.push({ from: pos + 1, to: pos + node.nodeSize - 1 });
      return false;
    }
    return true;
  });
  return out;
}

export class Paragraph extends Range {
  /** The style id of the paragraph (Heading1, Normal...). */
  get style(): string {
    const l = this.resolve();
    return this.batch.view.state.doc.resolve(l.from).parent.attrs.styleId ?? 'Normal';
  }

  set style(id: string) {
    this.batch.queue(() => {
      const l = this.resolve();
      const view = this.batch.view;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, l.from)));
      setParagraphStyle(view, this.batch.editor.docx, id.replace(/\s+/g, ''));
    });
  }

  set alignment(a: Alignment) {
    const map: Record<Alignment, string> = { Left: 'left', Centered: 'center', Right: 'right', Justified: 'both' };
    if (!map[a]) throw new ApiError('InvalidArgument', `alignment must be one of ${Object.keys(map).join(', ')}`);
    this.batch.queue(() => {
      const l = this.resolve();
      const $p = this.batch.view.state.doc.resolve(l.from);
      const at = $p.before($p.depth);
      this.batch.dispatch(this.batch.view.state.tr.setNodeMarkup(at, undefined, { ...$p.parent.attrs, align: map[a] }));
    });
  }

  /** Insert a new paragraph before or after this one; returns it. */
  insertParagraph(text: string, location: 'Before' | 'After'): Paragraph {
    let out: Live | null = null;
    this.batch.queue(() => {
      const l = this.resolve();
      const view = this.batch.view;
      const $p = view.state.doc.resolve(l.from);
      const para = $p.parent;
      const at = location === 'Before' ? $p.before($p.depth) : $p.after($p.depth);
      const node = schema.nodes.paragraph.create({ ...para.attrs, trackIns: null, trackDel: null }, text ? schema.text(text) : null);
      this.batch.dispatch(view.state.tr.insert(at, node));
      out = this.batch.track(at + 1, at + 1 + text.length);
    });
    return new Paragraph(this.batch, () => {
      if (!out) throw new ApiError('InvalidObjectPath', 'The new paragraph has no address until context.sync().');
      return out;
    });
  }
}

export class ParagraphCollection {
  private found: Paragraph[] | null = null;

  constructor(readonly batch: Batch) {
    batch.queue(() => {
      this.found = paragraphSpans(batch.view.state.doc).map((s) => {
        const l = batch.track(s.from, s.to);
        const p = new Paragraph(batch, () => l);
        p.resolve();
        return p;
      });
    });
  }

  load(_props?: string | string[]): this {
    return this;
  }

  get items(): Paragraph[] {
    if (!this.found) throw new ApiError('PropertyNotLoaded', 'Call context.sync() before reading items.');
    return this.found;
  }

  getFirst(): Paragraph {
    return new Paragraph(this.batch, () => {
      const p = this.found?.[0];
      if (!p) throw new ApiError('ItemNotFound', 'The document has no paragraphs.');
      return p.resolve();
    });
  }

  getLast(): Paragraph {
    return new Paragraph(this.batch, () => {
      const p = this.found?.[this.found.length - 1];
      if (!p) throw new ApiError('ItemNotFound', 'The document has no paragraphs.');
      return p.resolve();
    });
  }
}

export class Body {
  constructor(readonly batch: Batch) {}

  private whole(): Live {
    const doc = this.batch.view.state.doc;
    return this.batch.track(0, doc.content.size);
  }

  /** Text of the document with paragraphs separated by \r (read after sync). */
  get text(): string {
    const doc = this.batch.view.state.doc;
    return textOf(doc, 0, doc.content.size).replace(/^\r+/, '');
  }

  load(_props?: string | string[]): this {
    return this;
  }

  get paragraphs(): ParagraphCollection {
    return new ParagraphCollection(this.batch);
  }

  search(text: string, options: { matchCase?: boolean; matchWholeWord?: boolean; matchWildcards?: boolean } = {}): RangeCollection {
    if (!text) throw new ApiError('InvalidArgument', 'search text is empty');
    return new RangeCollection(this.batch, () => findMatches(this.batch.view.state.doc, {
      query: text,
      caseSensitive: !!options.matchCase,
      wholeWord: !!options.matchWholeWord,
      regex: false,
    }).map((m) => this.batch.track(m.from, m.to)));
  }

  getRange(location: RangeLocation = 'Whole'): Range {
    return new Range(this.batch, () => {
      const spans = paragraphSpans(this.batch.view.state.doc);
      const first = spans[0] ?? { from: 0, to: 0 };
      const last = spans[spans.length - 1] ?? first;
      if (location === 'Start') return this.batch.track(first.from, first.from);
      if (location === 'End') return this.batch.track(last.to, last.to);
      return this.batch.track(first.from, last.to);
    });
  }

  insertText(text: string, location: 'Start' | 'End' | 'Replace'): Range {
    if (location === 'Replace') {
      const r = this.getRange('Whole');
      return r.insertText(text, 'Replace');
    }
    return this.getRange(location).insertText(text, location === 'Start' ? 'Before' : 'After');
  }

  insertParagraph(text: string, location: 'Start' | 'End'): Paragraph {
    const anchor = location === 'Start' ? new ParagraphCollection(this.batch).getFirst() : new ParagraphCollection(this.batch).getLast();
    return anchor.insertParagraph(text, location === 'Start' ? 'Before' : 'After');
  }

  clear(): void {
    this.batch.queue(() => {
      void this.whole();
      const doc = this.batch.view.state.doc;
      this.batch.dispatch(this.batch.view.state.tr.replaceWith(0, doc.content.size, schema.nodes.paragraph.create()));
    });
  }
}

export class WordDocument {
  readonly body: Body;

  constructor(private batch: Batch) {
    this.body = new Body(batch);
  }

  get paragraphs(): ParagraphCollection {
    return this.body.paragraphs;
  }

  get changeTrackingMode(): ChangeTrackingMode {
    return this.batch.editor.editMode === 'suggesting' ? 'TrackAll' : 'Off';
  }

  set changeTrackingMode(mode: ChangeTrackingMode) {
    this.batch.queue(() => this.batch.editor.setEditMode(mode === 'Off' ? 'editing' : 'suggesting'));
  }

  getSelection(): Range {
    return new Range(this.batch, () => {
      const s = this.batch.view.state.selection;
      return this.batch.track(s.from, s.to);
    });
  }
}

export class RequestContext {
  readonly document: WordDocument;
  private batch: Batch;

  constructor(editor: DocxEditor) {
    this.batch = new Batch(editor);
    this.document = new WordDocument(this.batch);
  }

  /** Apply the queued operations in order; on any error none of them stays applied. */
  sync(): Promise<void> {
    return this.batch.sync();
  }
}

export interface Runtime {
  run<T>(fn: (context: RequestContext) => Promise<T>): Promise<T>;
  /** The edited document as .docx bytes. */
  save(): Uint8Array;
  dispose(): void;
}

/** Drive an editor that is open in the page. */
export function createBrowser(editor: DocxEditor): Runtime {
  return {
    async run(fn) {
      const ctx = new RequestContext(editor);
      const out = await fn(ctx);
      await ctx.sync();
      return out;
    },
    save: () => editor.exportDocx(),
    dispose: () => undefined,
  };
}

/** Open .docx bytes in a detached editor (no interface) and drive it. */
export async function createServer(bytes: ArrayBuffer | Uint8Array, opts: { author?: string } = {}, Editor?: new (el: HTMLElement, o: { author?: string; viewMode?: 'print' | 'web' }) => DocxEditor): Promise<Runtime> {
  const Ctor = Editor ?? (await import('../editor/DocxEditor')).DocxEditor;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:600px;overflow:hidden;visibility:hidden';
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  const editor = new Ctor(host, { author: opts.author ?? 'Automation', viewMode: 'web' });
  editor.load(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), 'Document.docx');
  const browser = createBrowser(editor);
  return {
    run: browser.run,
    save: () => editor.exportDocx(),
    dispose: () => {
      editor.destroy();
      host.remove();
    },
  };
}
