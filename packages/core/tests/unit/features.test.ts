import { strFromU8, unzipSync } from 'fflate';
import type { Node as PMNode } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';
import { importDocx } from '../../src/core/import/importer';
import { bordersCss, shadingCss, spacingCss } from '../../src/core/model/css';
import { schema } from '../../src/core/model/schema';
import { textBoxLook } from '../../src/core/model/textbox';
import { DEFAULT_TEXT_WATERMARK } from '../../src/core/model/watermark';
import { insertTable } from '../../src/editor/commands';
import { setImageProps } from '../../src/editor/images';
import { applyBorders, splitCellInto } from '../../src/editor/tableFormat';
import { findToc, insertToc, refreshToc } from '../../src/editor/toc';
import { escapeLineStart, escapeMarkdown } from '../../src/core/export/markdown';
import { format, makeTranslate } from '../../src/i18n';
import { caret, findRange, openEditor, selectText } from './editorHelpers';
import { example } from './helpers';

const part = (bytes: Uint8Array, path: string) => strFromU8(unzipSync(bytes)[path]);
const labels = { title: 'Contents', empty: 'No entries.' };

function nodes(doc: PMNode, type: string): { node: PMNode; pos: number }[] {
  const out: { node: PMNode; pos: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === type) out.push({ node, pos });
    return true;
  });
  return out;
}

describe('sample document', () => {
  it('opens with every kind of element it shows', () => {
    const ed = openEditor(example('sample.docx'), 'sample.docx');
    const doc = ed.view.state.doc;
    expect(ed.headings().filter((h) => h.level === 1).map((h) => h.text)).toEqual([
      '1. Text formatting', '2. Paragraphs', '3. Lists', '4. Tables', '5. Pictures and text boxes',
      '6. Review: comments and changes', '7. Notes, links and fields', '8. Page layout',
    ]);
    expect(findToc(doc)).not.toBeNull();
    expect(nodes(doc, 'table').length).toBeGreaterThanOrEqual(5);
    expect(nodes(doc, 'image').length).toBe(6);
    expect(nodes(doc, 'opaque_inline').some((n) => n.node.attrs.label === 'Text box')).toBe(true);
    expect(ed.comments()).toHaveLength(2);
    expect(new Set(ed.trackedChanges().map((c) => c.author))).toEqual(new Set(['Amara Okafor', 'Jonas Berg', 'Mei Tanaka']));
    expect(ed.bookmarks().map((b) => b.name)).toEqual(expect.arrayContaining(['fields', 'summary']));
    ed.destroy();
  });
});

describe('Markdown export', () => {
  it('writes headings, emphasis, lists, tables, links and notes', () => {
    const ed = openEditor(example('sample.docx'), 'sample.docx');
    const md = ed.exportMarkdown();
    expect(md).toContain('## 1.1 Character formatting');
    expect(md).toContain('**bold**');
    expect(md).toContain('*italic*');
    expect(md).toMatch(/^- Fruit$/m);
    expect(md).toMatch(/^\s+- Apples$/m);
    expect(md).toMatch(/^1\. Prepare$/m);
    expect(md).toContain('| Region | Q1 | Q2 | Q3 |');
    expect(md).toContain('[example.com](https://example.com/)');
    expect(md).toMatch(/\[\^1\]: A footnote/);
    // Only what Markdown would misread is escaped.
    expect(md).toContain('Double-click to change the text.');
    expect(md).toContain('## 5.4 A text box');
    expect(md).toMatch(/^Em dash — en dash – ellipsis …/m);
    ed.destroy();
  });
});

describe('Markdown escaping', () => {
  it('escapes inline syntax everywhere and block syntax at the start of a paragraph', () => {
    expect(escapeMarkdown('a*b_c [d] `e` | ~f~ <tag> &amp; 3.5 - x')).toBe('a\\*b\\_c \\[d\\] \\`e\\` \\| \\~f\\~ \\<tag> &amp;amp; 3.5 - x');
    expect(escapeLineStart('1. Not a list')).toBe('1\\. Not a list');
    expect(escapeLineStart('# Not a heading')).toBe('\\# Not a heading');
    expect(escapeLineStart('- Not a bullet')).toBe('\\- Not a bullet');
    expect(escapeLineStart('2026 was a year.')).toBe('2026 was a year.');
  });
});

