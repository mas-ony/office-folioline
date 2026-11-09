/**
 * The page programming interface, a ref-style handle and an Office.js-shaped batch API:
 *
 *   const buffer = await docxEditor.save();            // ArrayBuffer of the .docx
 *   await docxEditor.load(bytes, 'Contract.docx');
 *   docxEditor.exec('bold');  docxEditor.exec('insertText', { text: 'Hello' });
 *   docxEditor.setMode('suggesting');
 *   await DocxEditorAPI.createBrowser().run(async (context) => { ... await context.sync(); });
 */
import { insertSectionBreak, insertTable, setFontFamily, setFontSize, setHighlight, setParagraphStyle, setTextColor, applyLink, insertPlainText } from '../editor/commands';
import type { DocxEditor, EditorEventMap, MarkupMode } from '../editor/DocxEditor';
import type { KeyAction } from '../editor/keymap';
import { DEFAULT_TEXT_WATERMARK } from '../editor/watermark';
import type { FileActions, UIControls } from '../ui/types';
import { ApiError, createBrowser, createServer, type Runtime } from './officeApi';

export type EditorMode = 'edit' | 'suggesting' | 'view';

export interface ExecResult {
  ok: boolean;
  reason?: string;
}

export interface DocxEditorRef {
  /** Serialize the document to a .docx buffer. */
  save(): Promise<ArrayBuffer | null>;
  /** Open .docx bytes, a Blob, or 'blank'. */
  load(document: ArrayBuffer | Uint8Array | Blob | 'blank', fileName?: string): Promise<void>;
  getDocumentHandle(): { fileName: string; revision: number; dirty: boolean } | null;
  /** The editor facade (DocxEditor). */
  getEditor(): DocxEditor;
  exec(command: string, options?: Record<string, unknown>): ExecResult;
  snapshot(): Record<string, unknown>;
  focus(): void;
  readonly mode: EditorMode;
  setMode(mode: EditorMode): void;
  setMarkup(mode: MarkupMode): void;
  setColorMode(mode: 'light' | 'dark'): void;
  setAuthor(name: string): void;
  setZoom(zoom: number | 'auto' | 'fit-width'): void;
  exportPdf(): Promise<Uint8Array>;
  exportMarkdown(): string;
  /** Download the document as .docx (the Export menu's Word document). */
  download(): void;
  print(): void;
  on<K extends keyof EditorEventMap>(event: K, fn: (e: EditorEventMap[K]) => void): () => void;
}

const MODE_TO_EDIT = { edit: 'editing', suggesting: 'suggesting', view: 'viewing' } as const;
const EDIT_TO_MODE = { editing: 'edit', suggesting: 'suggesting', viewing: 'view' } as const;

const KEY_ACTIONS: Record<string, KeyAction> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strike',
  strikethrough: 'strike',
  superscript: 'superscript',
  subscript: 'subscript',
  clearFormatting: 'clearFormatting',
  alignLeft: 'alignLeft',
  alignCenter: 'alignCenter',
  alignRight: 'alignRight',
  justify: 'alignJustify',
  alignJustify: 'alignJustify',
  bulletList: 'bulletList',
  numberedList: 'numberedList',
  indent: 'indent',
  outdent: 'outdent',
  pageBreak: 'pageBreak',
};

