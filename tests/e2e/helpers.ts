import { expect, type Page } from '@playwright/test';

/** The parts of the editor facade (window.docxEditor.getEditor()) the tests read. */
type Ed = {
  fileName: string;
  view: { state: { doc: { textContent: string }; selection: { from: number; to: number; $from: { parent: { attrs: Record<string, unknown>; textContent: string } } } } };
  pageCount: number;
  zoom: number;
  viewMode: string;
  editMode: string;
  markupMode: string;
  author: string;
  trackedChanges(): { author: string; type: string; text: string }[];
  comments(): { id: string; author: string; text: string; done: boolean; replies: { text: string }[] }[];
  watermark(): { kind: string; text?: string } | null;
  pageSetup(): { orient: string; margins: { top: number; bottom: number; left: number; right: number } };
  display: { marks: boolean; bookmarks: boolean; protected: boolean };
  fields(): { name: string; value: string }[];
  headerFooterOptions(pageIndex?: number): { headerDistance: number; footerDistance: number; differentFirstPage: boolean; differentOddEven: boolean };
  headerFooterLinked(kind: 'header' | 'footer', pageIndex?: number): boolean | null;
};

type Win = { docxEditor: { getEditor(): Ed } };

/** Open the app with an example document (or a blank one) and wait until it is shown. */
export async function openApp(page: Page, example?: string) {
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('e2e-ready')) {
        indexedDB.deleteDatabase('folioline');
        localStorage.clear();
        localStorage.setItem('folioline-user', JSON.stringify({ name: 'Test Reviewer' }));
        sessionStorage.setItem('e2e-ready', '1');
      }
    } catch {
      // Storage may be unavailable.
    }
  });
  page.on('dialog', (d) => void d.accept());
  await page.goto(example ? `/?example=${example}` : example === undefined ? '/?new=1' : '/');
  await expect(body(page)).toBeVisible();
  await page.waitForFunction(() => !!(window as unknown as { docxEditorReady?: boolean }).docxEditorReady);
  if (example) await expect.poll(() => fileName(page)).not.toBe('Untitled.docx');
  await page.waitForTimeout(300);
}

/** Open the app as a first visit: the sample document. */
export async function openSample(page: Page) {
  await openApp(page, '');
  await expect.poll(() => fileName(page)).toBe('Sample Document.docx');
}

/** The body editor (header and footer views also use the dx-doc class). */
export function body(page: Page) {
  return page.locator('.dx-body-host > .dx-doc');
}

export function fileName(page: Page): Promise<string> {
  return page.evaluate(() => (window as unknown as Win).docxEditor.getEditor().fileName);
}

/** Text of the document body. */
export function docText(page: Page): Promise<string> {
  return page.evaluate(() => (window as unknown as Win).docxEditor.getEditor().view.state.doc.textContent);
}

/** Read a value from the editor facade. */
export function editorValue<T>(page: Page, fn: (e: Ed) => T): Promise<T> {
  return page.evaluate((src) => {
    const f = new Function('e', `return (${src})(e)`) as (e: Ed) => T;
    return f((window as unknown as Win).docxEditor.getEditor());
  }, fn.toString());
}

/** Centre of the first occurrence of `word` in the body, in page coordinates. */
export async function wordPoint(page: Page, word: string): Promise<{ x: number; y: number }> {
  const find = ([w, scroll]: [string, boolean]) => {
    const root = document.querySelector('.dx-body-host > .dx-doc')!;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = (n.textContent ?? '').indexOf(w);
      if (i < 0) continue;
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + w.length);
      const b = r.getBoundingClientRect();
      if (scroll) {
        // Scroll the document so the word itself is in the middle of the view.
        const scroller = document.querySelector('.dx-scroll')!;
        const s = scroller.getBoundingClientRect();
        scroller.scrollTop += b.top - (s.top + s.height / 2);
      }
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }
    return null;
  };
  const p = await page.evaluate(find, [word, true] as [string, boolean]);
  if (!p) throw new Error(`word not found: ${word}`);
  await page.waitForTimeout(150);
  return (await page.evaluate(find, [word, false] as [string, boolean]))!;
}

