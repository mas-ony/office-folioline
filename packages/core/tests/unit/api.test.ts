import { strFromU8, unzipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createBrowser, createServer } from '../../src/api/officeApi';
import { installPageApi, makeRef } from '../../src/api/page';
import { importDocx } from '../../src/core/import/importer';
import { DocxEditor } from '../../src/editor/DocxEditor';
import type { FileActions, UIControls } from '../../src/ui/types';
import { openEditor, selectText } from './editorHelpers';
import { example } from './helpers';

let editor: DocxEditor;

const controls: UIControls = {
  setPanelOpen: vi.fn(),
  setPanelTab: vi.fn(),
  setScheme: vi.fn(),
  setUser: vi.fn(),
  setRailOpen: vi.fn(),
  setNavOpen: vi.fn(),
  openModal: vi.fn(),
  toast: vi.fn(),
  joinRoom: vi.fn(),
};

const files = { newDocument: vi.fn(), open: vi.fn(), openExample: vi.fn(), downloadDocx: vi.fn(), exportPdf: vi.fn(), exportMarkdown: vi.fn(), print: vi.fn() } as unknown as FileActions;

const ref = () => window.docxEditor!;
const documentXml = (bytes: Uint8Array) => strFromU8(unzipSync(bytes)['word/document.xml']);

beforeEach(() => {
  editor = openEditor(example('agreement.docx'), 'agreement.docx', 'API User');
  installPageApi(makeRef(editor, controls, files));
});

afterEach(() => {
  editor.destroy();
});

describe('page API (window.docxEditor)', () => {
  it('saves the document as a .docx buffer and loads documents', async () => {
    const buffer = await ref().save();
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(documentXml(new Uint8Array(buffer!))).toContain('Software Services Agreement');
    await ref().load(example('template.docx'), 'Template.docx');
    expect(ref().getDocumentHandle()).toMatchObject({ fileName: 'Template.docx', dirty: false });
    await ref().load('blank');
    expect(editor.view.state.doc.textContent).toBe('');
  });

  it('runs commands and refuses unknown or invalid ones', () => {
    selectText(editor, 'Purpose');
    expect(ref().exec('bold')).toEqual({ ok: true });
    expect(ref().exec('setStyle', { styleId: 'Heading2' }).ok).toBe(true);
    expect(ref().exec('insertText', { text: 'Aim' }).ok).toBe(true);
    expect(editor.view.state.doc.textContent).toContain('1. Aim');
    expect(ref().exec('insertText', {})).toEqual({ ok: false, reason: 'invalidValue' });
    expect(ref().exec('fly')).toEqual({ ok: false, reason: 'unknownCommand' });
    ref().setMode('view');
    expect(ref().mode).toBe('view');
    expect(ref().exec('bold')).toEqual({ ok: false, reason: 'viewing' });
  });

  it('reports a snapshot and events, and changes mode, markup and author', () => {
    const changes: unknown[] = [];
    const off = ref().on('change', (e) => changes.push(e));
    ref().setMode('suggesting');
    expect(editor.editMode).toBe('suggesting');
    ref().setMarkup('original');
    expect(editor.markupMode).toBe('original');
    ref().setAuthor('Robin');
    expect(controls.setUser).toHaveBeenCalledWith({ name: 'Robin' });
    selectText(editor, 'Purpose');
    ref().exec('insertText', { text: 'Goal' });
    expect(editor.trackedChanges().find((c) => c.text === 'Goal')?.author).toBe('Robin');
    off();
    expect(changes.length).toBeGreaterThan(0);
    const snap = ref().snapshot();
    expect(snap).toMatchObject({ fileName: 'agreement.docx', mode: 'suggesting', markup: 'original', dirty: true });
    expect(snap.trackedChanges).toBeGreaterThan(3);
    expect(ref().exportMarkdown()).toContain('# Software Services Agreement');
  });
});

describe('Office-style batch API', () => {
  it('searches, replaces and formats in one batch', async () => {
    await createBrowser(editor).run(async (context) => {
      const hits = context.document.body.search('twelve months', { matchCase: true });
      hits.load('items');
      await context.sync();
      expect(hits.items).toHaveLength(1);
      expect(hits.items[0].text).toBe('twelve months');
      const inserted = hits.items[0].insertText('eighteen months', 'Replace');
      inserted.font.bold = true;
      await context.sync();
      expect(inserted.text).toBe('eighteen months');
      expect(inserted.font.bold).toBe(true);
    });
    expect(editor.view.state.doc.textContent).toContain('runs for eighteen months');
  });

  it('records edits as tracked changes when change tracking is on', async () => {
    await createBrowser(editor).run(async (context) => {
      context.document.changeTrackingMode = 'TrackAll';
      const first = context.document.body.search('sixty days').getFirst();
      first.insertText('ninety days', 'Replace');
      await context.sync();
    });
    const mine = editor.trackedChanges().filter((c) => c.author === 'API User');
    expect(mine.map((c) => [c.type, c.text])).toEqual([['insertion', 'ninety days'], ['deletion', 'sixty days']]);
  });

  it('inserts paragraphs and comments, and reads paragraph styles', async () => {
    let commentId: string | null = null;
    await createBrowser(editor).run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load('items');
      await context.sync();
      expect(paragraphs.items[0].text).toBe('Software Services Agreement');
      expect(paragraphs.items[0].style).toBe('Title');
      const added = paragraphs.items[0].insertParagraph('Draft for review', 'After');
      added.alignment = 'Centered';
      const c = context.document.body.search('Discovery workshops').getFirst().insertComment('Who attends?');
      await context.sync();
      commentId = c.id;
    });
    expect(editor.view.state.doc.child(1).textContent).toBe('Draft for review');
    expect(editor.view.state.doc.child(1).attrs.align).toBe('center');
    expect(editor.comments().find((t) => t.id === commentId)?.quote).toBe('Discovery workshops');
  });

  it('applies a batch all or nothing', async () => {
    const before = editor.view.state.doc;
    await expect(createBrowser(editor).run(async (context) => {
      context.document.body.insertText('Appendix', 'End');
      context.document.body.search('no such words anywhere').getFirst().insertText('x', 'Replace');
      await context.sync();
    })).rejects.toMatchObject({ code: 'ItemNotFound' });
    expect(editor.view.state.doc.eq(before)).toBe(true);
  });

  it('asks for sync before results are read', async () => {
    await createBrowser(editor).run(async (context) => {
      const hits = context.document.body.search('Client');
      expect(() => hits.items).toThrow(ApiError);
      await context.sync();
      expect(hits.items.length).toBeGreaterThan(1);
    });
  });

  it('refuses edits outside fields of a document protected for forms', async () => {
    editor.setFormsProtection(true);
    await expect(createBrowser(editor).run(async (context) => {
      context.document.body.insertText('Not allowed', 'Start');
      await context.sync();
    })).rejects.toMatchObject({ code: 'NotAllowed' });
  });

  it('edits documents without an editor on the page', async () => {
    const runtime = await createServer(example('template.docx'), { author: 'Server' }, DocxEditor);
    await runtime.run(async (context) => {
      context.document.body.insertParagraph('Prepared automatically.', 'End');
      await context.sync();
    });
    const again = importDocx(runtime.save());
    runtime.dispose();
    expect(again.body.textContent).toContain('Prepared automatically.');
  });
});
