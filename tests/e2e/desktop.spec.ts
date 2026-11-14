import { expect, test } from '@playwright/test';
import { body, caretAfter, docText, downloadOf, editHeader, editorValue, fileName, loadFixture, menu, openApp, openDrawings, openFixture, openSample, pdfStreams, picturePlace, printedPages, selectText, selectWord, wordPoint } from './helpers';

test.describe('desktop', () => {
  test('types and formats text from the toolbar', async ({ page }) => {
    await openApp(page);
    await body(page).click();
    await page.keyboard.type('Quarterly planning notes');
    await expect.poll(() => docText(page)).toBe('Quarterly planning notes');
    await selectWord(page, 'planning');
    await page.getByTestId('tb-bold').click();
    await expect(page.getByTestId('tb-bold')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tb-size').fill('18');
    await page.getByTestId('tb-size').press('Enter');
    await expect(page.getByTestId('tb-size')).toHaveValue('18');
    await selectWord(page, 'notes');
    await page.getByTestId('tb-color-caret').click();
    await page.getByTestId('color-picker').getByRole('button', { name: 'Dark Red', exact: true }).click();
    const color = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.querySelector('.dx-body-host > .dx-doc')!, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent === 'notes') return getComputedStyle(n.parentElement!).color;
      return '';
    });
    expect(color).toBe('rgb(192, 0, 0)');
    await page.getByTestId('tb-style').click();
    await page.getByTestId('style-Heading1').click();
    expect(await editorValue(page, (e) => e.view.state.selection.$from.parent.attrs.styleId)).toBe('Heading1');
    await page.getByTestId('tb-undo').click();
    await expect(page.getByTestId('tb-redo')).toBeEnabled();
  });

  test('ruler drag changes the left margin', async ({ page }) => {
    await openApp(page, 'formatting');
    await page.getByTestId('panel-tab-settings').click();
    await page.getByTestId('show-rulers').check();
    await caretAfter(page, 'Regular, ');
    const before = await editorValue(page, (e) => e.pageSetup().margins.left);
    const handle = page.getByTestId('ruler').getByRole('slider', { name: 'Left margin' });
    const box = (await handle.boundingBox())!;
    // Drag the grey margin area 48 px to the right (half an inch at 100%).
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 48, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => editorValue(page, (e) => e.pageSetup().margins.left)).toBeGreaterThan(before + 400);
  });

  test('two people edit the same document in real time', async ({ browser, page }) => {
    await openApp(page, 'agreement');
    await page.getByTestId('panel-tab-settings').click();
    await page.getByTestId('start-session').click();
    const link = await page.getByTestId('invite-link').inputValue();
    expect(link).toMatch(/\?room=[0-9a-f]{8}$/);
    const other = await browser.newPage();
    await other.goto(`/${new URL(link).search}`);
    await expect.poll(() => fileName(other)).toBe('agreement.docx');
    await expect(page.getByTestId('people').locator('.fl-avatar')).toHaveCount(2);
    await caretAfter(page, '1. Purpose');
    await page.keyboard.type(' (shared)');
    await expect.poll(() => docText(other)).toContain('1. Purpose (shared)');
    await caretAfter(other, '2. Scope of work');
    await other.keyboard.type(' (both)');
    await expect.poll(() => docText(page)).toContain('2. Scope of work (both)');
    await other.close();
  });

  test('header Options insert page X of Y and set the distance and a different first page', async ({ page }) => {
    await openApp(page, 'agreement');
    const n = await editorValue(page, (e) => e.pageCount);
    expect(n).toBeGreaterThan(1);
    const pages = page.locator('.dx-page');
    const bar = page.locator('.dx-hf-active > [data-testid="hf-chrome"]');
    const options = bar.getByRole('button', { name: 'Options' });
    const menu = page.getByTestId('hf-options');
    const close = async () => {
      await options.click();
      await menu.getByTestId('hf-close').click();
    };
    await editHeader(page, 0);
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await options.click();
    await expect(options).toHaveAttribute('aria-expanded', 'true');
    // Its button closes it again.
    await options.click();
    await expect(menu).toHaveCount(0);
    await expect(options).toHaveAttribute('aria-expanded', 'false');
    await options.click();
    await menu.getByTestId('hf-page-x-of-y').click();
    await expect(menu).toHaveCount(0);
    await close();
    // The shared header numbers each page.
    for (const i of [0, 1]) await expect(pages.nth(i).locator('.dx-header')).toContainText(`Folioline example Page ${i + 1} of ${n}`);

    // Escape drops a distance typed in the menu; Enter applies it.
    const distance = () => editorValue(page, (e) => e.headerFooterOptions(0).headerDistance);
    const before = await distance();
    await editHeader(page, 0);
    await options.click();
    await menu.getByTestId('hf-header-distance').fill('0.9');
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(bar).toBeVisible();
    expect(await distance()).toBe(before);
    // The cursor is back in the header.
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.dx-hf-active'))).toBe(true);
    await options.click();
    await menu.getByTestId('hf-header-distance').fill('0.3');
    await page.keyboard.press('Enter');
    await expect.poll(distance).toBe(432);

    // A different first page leaves page 1 without the header the other pages share.
    await editHeader(page, 1);
    await options.click();
    await expect(menu.getByTestId('hf-different-first')).toHaveAttribute('aria-checked', 'false');
    await menu.getByTestId('hf-different-first').click();
    await expect.poll(() => editorValue(page, (e) => e.headerFooterOptions(0).differentFirstPage)).toBe(true);
    await expect(pages.nth(0).locator('.dx-header')).not.toContainText('Folioline example');
    await expect(pages.nth(1).locator('.dx-header')).toContainText(`Page 2 of ${n}`);
    await editHeader(page, 1);
    await options.click();
    await expect(menu.getByTestId('hf-different-first')).toHaveAttribute('aria-checked', 'true');
  });

  test('header Options link a section to the previous one and unlink it', async ({ page }) => {
    await openApp(page, 'tables');
    const pages = page.locator('.dx-page');
    const bar = page.locator('.dx-hf-active > [data-testid="hf-chrome"]');
    const options = bar.getByRole('button', { name: 'Options' });
    const menu = page.getByTestId('hf-options');
    const close = async () => {
      await options.click();
      await menu.getByTestId('hf-close').click();
    };
    const link = menu.getByTestId('hf-link');
    const linked = () => editorValue(page, (e) => e.headerFooterLinked('header', 2));
    // The last section (from page 3) has its own header; the first one has none yet.
    expect(await editorValue(page, (e) => e.headerFooterLinked('header', 0))).toBeNull();
    expect(await linked()).toBe(false);
    await editHeader(page, 0);
    await page.keyboard.type('Lease file');
    await close();

    await editHeader(page, 2);
    await options.click();
    await expect(link).toHaveText('Link to previous');
    await link.click();
    await expect.poll(linked).toBe(true);
    await expect(pages.nth(2).locator('.dx-header')).toHaveText('Lease file');

    // Unlinking gives the section a copy, which then changes on its own.
    await editHeader(page, 2);
    await options.click();
    await expect(link).toContainText('Unlink from previous');
    await expect(link).toContainText('Same as previous');
    await link.click();
    await expect.poll(linked).toBe(false);
    await editHeader(page, 2);
    await page.keyboard.press('End');
    await page.keyboard.type(' (copy)');
    await close();
    await expect(pages.nth(2).locator('.dx-header')).toHaveText('Lease file (copy)');
    await expect(pages.nth(0).locator('.dx-header')).toHaveText('Lease file');
  });

  test('a square-wrapped picture takes a click over the paragraph that wraps around it', async ({ page }) => {
    await openSample(page);
    const picture = page.locator('img.dx-image[alt^="Bar chart"]').first();
    const selected = page.locator('.dx-image-wrap.ProseMirror-selectednode img[alt^="Bar chart"]');
    await picture.scrollIntoViewIfNeeded();
    await picture.click();
    await expect(selected).toHaveCount(1);
    const props = page.getByTestId('tb-image-props');
    if (!(await props.isVisible())) await page.getByTestId('tb-more').click();
    await props.click();
    await page.getByTestId('ip-wrap').selectOption('square');
    await page.getByTestId('image-props-apply').click();
    await expect(page.getByTestId('image-props-dialog')).toHaveCount(0);

    // The caret goes into the text, then a click on the middle of the picture, which the next
    // heading's box reaches under, selects the picture again.
    const word = await wordPoint(page, 'returns');
    await page.mouse.click(word.x, word.y);
    await expect(selected).toHaveCount(0);
    await picture.click();
    await expect(selected).toHaveCount(1);
  });

  test('draws shapes and groups of pictures, text boxes and lines', async ({ page }) => {
    await openDrawings(page);
    const drawings = body(page).locator('.dx-drawing');
    await expect(drawings).toHaveCount(7);
    await expect(body(page).locator('.dx-opaque')).toHaveCount(0);
    // The group's picture and text box, drawn at twice the size of the group's child space.
    const group = drawings.first();
    const heading = group.getByText('Drawn heading');
    await expect(heading).toBeVisible();
    const g = (await group.boundingBox())!;
    const pic = (await group.locator('.dx-drawing-pic').boundingBox())!;
    const text = (await heading.boundingBox())!;
    expect(pic.width / g.width).toBeCloseTo(0.125, 2);
    expect(pic.height / g.height).toBeCloseTo(1, 2);
    expect((text.x + text.width / 2 - g.x) / g.width).toBeCloseTo(0.575, 2);
    // The rectangle's outline: the theme's first accent, darkened by the shape's style.
    await expect(drawings.nth(1).locator('path')).toHaveCSS('stroke', 'rgb(47, 82, 143)');
    await group.locator('.dx-drawing-pic').click();
    await expect(group).toHaveClass(/ProseMirror-selectednode/);
    const pdf = await page.evaluate(async () => Array.from(await (window as unknown as { docxEditor: { exportPdf(): Promise<Uint8Array> } }).docxEditor.exportPdf()));
    expect(pdfStreams(Buffer.from(pdf))).toContain('0.184 0.322 0.561 RG');
  });

  test('prints every page, with no blank page after the last', async ({ page }) => {
    // One page: printing it must not add an empty second one.
    await openFixture(page, 'columns.docx');
    await expect.poll(() => editorValue(page, (e) => e.pageCount)).toBe(1);
    expect(await printedPages(page)).toBe(1);
    await loadFixture(page, 'kitchen-sink.docx');
    await expect.poll(() => editorValue(page, (e) => e.pageCount)).toBe(3);
    expect(await printedPages(page)).toBe(3);
  });

  test('a picture wrapped top and bottom keeps its horizontal position', async ({ page }) => {
    await openSample(page);
    const picture = page.locator('img.dx-image[alt^="Bar chart"]').first();
    const wrapAs = async (kind: string, offset?: string) => {
      await picture.click();
      const button = page.getByTestId('tb-image-props');
      if (!(await button.isVisible())) await page.getByTestId('tb-more').click();
      await button.click();
      await page.getByTestId('ip-wrap').selectOption(kind);
      if (offset !== undefined) await page.locator('#ip-ho').fill(offset);
      await page.getByTestId('image-props-apply').click();
    };
    const place = () => picturePlace(page, picture);
    await picture.scrollIntoViewIfNeeded();
    // At the column's left edge, where the saved file puts it; then half an inch (48 px) from it.
    await wrapAs('topAndBottom');
    await expect.poll(async () => (await place()).left).toBeCloseTo(0, 0);
    await wrapAs('topAndBottom', '0.5');
    await expect.poll(async () => (await place()).left).toBeCloseTo(48, 0);
    // Aligned right: it keeps Square right's alignment, also when the dialog is applied again with
    // its position left alone.
    await wrapAs('squareRight');
    await wrapAs('topAndBottom');
    await expect.poll(async () => (await place()).right).toBeCloseTo(0, 0);
    await wrapAs('topAndBottom');
    await expect.poll(async () => (await place()).right).toBeCloseTo(0, 0);
  });

  test('adds a comment from the selection, replies and resolves it', async ({ page }) => {
    await openSample(page);
    await selectText(page, 'equipment and training');
    await page.getByTestId('comment-bubble').click();
    await page.getByTestId('comment-input').fill('Does this include the laptops?');
    await page.getByTestId('comment-submit').click();
    await expect(page.getByTestId('changes-count')).toHaveText('7');
    const card = page.getByTestId('review-card').filter({ hasText: 'Does this include the laptops?' });
    await expect(card).toBeVisible();
    await card.click();
    await card.getByTestId('reply-input').fill('Yes, and the monitors.');
    await card.getByTestId('reply-send').click();
    await expect(card).toContainText('Yes, and the monitors.');
    await card.getByTestId('comment-resolve').click();
    await expect(page.getByTestId('changes-count')).toHaveText('6');
    const resolved = await editorValue(page, (e) => e.comments().find((c) => c.text === 'Does this include the laptops?'));
    expect(resolved).toMatchObject({ author: 'Test Reviewer', done: true, replies: [{ text: 'Yes, and the monitors.' }] });
  });

  test('suggests edits and accepts or rejects them', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('mode-menu').click();
    await page.getByTestId('mode-suggesting').click();
    await expect(page.getByTestId('mode-menu')).toContainText('Suggesting');
    await caretAfter(page, 'cannot move');
    await page.keyboard.type(' this year');
    await expect.poll(() => editorValue(page, (e) => e.trackedChanges().filter((c) => c.author === 'Test Reviewer').map((c) => c.text).join('|'))).toBe(' this year');
    const mine = page.getByTestId('change-card').filter({ hasText: 'this year' });
    await expect(mine).toBeVisible();
    await mine.getByTestId('change-reject').click();
    await expect(mine).toHaveCount(0);
    await expect.poll(() => docText(page)).not.toContain('this year');
    // Accept everything shown from the Review menu.
    await menu(page, 'review', 'Accept all changes shown');
    await expect(page.getByTestId('change-card')).toHaveCount(0);
    await expect.poll(() => docText(page)).toContain('within five working days');
    await expect.poll(() => docText(page)).not.toContain('every Monday');
  });

  test('display for review hides markup or shows the original', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('tb-markup').click();
    await page.getByTestId('tb-markup-original').click();
    await expect(page.locator('.dx-root')).toHaveClass(/dx-original/);
    await menu(page, 'review', 'Display for Review', 'No Markup');
    await expect(page.locator('.dx-root')).toHaveClass(/dx-markup-none/);
    expect(await editorValue(page, (e) => e.markupMode)).toBe('none');
    // Hiding a reviewer leaves their cards out of the panel.
    await menu(page, 'review', 'Display for Review', 'All Markup');
    await page.getByTestId('chip-Mei Tanaka').click();
    await expect(page.getByTestId('change-card').filter({ hasText: 'within five working days' })).toHaveCount(0);
    await expect(page.getByTestId('changes-count')).toHaveText('4');
  });

  test('navigation pane: headings, find and replace, bookmarks', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('nav-open').click();
    await page.getByTestId('nav-headings').getByRole('button', { name: '4.2 Merged cells' }).click();
    await expect.poll(() => editorValue(page, (e) => e.view.state.selection.$from.parent.textContent)).toBe('4.2 Merged cells');
    await page.getByTestId('nav-tab-find').click();
    await page.getByTestId('find-input').fill('page');
    await expect(page.getByTestId('find-count')).toHaveText(/\d+ results/);
    await page.getByTestId('find-replace-toggle').click();
    await page.getByTestId('find-input').fill('Columns');
    await page.getByTestId('replace-input').fill('Newspaper columns');
    await expect(page.getByTestId('find-count')).toHaveText(/results?/);
    await page.getByTestId('replace-all').click();
    await expect.poll(() => docText(page)).toContain('Newspaper columns are part of a section');
    await page.getByTestId('nav-tab-bookmarks').click();
    await page.getByTestId('nav-bookmarks').getByRole('button', { name: /summary/ }).click();
    await expect.poll(() => editorValue(page, (e) => e.view.state.selection.$from.parent.textContent)).toBe('Summary');
    await page.getByTestId('nav-close').click();
    await expect(page.getByTestId('nav-pane')).toHaveCount(0);
  });

  test('fills template fields in the text while the rest is protected for forms', async ({ page }) => {
    await openApp(page, 'template');
    await menu(page, 'review', 'Protect Document for Forms');
    await expect.poll(() => editorValue(page, (e) => e.display.protected)).toBe(true);
    // Outside the fields the document takes no typing.
    await caretAfter(page, 'This Consulting Agreement');
    await page.keyboard.type('X');
    await expect(page.getByTestId('toast')).toContainText('This part of the document is protected.');
    expect(await docText(page)).not.toContain('AgreementX');
    // A field does: the client's name in the first paragraph.
    await selectWord(page, 'Northwind');
    await page.keyboard.type('Contoso');
    await expect.poll(() => docText(page)).toContain('between Contoso Traders (the “Client”)');
    expect(await editorValue(page, (e) => e.fields().find((f) => f.name === 'client_name')?.value)).toBe('Contoso Traders');
  });

  test('context menu works on tables', async ({ page }) => {
    await openSample(page);
    const p = await wordPoint(page, 'North');
    await page.mouse.click(p.x, p.y);
    await page.mouse.click(p.x, p.y, { button: 'right' });
    const ctx = page.getByRole('menu').filter({ hasText: 'Insert row below' });
    await expect(ctx).toBeVisible();
    await ctx.getByRole('menuitem', { name: 'Insert row below' }).click();
    await expect(body(page).locator('table').first().locator('tr')).toHaveCount(5);
  });

  test('edits a header and adds page numbers from its Options menu', async ({ page }) => {
    await openSample(page);
    await page.evaluate(() => {
      const ed = (window as unknown as { docxEditor: { getEditor(): { result: { pages: { top: number }[] }; zoom: number; scrollEl: HTMLElement } } }).docxEditor.getEditor();
      ed.scrollEl.scrollTop = ed.result.pages[2].top * ed.zoom;
    });
    const header = page.locator('.dx-page').nth(2).locator('.dx-header');
    const box = (await header.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.dblclick(box.x + 20, box.y + box.height / 2);
    await expect(page.getByTestId('hf-chrome')).toContainText('Header');
    await page.keyboard.press('End');
    await page.getByTestId('hf-chrome').getByRole('button', { name: /Options/ }).click();
    await page.getByTestId('hf-page-x-of-y').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.dx-page').nth(4).locator('.dx-header')).toContainText('Page 5 of 10');
  });

  test('exports a Word document, a PDF and Markdown', async ({ page }) => {
    await openApp(page, 'agreement');
    await page.getByTestId('export-menu').click();
    const docx = await downloadOf(page, () => page.getByTestId('export-word').click());
    expect(docx.name).toBe('agreement.docx');
    expect(docx.bytes.subarray(0, 2).toString()).toBe('PK');
    await page.getByTestId('export-menu').click();
    const pdf = await downloadOf(page, () => page.getByTestId('export-pdf').click());
    expect(pdf.name).toBe('agreement.pdf');
    const text = pdf.bytes.toString('latin1');
    expect(text.startsWith('%PDF-1.7')).toBe(true);
    expect(text.match(/\/Type \/Page /g)).toHaveLength(2);
    expect(text).toContain('Producer (Folioline)');
    await page.getByTestId('export-menu').click();
    const md = await downloadOf(page, () => page.getByTestId('export-md').click());
    expect(md.name).toBe('agreement.md');
    expect(md.bytes.toString('utf8')).toContain('# Software Services Agreement');
    expect(md.bytes.toString('utf8')).toContain('| Milestone | Fee | Due | Notes |');
  });

  test('page API: commands and a batch of edits', async ({ page }) => {
    await openApp(page, 'agreement');
    const result = await page.evaluate(async () => {
      type Api = { createBrowser(): { run(fn: (c: { document: { body: { search(t: string): { getFirst(): { insertText(t: string, l: string): { font: { bold: boolean } } } } } } ; sync(): Promise<void> }) => Promise<unknown>): Promise<unknown> } };
      const w = window as unknown as { docxEditor: { exec(c: string, o?: unknown): { ok: boolean }; snapshot(): { mode: string } ; setMode(m: string): void }; DocxEditorAPI: Api };
      w.docxEditor.setMode('suggesting');
      await w.DocxEditorAPI.createBrowser().run(async (context) => {
        const r = context.document.body.search('sixty days').getFirst().insertText('thirty days', 'Replace');
        r.font.bold = true;
        await context.sync();
      });
      return { snap: w.docxEditor.snapshot(), unknown: w.docxEditor.exec('fly') };
    });
    expect(result).toMatchObject({ snap: { mode: 'suggesting' }, unknown: { ok: false } });
    await expect(page.getByTestId('change-card').filter({ hasText: 'thirty days' })).toBeVisible();
  });

  test('settings: name, dark appearance and interface language', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('panel-tab-settings').click();
    await page.getByTestId('user-name').fill('Alex Morgan');
    await page.getByTestId('user-name').press('Enter');
    await expect.poll(() => editorValue(page, (e) => e.author)).toBe('Alex Morgan');
    const app = page.getByTestId('app');
    await page.getByTestId('scheme-dark').click();
    await expect(app).toHaveClass(/is-dark/);
    await page.getByTestId('locale').selectOption('de');
    await expect(app).toHaveAttribute('lang', 'de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByTestId('export-menu')).toContainText('Exportieren');
    await page.getByTestId('locale').selectOption('he');
    await expect(app).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.reload();
    await expect(app).toHaveAttribute('lang', 'he');
    await expect(app).toHaveClass(/is-dark/);
  });

  test('zoom menu, fit width and the narrow-window toolbar', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('zoom-level').click();
    await page.getByTestId('zoom-50').click();
    await expect.poll(() => editorValue(page, (e) => e.zoom)).toBe(0.5);
    await page.getByTestId('zoom-in').click();
    await expect.poll(() => editorValue(page, (e) => e.zoom)).toBeGreaterThan(0.5);
    await page.setViewportSize({ width: 900, height: 800 });
    await expect(page.getByTestId('tb-more')).toBeVisible();
    await page.getByTestId('tb-more').click();
    const more = page.getByTestId('tb-more-panel');
    await expect(more.getByTestId('tb-bullets')).toBeVisible();
    await page.keyboard.press('Escape');
    await caretAfter(page, 'Bread');
    await page.getByTestId('tb-more').click();
    await more.getByTestId('tb-numbers').click();
    expect(await editorValue(page, (e) => e.view.state.selection.$from.parent.attrs.numPr)).toBeTruthy();
  });

  test('opens the example documents from the File menu', async ({ page }) => {
    await openApp(page);
    await menu(page, 'file', 'Examples', 'Annual report (300 pages)');
    await expect.poll(() => fileName(page)).toBe('long-report.docx');
    await expect.poll(() => editorValue(page, (e) => e.pageCount), { timeout: 20_000 }).toBeGreaterThan(250);
  });

  test('opens the sample document with its review panel', async ({ page }) => {
    await openSample(page);
    await expect(page.getByTestId('doc-name')).toHaveValue('Sample Document');
    await expect(page.getByTestId('changes-count')).toHaveText('6');
    await expect(page.getByTestId('review-card')).toHaveCount(2);
    await expect(page.getByTestId('change-card')).toHaveCount(4);
    await expect.poll(() => editorValue(page, (e) => e.pageCount)).toBe(10);
    // The contents page lists the headings with their pages.
    await expect(body(page)).toContainText('4. Tables');
    // Page fields in the text show the page they are on.
    await expect(page.locator('.dx-body-host .dx-page-field').first()).toHaveText('9');
  });

  test('menus format paragraphs and insert a table from the grid', async ({ page }) => {
    await openApp(page);
    await body(page).click();
    await page.keyboard.type('Centred title');
    await menu(page, 'format', 'Center');
    expect(await editorValue(page, (e) => e.view.state.selection.$from.parent.attrs.align)).toBe('center');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await menu(page, 'insert', 'Table');
    await page.getByTestId('table-grid').getByRole('gridcell', { name: '3 × 2' }).click();
    await expect(body(page).locator('table')).toHaveCount(1);
    await expect(body(page).locator('table tr')).toHaveCount(2);
    await expect(body(page).locator('table tr').first().locator('td')).toHaveCount(3);
    // The table tools join the toolbar (in More when the bar is full) while the caret is in the table.
    await page.getByTestId('tb-more').click();
    const more = page.getByTestId('tb-more-panel');
    await expect(more.getByRole('group', { name: 'Table' })).toBeVisible();
    await more.getByTestId('tb-table-more').click();
    await page.getByRole('menuitem', { name: 'Insert row below' }).click();
    await expect(body(page).locator('table tr')).toHaveCount(3);
  });

  test('page setup, paragraph and watermark dialogs', async ({ page }) => {
    await openApp(page, 'agreement');
    await menu(page, 'file', 'Page setup');
    await page.getByTestId('ps-orientation').selectOption('landscape');
    await page.getByTestId('ps-apply').click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { docxEditor: { getEditor(): { pageSetup(): { orient: string } } } }).docxEditor.getEditor().pageSetup().orient)).toBe('landscape');

    await caretAfter(page, 'This agreement sets out');
    await menu(page, 'format', 'Line spacing options…');
    await page.getByTestId('pd-before').fill('18');
    await page.getByTestId('pd-special').selectOption('firstLine');
    await page.getByTestId('pd-by').fill('0.5');
    await page.getByTestId('paragraph-ok').click();
    const attrs = await editorValue(page, (e) => e.view.state.selection.$from.parent.attrs);
    expect(attrs.spacing).toMatchObject({ before: 360 });
    expect(attrs.indent).toMatchObject({ firstLine: 720 });

    await menu(page, 'insert', 'Watermark');
    await page.getByTestId('wm-text').check();
    await page.getByTestId('wm-preset').selectOption('CONFIDENTIAL');
    await page.getByTestId('wm-apply').click();
    await expect(page.locator('.dx-watermark').first()).toBeVisible();
    expect(await editorValue(page, (e) => e.watermark())).toMatchObject({ kind: 'text', text: 'CONFIDENTIAL' });
  });

  test('inserts a footnote from the Insert menu and edits it in its dialog', async ({ page }) => {
    await openApp(page);
    await body(page).click();
    await page.keyboard.type('Revenue grew this year');
    await expect.poll(() => docText(page)).toBe('Revenue grew this year');
    await menu(page, 'insert', 'Insert Footnote');
    const dialog = page.getByTestId('note-dialog');
    await dialog.getByTestId('note-text').fill('Audited figures.');
    await dialog.getByTestId('note-save').click();
    await expect(dialog).toHaveCount(0);
    await expect(body(page).locator('.dx-footnote-ref')).toHaveCount(1);
    const note = page.locator('.dx-page').first().locator('.dx-note');
    await expect(note).toContainText('Audited figures.');

    // A click on the note at the foot of the page opens it for editing.
    await note.click();
    await expect(dialog.getByTestId('note-text')).toHaveValue('Audited figures.');
    await dialog.getByTestId('note-text').fill('Audited figures for 2026.');
    await dialog.getByTestId('note-save').click();
    await expect(note).toContainText('Audited figures for 2026.');
    const key = (await note.getAttribute('data-note'))!;
    const text = await page.evaluate((k) => (window as unknown as { docxEditor: { getEditor(): { noteText(key: string): string } } }).docxEditor.getEditor().noteText(k), key);
    expect(text).toBe('Audited figures for 2026.');
  });

  test('a dialog opened from the More panel closes the panel', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await openSample(page);
    const picture = (alt: string) => page.locator(`img.dx-image[alt^="${alt}"]`).first();
    const more = page.getByTestId('tb-more');
    const panel = page.getByTestId('tb-more-panel');
    const dialog = page.getByTestId('image-props-dialog');
    const open = async (alt: string) => {
      await picture(alt).scrollIntoViewIfNeeded();
      await picture(alt).click();
      await more.click();
      await panel.getByTestId('tb-image-props').click();
      await expect(dialog).toBeVisible();
      await expect(panel).toHaveCount(0);
      await expect(more).toHaveAttribute('aria-expanded', 'false');
    };

    // The panel no longer covers the dialog: it has the focus and its buttons take a click.
    await open('Bar chart');
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-testid="image-props-dialog"]'))).toBe(true);
    await dialog.getByTestId('ip-alt').fill('Quarterly volumes');
    await page.getByTestId('image-props-apply').click();
    await expect(dialog).toHaveCount(0);
    await expect(picture('Quarterly volumes')).toHaveCount(1);

    // Escape closes the dialog at once (an open panel took it first).
    await open('Quarterly volumes');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test.describe('where the ruler is metric', () => {
    test.use({ locale: 'en-GB' });

    test('page setup and paragraph dialogs show and take centimetres', async ({ page }) => {
      await openApp(page, 'agreement');
      await menu(page, 'file', 'Page setup');
      const setup = page.getByTestId('page-setup-dialog');
      await expect(setup.getByTestId('ps-size').locator('option:checked')).toHaveText('Letter (21.59 × 27.94 cm)');
      await expect(setup.getByTestId('ps-top')).toHaveValue('2.54');
      await expect(setup.locator('.fl-unit').first()).toHaveText('cm');
      await setup.getByTestId('ps-top').fill('2');
      await page.getByTestId('ps-apply').click();
      await expect.poll(() => editorValue(page, (e) => e.pageSetup().margins)).toEqual({ top: 1134, bottom: 1440, left: 1440, right: 1440 });

      await caretAfter(page, 'This agreement sets out');
      await menu(page, 'format', 'Line spacing options…');
      const paragraph = page.getByTestId('paragraph-dialog');
      await expect(paragraph.locator('.fl-unit').first()).toHaveText('cm');
      await paragraph.getByTestId('pd-left').fill('1');
      await paragraph.getByTestId('pd-tab-pos').fill('2.5');
      await paragraph.getByTestId('pd-tab-set').click();
      await expect(paragraph.getByTestId('pd-tabs')).toContainText('2.5 cm');
      await page.getByTestId('paragraph-ok').click();
      const attrs = await editorValue(page, (e) => e.view.state.selection.$from.parent.attrs);
      expect(attrs.indent).toMatchObject({ left: 567 });
      expect(attrs.tabs).toContainEqual({ pos: 1417, val: 'left' });
    });
  });
});
