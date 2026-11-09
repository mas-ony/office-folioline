/**
 * Scenarios for the mount() of the React and Vue packages (run by their own tests): the same
 * library behaviour from both interfaces.
 */
import { afterEach, expect, it, vi } from 'vitest';
import { version } from '../../package.json';
import type { DocxEditorRef } from '../../src/api/page';
import type { FoliolineOptions } from '../../src/ui/types';
import { example } from './helpers';

interface Mounted {
  ready: Promise<DocxEditorRef>;
  update(options: FoliolineOptions): void;
  destroy(): void;
}

const wait = { timeout: 3000 };
/** Opening a document in jsdom takes a moment; the first test also loads the modules. */
const slow = 20_000;

/** The element once it exists. */
function find<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): Promise<T> {
  return vi.waitFor(() => {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`${selector} not found`);
    return el;
  }, wait);
}

/** Type into a text box the way the browser does (React and Vue both see the input event). */
function type(input: HTMLInputElement, text: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** How often a word occurs in the document's paragraphs, ignoring case as the search does by default. */
function occurrences(ref: DocxEditorRef, word: string): number {
  let n = 0;
  ref.getEditor().view.state.doc.descendants((node) => {
    if (!node.isTextblock) return true;
    n += node.textContent.toLowerCase().split(word.toLowerCase()).length - 1;
    return false;
  });
  return n;
}

export function mountScenarios(mount: (element: HTMLElement, options?: FoliolineOptions) => Mounted) {
  const open: Mounted[] = [];
  const place = () => document.body.appendChild(document.createElement('div'));
  const start = (el: HTMLElement, options: FoliolineOptions) => {
    const m = mount(el, options);
    open.push(m);
    return m;
  };

  afterEach(() => {
    for (const m of open.splice(0)) m.destroy();
    document.body.innerHTML = '';
  });

  it('opens the document, keeps its classes off <html> and removes everything again', async () => {
    const el = place();
    const m = start(el, { document: { data: example('agreement.docx'), name: 'Service agreement.docx' }, colorScheme: 'dark' });
    const ref = await m.ready;
    expect(ref.getEditor().fileName).toBe('Service agreement.docx');
    expect(el.contains(ref.getEditor().root)).toBe(true);
    const app = el.querySelector('[data-testid="app"]')!;
    const layers = document.querySelectorAll('.fl-layer');
    expect(app.classList.contains('is-dark')).toBe(true);
    expect(layers).toHaveLength(1);
    expect(layers[0].classList.contains('is-dark')).toBe(true);
    expect(document.documentElement.className).toBe('');
    expect((await find<HTMLInputElement>('[data-testid="doc-name"]', el)).value).toBe('Service agreement');

    m.update({ colorScheme: 'light' });
    await vi.waitFor(() => expect(app.classList.contains('is-dark')).toBe(false), wait);
    expect(layers[0].classList.contains('is-dark')).toBe(false);

    m.destroy();
    open.length = 0;
    await vi.waitFor(() => expect(document.querySelector('.fl-layer')).toBeNull(), wait);
    expect(el.childElementCount).toBe(0);
  }, slow);

  it('shows dialogs in its layer and reports a new name from Settings', async () => {
    const el = place();
    const onUserChange = vi.fn();
    const m = start(el, { document: example('agreement.docx'), user: { name: 'Robin' }, onUserChange });
    await m.ready;
    (await find('[data-testid="panel-toggle"]', el)).click();
    (await find('[data-testid="panel-tab-settings"]', el)).click();
    const name = await find<HTMLInputElement>('[data-testid="user-name"]', el);
    expect(name.value).toBe('Robin');
    type(name, 'Robin Example');
    await vi.waitFor(() => expect(name.value).toBe('Robin Example'), wait);
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() => expect(onUserChange).toHaveBeenCalledWith({ name: 'Robin Example' }), wait);

    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'About Folioline')!.click();
    const dialog = await find('[data-testid="about-dialog"]');
    expect(dialog.textContent).toContain(version);
    expect(dialog.closest('.fl-layer')).not.toBeNull();
    expect(el.contains(dialog)).toBe(false);
  }, slow);

  it('keeps two editors on one page apart', async () => {
    const a = place();
    const b = place();
    const [ra, rb] = await Promise.all([
      start(a, { document: example('agreement.docx') }).ready,
      start(b, { document: example('template.docx') }).ready,
    ]);
    const [ea, eb] = [ra.getEditor(), rb.getEditor()];
    expect(ea).not.toBe(eb);
    expect(a.contains(ea.root)).toBe(true);
    expect(b.contains(eb.root)).toBe(true);
    expect(document.querySelectorAll('.fl-layer')).toHaveLength(2);
    expect(ea.view.state.doc.textContent).toContain('Software Services Agreement');
    expect(eb.view.state.doc.textContent).toContain('Consulting Agreement');
    ra.setMode('view');
    expect(ra.mode).toBe('view');
    expect(rb.mode).toBe('edit');
  }, slow);

  it('replaces the matches of the query just typed, before its search has run', async () => {
    const el = place();
    const ref = await start(el, { document: example('template.docx') }).ready;
    const editor = ref.getEditor();
    const [previous, typed, replacement] = ['Agreement', 'Consultant', 'Adviser'];
    const counts = { previous: occurrences(ref, previous), typed: occurrences(ref, typed) };
    expect(counts.previous).toBeGreaterThan(0);
    expect(counts.typed).toBeGreaterThan(0);
    expect(occurrences(ref, replacement)).toBe(0);

    (await find('[data-testid="nav-open"]', el)).click();
    (await find('[data-testid="nav-tab-find"]')).click();
    const input = await find<HTMLInputElement>('[data-testid="find-input"]');
    type(input, previous);
    await vi.waitFor(() => expect(editor.searchResults()?.query).toBe(previous), wait);
    (await find('[data-testid="find-replace-toggle"]')).click();
    const replaceWith = await find<HTMLInputElement>('[data-testid="replace-input"]');
    const replaceAll = await find<HTMLButtonElement>('[data-testid="replace-all"]');
    await vi.waitFor(() => expect(replaceAll.disabled).toBe(false), wait);

    // A new query and its replacement, then Replace all at once. The search runs 120 ms after the
    // typing; a 0 ms timer lets the interface take the typing first and always fires before it.
    type(input, typed);
    type(replaceWith, replacement);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(editor.searchResults()?.query).toBe(previous);
    replaceAll.click();

    expect(occurrences(ref, previous)).toBe(counts.previous);
    expect(occurrences(ref, typed)).toBe(0);
    expect(occurrences(ref, replacement)).toBe(counts.typed);
  }, slow);
}