describe('watermarks', () => {
  it('adds, saves and removes a text watermark', () => {
    const ed = openEditor(example('agreement.docx'), 'agreement.docx');
    expect(ed.watermark()).toBeNull();
    expect(ed.setWatermark({ ...DEFAULT_TEXT_WATERMARK, text: 'CONFIDENTIAL', color: 'FF0000' })).toBe(true);
    const bytes = ed.exportDocx();
    const header = Object.keys(unzipSync(bytes)).filter((p) => /word\/header\d*\.xml/.test(p)).map((p) => part(bytes, p)).join('');
    expect(header).toContain('PowerPlusWaterMarkObject');
    expect(header).toContain('string="CONFIDENTIAL"');
    const again = openEditor(bytes, 'again.docx');
    expect(again.watermark()).toMatchObject({ kind: 'text', text: 'CONFIDENTIAL', color: 'FF0000' });
    again.setWatermark(null);
    expect(again.watermark()).toBeNull();
    ed.destroy();
    again.destroy();
  });
});

describe('table of contents', () => {
  it('inserts a contents field that links to the headings and updates it', () => {
    const ed = openEditor(example('formatting.docx'), 'formatting.docx');
    caret(ed, findRange(ed, 'A tour of the formatting').from);
    expect(insertToc(ed.view, ed.docx, () => '1', labels)).toBe(true);
    const toc = findToc(ed.view.state.doc)!;
    expect(toc.instr).toMatch(/TOC \\o "1-3"/);
    const text = ed.view.state.doc.textBetween(toc.from, toc.to, '\n');
    expect(text).toContain('Character formatting');
    const closing = ed.headings().find((h) => h.text === 'Closing section')!;
    caret(ed, closing.pos + ed.view.state.doc.nodeAt(closing.pos)!.nodeSize - 1);
    ed.view.dispatch(ed.view.state.tr.insertText(' and appendix'));
    expect(refreshToc(ed.view, ed.docx, () => '2', labels)).toBe(true);
    const after = findToc(ed.view.state.doc)!;
    expect(ed.view.state.doc.textBetween(after.from, after.to, '\n')).toContain('Closing section and appendix');
    const xml = part(ed.exportDocx(), 'word/document.xml');
    expect(xml).toMatch(/w:anchor="_Toc\d+"/);
    expect(xml).toMatch(/w:name="_Toc\d+"/);
    ed.destroy();
  });
});

describe('tables', () => {
  it('splits a cell and paints borders', () => {
    const ed = openEditor();
    expect(insertTable(ed.view, ed.docx, 2, 2)).toBe(true);
    const cell = nodes(ed.view.state.doc, 'table_cell')[0];
    caret(ed, cell.pos + 2);
    expect(splitCellInto(ed.view, 1, 2)).toBe(true);
    const table = nodes(ed.view.state.doc, 'table')[0].node;
    expect(table.child(0).childCount).toBe(3);
    caret(ed, nodes(ed.view.state.doc, 'table_cell')[0].pos + 2);
    expect(applyBorders(ed.view, 'outside', { style: 'dashed', width: 1.5, color: 'C00000' })).toBe(true);
    const xml = part(ed.exportDocx(), 'word/document.xml');
    expect(xml).toMatch(/w:val="dashed" w:sz="12"[^>]*w:color="C00000"/);
    ed.destroy();
  });
});

