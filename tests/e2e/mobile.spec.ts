import { expect, test } from '@playwright/test';
import { body, docText, downloadOf, editorValue, openApp, openSample, wordPoint } from './helpers';

test.describe('phone', () => {
  test('reflows the text to the screen and edits by tapping and typing', async ({ page }) => {
    await openSample(page);
    expect(await editorValue(page, (e) => e.viewMode)).toBe('web');
    // Nothing is wider than the screen.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByTestId('menubar')).toHaveCount(0);
    const p = await wordPoint(page, 'Version:');
    await page.touchscreen.tap(p.x, p.y);
    await page.keyboard.type('Draft ');
    await expect.poll(() => docText(page)).toContain('Draft ');
  });

  test('exports DOCX and PDF from the phone menu', async ({ page }) => {
    await openApp(page, 'formatting');
    const sheet = page.getByTestId('phone-menu');
    await page.getByTestId('phone-menu-btn').tap();
    await sheet.getByTestId('phone-menu-file').tap();
    const docx = await downloadOf(page, () => sheet.getByTestId('menu-save').tap());
    expect(docx.name).toBe('formatting.docx');
    expect(docx.bytes.subarray(0, 2).toString()).toBe('PK');
    await page.getByTestId('phone-menu-btn').tap();
    await sheet.getByTestId('phone-menu-file').tap();
    await sheet.getByTestId('menu-export').tap();
    const pdf = await downloadOf(page, () => sheet.getByTestId('menu-export-pdf').tap());
    expect(pdf.name).toBe('formatting.pdf');
    expect(pdf.bytes.subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('a tap goes through the message at the bottom of the screen', async ({ page }) => {
    await openApp(page, 'formatting');
    const sheet = page.getByTestId('phone-menu');
    await page.getByTestId('phone-menu-btn').tap();
    await sheet.getByTestId('phone-menu-file').tap();
    await downloadOf(page, () => sheet.getByTestId('menu-save').tap());
    await page.getByTestId('phone-menu-btn').tap();
    await sheet.getByTestId('phone-menu-file').tap();
    await sheet.getByTestId('menu-export').tap();
    // The message about the save still covers part of the Markdown item.
    const toast = page.getByTestId('toast');
    await expect(toast).toContainText('formatting.docx');
    const t = (await toast.boundingBox())!;
    const item = (await sheet.getByTestId('menu-export-md').boundingBox())!;
    const top = Math.max(t.y, item.y);
    const bottom = Math.min(t.y + t.height, item.y + item.height);
    expect(bottom).toBeGreaterThan(top);
    const md = await downloadOf(page, () => page.touchscreen.tap(t.x + t.width / 2, (top + bottom) / 2));
    expect(md.name).toBe('formatting.md');
  });

  test('formats from the scrolling toolbar and the More sheet', async ({ page }) => {
    await openApp(page);
    await body(page).tap();
    await page.keyboard.type('Phone notes');
    await page.keyboard.press('Shift+Home');
    await page.getByTestId('tb-bold').tap();
    await expect(page.getByTestId('tb-bold')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tb-more').tap();
    const sheet = page.getByTestId('tb-more-panel');
    await expect(sheet).toBeVisible();
    // The sheet fits the screen.
    const box = (await sheet.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await sheet.getByTestId('tb-size-up').tap();
    await sheet.getByTestId('tb-size-up').tap();
    await expect.poll(() => editorValue(page, (e) => (e.view.state.selection.$from.parent as unknown as { firstChild: { marks: { type: { name: string }; attrs: { size: number } }[] } }).firstChild.marks.find((m) => m.type.name === 'fontSize')?.attrs.size)).toBeGreaterThan(22);
  });

  test('comments: write one from the selection in the review sheet', async ({ page }) => {
    await openSample(page);
    const p = await wordPoint(page, 'Sample');
    await page.touchscreen.tap(p.x, p.y);
    // The browser places the caret; the editor reads it on the selectionchange event that follows.
    await expect.poll(() => editorValue(page, (e) => e.view.state.selection.from)).toBeGreaterThan(3);
    await page.evaluate(() => {
      type Sel = { create(doc: unknown, from: number, to: number): unknown };
      const ed = (window as unknown as { docxEditor: { getEditor(): { view: { state: { selection: { from: number; constructor: Sel }; doc: unknown; tr: { setSelection(s: unknown): unknown } }; dispatch(t: unknown): void } } } }).docxEditor.getEditor();
      const { from } = ed.view.state.selection;
      ed.view.dispatch(ed.view.state.tr.setSelection((ed.view.state.selection.constructor as Sel).create(ed.view.state.doc, from - 3, from + 3)));
    });
    await page.getByTestId('tb-comment').tap();
    const panel = page.getByTestId('side-panel');
    await expect(panel).toBeVisible();
    await panel.getByTestId('comment-input').fill('Check the status.');
    await panel.getByTestId('comment-submit').tap();
    await expect(panel.getByTestId('review-card').filter({ hasText: 'Check the status.' })).toBeVisible();
  });

  test('menu sheet: opens an example and shows its pages scaled to the screen', async ({ page }) => {
    await openApp(page);
    const sheet = page.getByTestId('phone-menu');
    await page.getByTestId('phone-menu-btn').tap();
    await sheet.getByTestId('phone-menu-file').tap();
    await sheet.getByTestId('menu-examples').tap();
    await sheet.getByTestId('example-template').tap();
    await expect.poll(() => docText(page)).toContain('Consulting Agreement');
    await expect(sheet).toHaveCount(0);
    await page.getByTestId('phone-menu-btn').tap();
    await sheet.getByTestId('view-pages').tap();
    await expect.poll(() => editorValue(page, (e) => e.viewMode)).toBe('print');
    // Pages are scaled to fit the phone.
    await expect.poll(() => editorValue(page, (e) => e.zoom)).toBeLessThan(0.6);
    await page.getByTestId('phone-menu-btn').tap();
    await sheet.getByTestId('view-reflow').tap();
    await expect.poll(() => editorValue(page, (e) => e.viewMode)).toBe('web');
  });

  test('find from the navigation sheet', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('phone-menu-btn').tap();
    await page.getByTestId('phone-navigation').tap();
    await page.getByTestId('nav-tab-find').tap();
    await page.getByTestId('find-input').fill('table');
    await expect(page.getByTestId('find-count')).toHaveText(/\d+ results/);
    const nav = (await page.getByTestId('nav-pane').boundingBox())!;
    expect(nav.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.getByTestId('find-results').getByRole('button').first().tap();
    await expect(page.getByTestId('nav-pane')).toHaveCount(0);
  });

  test('menu sheet: editing mode, review and page view', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('phone-menu-btn').tap();
    const sheet = page.getByTestId('phone-menu');
    await expect(sheet).toBeVisible();
    await sheet.getByTestId('mode-suggesting').tap();
    await expect.poll(() => editorValue(page, (e) => e.editMode)).toBe('suggesting');
    await page.getByTestId('phone-menu-btn').tap();
    await sheet.getByTestId('phone-menu-review').tap();
    await sheet.getByRole('menuitem', { name: 'Accept all changes shown' }).tap();
    await expect.poll(() => editorValue(page, (e) => e.trackedChanges().length)).toBe(0);
    await page.getByTestId('phone-menu-btn').tap();
    await sheet.getByTestId('view-pages').tap();
    await expect.poll(() => editorValue(page, (e) => e.viewMode)).toBe('print');
    await expect(page.getByTestId('zoombar')).toBeVisible();
  });

  test('exports a Word document from the Export menu', async ({ page }) => {
    await openApp(page, 'agreement');
    await page.getByTestId('export-menu').tap();
    const docx = await downloadOf(page, () => page.getByTestId('export-word').tap());
    expect(docx.name).toBe('agreement.docx');
    expect(docx.bytes.subarray(0, 2).toString()).toBe('PK');
  });
});