export function makeRef(editor: DocxEditor, controls: UIControls | null, files: FileActions | null): DocxEditorRef {
  let revision = 0;
  editor.on('change', () => {
    revision++;
  });
  const view = () => editor.activeView;
  const exec = (command: string, o: Record<string, unknown> = {}): ExecResult => {
    const refuse = (reason: string): ExecResult => ({ ok: false, reason });
    if (editor.readOnly && !['undo', 'redo', 'setMarkup', 'find'].includes(command)) return refuse('viewing');
    if (KEY_ACTIONS[command]) return { ok: editor.runAction(KEY_ACTIONS[command]) };
    switch (command) {
      case 'undo': return { ok: editor.undo() };
      case 'redo': return { ok: editor.redo() };
      case 'insertText': return typeof o.text === 'string' ? { ok: insertPlainText(view(), o.text) } : refuse('invalidValue');
      case 'insertTable': return { ok: insertTable(view(), editor.docx, Number(o.rows ?? 2), Number(o.cols ?? o.columns ?? 2)) };
      case 'setStyle': return typeof o.styleId === 'string' ? { ok: setParagraphStyle(view(), editor.docx, o.styleId) } : refuse('invalidValue');
      case 'setFontSize': return Number(o.size) > 0 ? { ok: setFontSize(view(), Number(o.size)) } : refuse('invalidValue');
      case 'setFontFamily': return typeof o.name === 'string' ? { ok: setFontFamily(view(), o.name) } : refuse('invalidValue');
      case 'setColor': return { ok: setTextColor(view(), (o.color as string | null) ?? null) };
      case 'setHighlight': return { ok: setHighlight(view(), (o.color as string | null) ?? null) };
      case 'insertLink': return typeof o.href === 'string' ? { ok: applyLink(view(), editor.docx, o.href, o.text as string | undefined) } : refuse('invalidValue');
      case 'addComment': return typeof o.text === 'string' && !view().state.selection.empty ? { ok: !!editor.addComment(o.text) } : refuse('commentSelection');
      case 'acceptAll': editor.decideChanges('all', true); return { ok: true };
      case 'rejectAll': editor.decideChanges('all', false); return { ok: true };
      case 'setMarkup': editor.setMarkupMode(o.mode as MarkupMode); return { ok: true };
      case 'insertTableOfContents': return { ok: editor.insertTableOfContents({ title: String(o.title ?? 'Table of Contents'), empty: 'No table of contents entries found.' }) };
      case 'refreshTableOfContents': return { ok: editor.refreshTableOfContents({ title: 'Table of Contents', empty: 'No table of contents entries found.' }) };
      case 'setWatermark': return { ok: editor.setWatermark(o.text === null ? null : { ...DEFAULT_TEXT_WATERMARK, text: String(o.text ?? 'DRAFT') }) };
      case 'insertBookmark': return typeof o.name === 'string' ? { ok: editor.createBookmark(o.name) } : refuse('invalidValue');
      case 'insertFootnote': return { ok: !!editor.insertNote('footnote', String(o.text ?? '')) };
      case 'insertEndnote': return { ok: !!editor.insertNote('endnote', String(o.text ?? '')) };
      case 'sectionBreak': return { ok: insertSectionBreak(editor.view, o.type === 'continuous' ? 'continuous' : 'nextPage') };
      case 'protectForms': editor.setFormsProtection(o.on !== false); return { ok: true };
      default: return refuse('unknownCommand');
    }
  };
  return {
    async save() {
      const bytes = editor.exportDocx();
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    },
    async load(document, fileName) {
      if (document === 'blank') {
        editor.newDocument();
        return;
      }
      const bytes = document instanceof Blob ? new Uint8Array(await document.arrayBuffer()) : document instanceof Uint8Array ? document : new Uint8Array(document);
      editor.load(bytes, fileName ?? (document instanceof File ? document.name : 'Document.docx'));
    },
    getDocumentHandle: () => (editor.docx ? { fileName: editor.fileName, revision, dirty: editor.dirty } : null),
    getEditor: () => editor,
    exec,
    snapshot() {
      const sel = editor.view.state.selection;
      return {
        fileName: editor.fileName,
        dirty: editor.dirty,
        revision,
        mode: EDIT_TO_MODE[editor.editMode],
        markup: editor.markupMode,
        zoom: editor.zoom,
        viewMode: editor.viewMode,
        pageCount: editor.pageCount,
        pageIndex: editor.currentPage,
        selection: { from: sel.from, to: sel.to, text: editor.view.state.doc.textBetween(sel.from, sel.to, '\n') },
        cursor: editor.cursorProps(),
        comments: editor.comments().length,
        trackedChanges: editor.trackedChanges().length,
        watermark: editor.watermark(),
        display: editor.display,
      };
    },
    focus: () => editor.focus(),
    get mode() {
      return EDIT_TO_MODE[editor.editMode];
    },
    setMode: (m) => editor.setEditMode(MODE_TO_EDIT[m] ?? 'editing'),
    setMarkup: (m) => editor.setMarkupMode(m),
    setColorMode: (m) => controls?.setScheme(m),
    setAuthor: (name) => {
      editor.setAuthor(name);
      // The interface shows it in Settings and passes it on to a live session.
      controls?.setUser({ name });
    },
    setZoom: (z) => (z === 'auto' ? editor.fitAuto() : z === 'fit-width' ? editor.fitWidth() : editor.setZoom(z)),
    async exportPdf() {
      const { exportPdf } = await import('../pdf/exportPdf');
      return exportPdf(editor);
    },
    exportMarkdown: () => editor.exportMarkdown(),
    download: () => files?.downloadDocx(),
    print: () => (files ? files.print() : window.print()),
    on: (event, fn) => editor.on(event, fn),
  };
}

export interface DocxEditorApi {
  /** Drive the editor open in the page (default) or another DocxEditor. */
  createBrowser(editor?: DocxEditor): Runtime;
  /** Open .docx bytes in a detached editor without interface. */
  createServer(bytes: ArrayBuffer | Uint8Array, opts?: { author?: string }): Promise<Runtime>;
  ApiError: typeof ApiError;
}

declare global {
  interface Window {
    docxEditor?: DocxEditorRef;
    DocxEditorAPI?: DocxEditorApi;
    /** Present after the app mounted (for tests and scripts). */
    docxEditorReady?: boolean;
  }
}

/**
 * Make an editor the page's `window.docxEditor`, with `window.DocxEditorAPI` driving it by default
 * and `window.docxEditorReady` set. Returns the function that removes them again.
 */
export function installPageApi(ref: DocxEditorRef): () => void {
  const api: DocxEditorApi = {
    createBrowser: (ed = ref.getEditor()) => createBrowser(ed),
    createServer: (bytes, opts) => createServer(bytes, opts),
    ApiError,
  };
  window.docxEditor = ref;
  window.DocxEditorAPI = api;
  window.docxEditorReady = true;
  return () => {
    if (window.docxEditor !== ref) return;
    delete window.docxEditor;
    delete window.DocxEditorAPI;
    delete window.docxEditorReady;
  };
}