/** Double-click the header of page `index` (from 0) to edit it, and wait for its bar. */
export async function editHeader(page: Page, index: number) {
  const header = page.locator('.dx-page').nth(index).locator('.dx-header');
  await header.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = (await header.boundingBox())!;
  // An empty header has no height; just above it is still the top margin.
  await page.mouse.dblclick(box.x + 20, box.height ? box.y + box.height / 2 : box.y - 4);
  await expect(page.locator('.dx-hf-active > [data-testid="hf-chrome"]')).toBeVisible();
}

/** Select a word by double-clicking it. */
export async function selectWord(page: Page, word: string) {
  const p = await wordPoint(page, word);
  await page.mouse.dblclick(p.x, p.y);
}

/** Select the first occurrence of `text` in the body through the editor. */
export async function selectText(page: Page, text: string) {
  await wordPoint(page, text.split(' ')[0]);
  const ok = await page.evaluate((t) => {
    type Sel = { create(doc: unknown, from: number, to?: number): unknown };
    const ed = (window as unknown as { docxEditor: { getEditor(): { view: { state: { doc: { descendants(fn: (n: { isText: boolean; text?: string }, pos: number) => boolean): void }; selection: { constructor: Sel }; tr: { setSelection(s: unknown): unknown } }; dispatch(tr: unknown): void; focus(): void } } } }).docxEditor.getEditor();
    let at = -1;
    ed.view.state.doc.descendants((n, pos) => {
      if (at >= 0) return false;
      if (!n.isText) return true;
      const i = n.text!.indexOf(t);
      if (i >= 0) at = pos + i;
      return false;
    });
    if (at < 0) return false;
    const sel = (ed.view.state.selection.constructor as Sel).create(ed.view.state.doc, at, at + t.length);
    ed.view.dispatch(ed.view.state.tr.setSelection(sel));
    ed.view.focus();
    return true;
  }, text);
  if (!ok) throw new Error(`text not found: ${text}`);
}

/** Put the caret right after the first occurrence of `text` in the body and focus it. */
export async function caretAfter(page: Page, text: string) {
  await wordPoint(page, text.split(' ')[0]);
  const ok = await page.evaluate((t) => {
    type Sel = { create(doc: unknown, pos: number): unknown };
    const ed = (window as unknown as { docxEditor: { getEditor(): { view: { state: { doc: { descendants(fn: (n: { isText: boolean; text?: string }, pos: number) => boolean): void }; selection: { constructor: Sel }; tr: { setSelection(s: unknown): unknown } }; dispatch(tr: unknown): void; focus(): void } } } }).docxEditor.getEditor();
    let at = -1;
    ed.view.state.doc.descendants((n, pos) => {
      if (at >= 0) return false;
      if (!n.isText) return true;
      const i = n.text!.indexOf(t);
      if (i >= 0) at = pos + i + t.length;
      return false;
    });
    if (at < 0) return false;
    const sel = (ed.view.state.selection.constructor as Sel).create(ed.view.state.doc, at);
    ed.view.dispatch(ed.view.state.tr.setSelection(sel));
    ed.view.focus();
    return true;
  }, text);
  if (!ok) throw new Error(`text not found: ${text}`);
}

/** Run an action that downloads a file; returns the file name and bytes. */
export async function downloadOf(page: Page, action: () => Promise<unknown>): Promise<{ name: string; bytes: Buffer }> {
  const [download] = await Promise.all([page.waitForEvent('download'), action()]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  return { name: download.suggestedFilename(), bytes: Buffer.concat(chunks) };
}

/** Open a menu bar menu and choose an item (with an optional submenu item). */
export async function menu(page: Page, bar: string, item: string, sub?: string) {
  await page.getByTestId(`menubar-${bar}`).click();
  const list = page.getByTestId(`menu-${bar}`);
  await expect(list).toBeVisible();
  const entry = list.getByRole('menuitem', { name: item }).or(list.getByRole('menuitemcheckbox', { name: item })).or(list.getByRole('menuitemradio', { name: item })).first();
  if (sub) {
    await entry.hover();
    const side = page.locator('.fl-submenu');
    await expect(side).toBeVisible();
    await side.getByRole('menuitem', { name: sub }).or(side.getByRole('menuitemradio', { name: sub })).or(side.getByRole('menuitemcheckbox', { name: sub })).first().click();
  } else await entry.click();
}