describe('protection, pictures, page setup and paragraphs', () => {
  it('protects a document for forms', () => {
    const ed = openEditor(example('template.docx'), 'template.docx');
    ed.setFormsProtection(true);
    const before = ed.view.state.doc;
    ed.view.dispatch(ed.view.state.tr.insertText('x', 2));
    expect(ed.view.state.doc).toBe(before);
    const bytes = ed.exportDocx();
    expect(part(bytes, 'word/settings.xml')).toMatch(/<w:documentProtection w:edit="forms" w:enforcement="1"\/>/);
    expect(importDocx(bytes).settings.formsProtection).toBe(true);
    ed.setFormsProtection(false);
    expect(part(ed.exportDocx(), 'word/settings.xml')).not.toContain('documentProtection');
    ed.destroy();
  });

  it('wraps text around a picture and puts it back in line', () => {
    const ed = openEditor(example('sample.docx'), 'sample.docx');
    const pic = nodes(ed.view.state.doc, 'image').find((n) => n.node.attrs.alt?.startsWith('Bar chart'))!;
    expect(setImageProps(ed.view, pic.pos, { wrap: 'square', title: 'Volumes' })).toBe(true);
    let xml = part(ed.exportDocx(), 'word/document.xml');
    expect(xml).toMatch(/<wp:anchor[^>]*>[\s\S]*?<wp:wrapSquare wrapText="bothSides"\/>[\s\S]*?descr="Bar chart/);
    const again = nodes(ed.view.state.doc, 'image').find((n) => n.node.attrs.alt?.startsWith('Bar chart'))!;
    setImageProps(ed.view, again.pos, { wrap: 'inline' });
    xml = part(ed.exportDocx(), 'word/document.xml');
    expect(xml.match(/<wp:anchor /g)).toHaveLength(1);
    ed.destroy();
  });

  it('wraps a picture top and bottom at its horizontal offset', () => {
    const ed = openEditor(example('sample.docx'), 'sample.docx');
    const chart = () => nodes(ed.view.state.doc, 'image').find((n) => n.node.attrs.alt?.startsWith('Bar chart'))!;
    const box = () => ed.view.nodeDOM(chart().pos) as HTMLElement;
    // From the line it goes to the column's left edge, where the saved file puts it.
    setImageProps(ed.view, chart().pos, { wrap: 'topAndBottom' });
    expect(chart().node.attrs.anchor).toMatchObject({ wrap: 'topAndBottom', hOffset: 0 });
    expect(box().style.marginLeft).toBe('0px');
    setImageProps(ed.view, chart().pos, { hOffset: 457200 });
    expect(box().style.marginLeft).toBe('48px');
    expect(part(ed.exportDocx(), 'word/document.xml')).toMatch(/<wp:positionH relativeFrom="column"><wp:posOffset>457200<\/wp:posOffset><\/wp:positionH>[\s\S]*?<wp:wrapTopAndBottom\/>/);
    ed.destroy();
  });

  it('turns pages to landscape and changes margins', () => {
    const ed = openEditor(example('agreement.docx'), 'agreement.docx');
    const setup = ed.pageSetup();
    expect(setup.orient).toBe('portrait');
    expect(ed.applyPageSetup({ ...setup, orient: 'landscape', margins: { top: 720, bottom: 720, left: 1080, right: 1080 } }, 'document')).toBe(true);
    const xml = part(ed.exportDocx(), 'word/document.xml');
    expect(xml).toMatch(/<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"\/>/);
    expect(xml).toMatch(/<w:pgMar w:top="720"[^>]*w:left="1080"/);
    expect(ed.applyPageSetup({ ...setup, margins: { top: 0, bottom: 0, left: 6000, right: 6000 } }, 'document')).toBe(false);
    ed.destroy();
  });

  it('applies the Paragraph dialog settings that changed', () => {
    const ed = openEditor(example('agreement.docx'), 'agreement.docx');
    selectText(ed, 'This agreement sets out');
    const prev = ed.paragraphSettings().settings;
    expect(ed.applyParagraphSettings(prev, { ...prev, before: 12, after: 0, special: 'hanging', by: 0.5, keepNext: true })).toBe(true);
    const para = ed.view.state.selection.$from.parent;
    expect(para.attrs.spacing).toMatchObject({ before: 240, after: 0 });
    expect(para.attrs.indent).toMatchObject({ hanging: 720 });
    expect(para.attrs.keepNext).toBe(true);
    ed.destroy();
  });

  it('reads and applies the Paragraph dialog lengths in centimetres', () => {
    const ed = openEditor(example('agreement.docx'), 'agreement.docx');
    selectText(ed, 'This agreement sets out');
    const prev = ed.paragraphSettings(true).settings;
    const tabs = [{ pos: 2.5, align: 'left' as const, leader: 'none' as const }];
    expect(ed.applyParagraphSettings(prev, { ...prev, left: 1, special: 'firstLine', by: 1.27, tabs }, true)).toBe(true);
    const para = ed.view.state.selection.$from.parent;
    expect(para.attrs.indent).toMatchObject({ left: 567, firstLine: 720 });
    expect(para.attrs.tabs).toContainEqual({ pos: 1417, val: 'left' });
    expect(ed.paragraphSettings(true).settings).toMatchObject({ left: 1, by: 1.27, tabs: [{ pos: 2.5 }] });
    expect(ed.paragraphSettings().settings).toMatchObject({ left: 0.39, by: 0.5, tabs: [{ pos: 0.98 }] });
    ed.destroy();
  });

  it('inserts and edits a text box', () => {
    const ed = openEditor(example('agreement.docx'), 'agreement.docx');
    caret(ed, findRange(ed, 'Discovery workshops').from);
    expect(ed.insertTextBox({ text: 'Note\nSecond line', width: 1828800, height: 914400, border: true })).toBe(true);
    const box = ed.textBoxAt()!;
    expect(box.info.text).toBe('Note\nSecond line');
    expect(ed.updateTextBox(box.pos, { ...box.info, text: 'Changed' })).toBe(true);
    const xml = part(ed.exportDocx(), 'word/document.xml');
    expect(xml).toContain('<wps:txbx><w:txbxContent>');
    expect(xml).toContain('Changed');
    expect(textBoxLook('<wps:spPr><a:solidFill><a:srgbClr val="f3f6fb"/></a:solidFill><a:ln w="9525"><a:noFill/></a:ln></wps:spPr>')).toEqual({ fill: 'F3F6FB', line: null });
    ed.destroy();
  });
});

describe('paragraph spacing CSS', () => {
  it('keeps borders and shading inside the space before and after', () => {
    expect(spacingCss({ before: 240, after: 120 })).toEqual(['--dx-sb: 12pt', '--dx-sa: 6pt']);
    expect(bordersCss({ bottom: { val: 'single', sz: 8, space: 4, color: '000000' } })).toEqual(expect.arrayContaining(['--dx-oa: 1', '--dx-bbs: 4pt']));
    expect(shadingCss('EDF3FB')).toEqual(['background-color: #EDF3FB', '--dx-ob: 1', '--dx-oa: 1']);
    const dom = schema.nodes.paragraph.spec.toDOM!(schema.nodes.paragraph.create({ spacing: { after: 160 }, shading: 'EDF3FB' })) as [string, Record<string, string>];
    expect(dom[1].style).toContain('--dx-sa: 8pt');
    expect(dom[1].style).toContain('--dx-oa: 1');
  });
});

describe('interface text', () => {
  it('fills placeholders and plural forms', () => {
    expect(format('{count, plural, one {# result} other {# results}}', { count: 1 }, 'en')).toBe('1 result');
    expect(format('{count, plural, =0 {No results} one {# result} other {# results}}', { count: 0 }, 'en')).toBe('No results');
    expect(format('{count, plural, one {# wynik} few {# wyniki} many {# wyników} other {# wyniku}}', { count: 5 }, 'pl')).toBe('5 wyników');
    expect(format('Page {current} of {total}', { current: 2, total: 9 }, 'en')).toBe('Page 2 of 9');
  });

  it('falls back to English for missing translations', () => {
    const t = makeTranslate('de', { 'title.export': 'Exportieren' });
    expect(t('title.export')).toBe('Exportieren');
    expect(t('title.open')).toBe('Open');
  });
});
