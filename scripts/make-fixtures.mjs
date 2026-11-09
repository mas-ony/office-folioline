// Generates DOCX test fixtures in packages/core/tests/fixtures and the example documents in
// apps/web-shared/public/examples.
// Run: node scripts/make-fixtures.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { zipSync, strToU8 } from 'fflate';

const OUT = new URL('../packages/core/tests/fixtures/', import.meta.url);
mkdirSync(OUT, { recursive: true });

/**
 * Zip a package with the same time on every entry, so that a rerun writes the same bytes. fflate
 * stores local time, so local midnight on 1 January 2024 gives the same bytes in every time zone.
 */
const zip = (parts) => zipSync(parts, { mtime: new Date(2024, 0, 1) });

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS = `xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w14 w15"`;
const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

// --- tiny PNG encoder -------------------------------------------------------------------------
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// --- XML helpers --------------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const t = (s) => `<w:t xml:space="preserve">${esc(s)}</w:t>`;
const run = (text, rPr = '') => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}${t(text)}</w:r>`;
const p = (content, pPr = '') => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${content}</w:p>`;

function drawing(rId, cx, cy, id, name) {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="${name}" descr="Gradient test image"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

const styles = `${DECL}<w:styles ${NS}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi" w:eastAsiaTheme="minorHAnsi" w:cstheme="minorBidi"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="0"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi"/><w:color w:val="2F5496"/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:contextualSpacing/></w:pPr><w:rPr><w:sz w:val="56"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>
<w:style w:type="character" w:styleId="Strong"><w:name w:val="Strong"/><w:basedOn w:val="DefaultParagraphFont"/><w:qFormat/><w:rPr><w:b/><w:bCs/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
<w:style w:type="table" w:styleId="GridAccent"><w:name w:val="Grid Accent"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:left w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:right w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="4472C4"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="4472C4"/></w:tblBorders></w:tblPr><w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr></w:tblStylePr></w:style>
</w:styles>`;

const numbering = `${DECL}<w:numbering ${NS}>
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:hint="default"/></w:rPr></w:lvl>
</w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2)"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl>
</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

const list = (text, numId, ilvl) => p(run(text), `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`);
const cell = (text, tcPr = '') => `<w:tc><w:tcPr>${tcPr}</w:tcPr>${p(run(text))}</w:tc>`;

const body = [
  p(run('Kitchen Sink Document'), '<w:pStyle w:val="Title"/>'),
  p([
    run('Plain, '),
    run('bold', '<w:b/>'),
    run(', '),
    run('italic', '<w:i/>'),
    run(', '),
    run('double underline', '<w:u w:val="double"/>'),
    run(', '),
    run('strike', '<w:strike/>'),
    run(', '),
    run('red', '<w:color w:val="FF0000"/>'),
    run(', '),
    run('highlighted', '<w:highlight w:val="yellow"/>'),
    run(', '),
    run('shaded', '<w:shd w:val="clear" w:color="auto" w:fill="DDEEFF"/>'),
    run(', '),
    run('Courier 14', '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="28"/>'),
    run(', E=mc'),
    run('2', '<w:vertAlign w:val="superscript"/>'),
    run(', '),
    run('strong style', '<w:rStyle w:val="Strong"/>'),
    run(', '),
    run('kerned', '<w:kern w:val="28"/><w:w w:val="90"/>'),
    run('.'),
  ].join('')),
  p(`<w:bookmarkStart w:id="0" w:name="target"/>${run('Bookmarked text. ')}<w:bookmarkEnd w:id="0"/><w:hyperlink r:id="rIdLink" w:history="1">${run('External link', '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>${run(' and ')}<w:hyperlink w:anchor="target">${run('internal link', '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>${run('.')}`),
  p(`${run('Left')}<w:r><w:tab/></w:r>${run('Center')}<w:r><w:tab/></w:r>${run('Right')}<w:r><w:br/></w:r>${run('After line break')}`, '<w:tabs><w:tab w:val="center" w:pos="4680"/><w:tab w:val="right" w:leader="dot" w:pos="9360"/></w:tabs>'),
  p(run('Heading One'), '<w:pStyle w:val="Heading1"/>'),
  list('Bullet one', 1, 0),
  list('Nested bullet', 1, 1),
  list('Bullet two', 1, 0),
  list('Number one', 2, 0),
  list('Number one a', 2, 1),
  list('Number two', 2, 0),
  p(run('Centered justified indent'), '<w:spacing w:before="120" w:after="120" w:line="360" w:lineRule="auto"/><w:ind w:left="720" w:right="720" w:firstLine="360"/><w:jc w:val="center"/>'),
  `<w:tbl><w:tblPr><w:tblStyle w:val="GridAccent"/><w:tblW w:w="5000" w:type="pct"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="3120"/><w:gridCol w:w="3120"/><w:gridCol w:w="3120"/></w:tblGrid>
<w:tr><w:trPr><w:tblHeader/></w:trPr>${cell('H1')}${cell('H2')}${cell('H3')}</w:tr>
<w:tr>${cell('Merged across', '<w:gridSpan w:val="2"/>')}${cell('Tall', '<w:vMerge w:val="restart"/><w:shd w:val="clear" w:color="auto" w:fill="FFF2CC"/>')}</w:tr>
<w:tr>${cell('A3')}${cell('B3')}${cell('', '<w:vMerge/>')}</w:tr>
</w:tbl>`,
  p(`${run('Image: ')}<w:r>${drawing('rIdImg', 1143000, 857250, 1, 'Picture 1')}</w:r>`),
  `<w:p>${run('Before comment. ')}<w:commentRangeStart w:id="0"/><w:commentRangeStart w:id="1"/>${run('Comment target')}<w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r><w:commentRangeEnd w:id="1"/><w:r><w:commentReference w:id="1"/></w:r>${run(' after.')}</w:p>`,
  p(`${run('Tracked: ')}<w:ins w:id="10" w:author="Alice" w:date="2024-01-01T00:00:00Z">${run('inserted')}</w:ins>${run(' ')}<w:del w:id="11" w:author="Bob" w:date="2024-01-02T00:00:00Z"><w:r><w:delText>deleted</w:delText></w:r></w:del>${run(' end.')}`),
  p(`${run('Footnote here')}<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="1"/></w:r>${run(' and a field: ')}<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> DATE \\@ "yyyy" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${run('2024')}<w:r><w:fldChar w:fldCharType="end"/></w:r>`),
  p(`${run('Math: ')}<m:oMath><m:r><m:t>a+b</m:t></m:r></m:oMath>`),
  `<w:sdt><w:sdtPr><w:alias w:val="Block control"/></w:sdtPr><w:sdtContent>${p(run('Inside a content control'))}</w:sdtContent></w:sdt>`,
  p(`${run('Before page break')}<w:r><w:br w:type="page"/></w:r>${run('After page break')}`),
  p(run('End of portrait section'), `<w:sectPr><w:headerReference w:type="default" r:id="rIdH1"/><w:headerReference w:type="first" r:id="rIdH2"/><w:footerReference w:type="default" r:id="rIdF1"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/><w:titlePg/><w:docGrid w:linePitch="360"/></w:sectPr>`),
  p(run('Landscape section text.')),
  `<w:sectPr><w:footerReference w:type="default" r:id="rIdF1"/><w:type w:val="nextPage"/><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/><w:pgNumType w:start="5"/><w:cols w:num="2" w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>`,
].join('\n');

const documentXml = `${DECL}<w:document ${NS}><w:body>${body}</w:body></w:document>`;
const header1 = `${DECL}<w:hdr ${NS}>${p(run('Default header text'), '<w:jc w:val="right"/>')}</w:hdr>`;
const header2 = `${DECL}<w:hdr ${NS}>${p(run('First page header'))}</w:hdr>`;
const footer1 = `${DECL}<w:ftr ${NS}>${p(`${run('Page ')}<w:fldSimple w:instr=" PAGE   \\* MERGEFORMAT ">${run('1')}</w:fldSimple>${run(' of ')}<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${run('3')}<w:r><w:fldChar w:fldCharType="end"/></w:r>`, '<w:jc w:val="center"/>')}</w:ftr>`;
const comments = `${DECL}<w:comments ${NS}>
<w:comment w:id="0" w:author="Alice" w:date="2024-03-01T10:00:00Z" w:initials="A"><w:p w14:paraId="00000001"><w:r><w:annotationRef/></w:r>${run('Please review this.')}</w:p></w:comment>
<w:comment w:id="1" w:author="Bob" w:date="2024-03-02T10:00:00Z" w:initials="B"><w:p w14:paraId="00000002"><w:r><w:annotationRef/></w:r>${run('Reply from Bob.')}</w:p></w:comment>
</w:comments>`;
const commentsEx = `${DECL}<w15:commentsEx ${NS}><w15:commentEx w15:paraId="00000001" w15:done="0"/><w15:commentEx w15:paraId="00000002" w15:paraIdParent="00000001" w15:done="0"/></w15:commentsEx>`;
const footnotes = `${DECL}<w:footnotes ${NS}><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote><w:footnote w:id="1"><w:p><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>${run(' A footnote.')}</w:p></w:footnote></w:footnotes>`;
const settings = `${DECL}<w:settings ${NS}><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
const theme = `${DECL}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const ct = `${DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
<Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
<Override PartName="/word/commentsExtended.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml"/>
<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>
<Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const RT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rels = `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RT}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
const docRels = `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="${RT}/styles" Target="styles.xml"/>
<Relationship Id="rIdNum" Type="${RT}/numbering" Target="numbering.xml"/>
<Relationship Id="rIdSettings" Type="${RT}/settings" Target="settings.xml"/>
<Relationship Id="rIdTheme" Type="${RT}/theme" Target="theme/theme1.xml"/>
<Relationship Id="rIdH1" Type="${RT}/header" Target="header1.xml"/>
<Relationship Id="rIdH2" Type="${RT}/header" Target="header2.xml"/>
<Relationship Id="rIdF1" Type="${RT}/footer" Target="footer1.xml"/>
<Relationship Id="rIdComments" Type="${RT}/comments" Target="comments.xml"/>
<Relationship Id="rIdCommentsEx" Type="http://schemas.microsoft.com/office/2011/relationships/commentsExtended" Target="commentsExtended.xml"/>
<Relationship Id="rIdFootnotes" Type="${RT}/footnotes" Target="footnotes.xml"/>
<Relationship Id="rIdImg" Type="${RT}/image" Target="media/image1.png"/>
<Relationship Id="rIdLink" Type="${RT}/hyperlink" Target="https://example.com/" TargetMode="External"/>
</Relationships>`;
const core = `${DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Kitchen sink</dc:title><cp:lastModifiedBy>Fixture</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:modified></cp:coreProperties>`;

const image = png(120, 90, (x, y) => [Math.round((x / 120) * 255), Math.round((y / 90) * 255), 160]);

const files = {
  '[Content_Types].xml': strToU8(ct),
  '_rels/.rels': strToU8(rels),
  'docProps/core.xml': strToU8(core),
  'word/document.xml': strToU8(documentXml),
  'word/_rels/document.xml.rels': strToU8(docRels),
  'word/styles.xml': strToU8(styles),
  'word/numbering.xml': strToU8(numbering),
  'word/settings.xml': strToU8(settings),
  'word/theme/theme1.xml': strToU8(theme),
  'word/header1.xml': strToU8(header1),
  'word/header2.xml': strToU8(header2),
  'word/footer1.xml': strToU8(footer1),
  'word/comments.xml': strToU8(comments),
  'word/commentsExtended.xml': strToU8(commentsEx),
  'word/footnotes.xml': strToU8(footnotes),
  'word/media/image1.png': new Uint8Array(image),
};
writeFileSync(new URL('kitchen-sink.docx', OUT), zip(files));
writeFileSync(new URL('gradient.png', OUT), image);

// A long document for pagination checks.
const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ';
const longBody = Array.from({ length: 120 }, (_, i) =>
  i % 15 === 0 ? p(run(`Chapter ${i / 15 + 1}`), '<w:pStyle w:val="Heading1"/>') : p(run(`${i}. ${lorem.repeat(1 + (i % 3))}`)),
).join('') + `<w:sectPr><w:footerReference w:type="default" r:id="rIdF1"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;
const longFiles = {
  ...files,
  'word/document.xml': strToU8(`${DECL}<w:document ${NS}><w:body>${longBody}</w:body></w:document>`),
};
writeFileSync(new URL('long.docx', OUT), zip(longFiles));

// Multi-column sections: one column, a continuous two-column section with a separator, one column.
const pgSz = '<w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>';
const colBody = [
  p(run('Newsletter'), '<w:pStyle w:val="Title"/>'),
  p(run('An introduction that spans the full width of the page before the columns begin.'), `<w:sectPr>${pgSz}<w:cols w:space="720"/></w:sectPr>`),
  ...Array.from({ length: 10 }, (_, i) => p(run(`Column paragraph ${i + 1}. ${lorem}`), i === 9 ? `<w:sectPr><w:type w:val="continuous"/>${pgSz}<w:cols w:num="2" w:sep="1" w:space="720"/></w:sectPr>` : '')),
  p(run('Back to a single column after a continuous section break.')),
  `<w:sectPr><w:type w:val="continuous"/>${pgSz}<w:cols w:space="720"/></w:sectPr>`,
].join('');
writeFileSync(new URL('columns.docx', OUT), zip({ ...files, 'word/document.xml': strToU8(`${DECL}<w:document ${NS}><w:body>${colBody}</w:body></w:document>`) }));

// Footnotes on several pages (some long, one inside a table) and endnotes after the text.
const noteStyles = styles.replace('</w:styles>', `<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="EndnoteText"><w:name w:val="endnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style><w:style w:type="character" w:styleId="EndnoteReference"><w:name w:val="endnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style></w:styles>`);
const fnRef = (id) => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
const enRef = (id) => `<w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteReference w:id="${id}"/></w:r>`;
const noteIds = [];
const notesBody = [
  p(run('Notes test'), '<w:pStyle w:val="Title"/>'),
  ...Array.from({ length: 36 }, (_, i) => {
    const k = i + 1;
    if (i % 3 !== 1) return p(run(`${k}. ${lorem}`));
    noteIds.push(k);
    return p(`${run(`${k}. ${lorem}With a note`)}${fnRef(k)}${run(` after sentence ${k}.`)}`);
  }),
  `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="4680"/><w:gridCol w:w="4680"/></w:tblGrid><w:tr>${cell('Cell with a note')}<w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>${p(`${run('Table note')}${fnRef(100)}`)}</w:tc></w:tr></w:tbl>`,
  p(`${run('Endnote one')}${enRef(1)}${run(' and endnote two')}${enRef(2)}${run('.')}`),
  `<w:sectPr><w:footerReference w:type="default" r:id="rIdF1"/>${pgSz}</w:sectPr>`,
].join('');
noteIds.push(100);
const noteXml = (kind, id, text) => `<w:${kind} w:id="${id}"><w:p><w:pPr><w:pStyle w:val="${kind === 'footnote' ? 'FootnoteText' : 'EndnoteText'}"/></w:pPr><w:r><w:rPr><w:rStyle w:val="${kind === 'footnote' ? 'FootnoteReference' : 'EndnoteReference'}"/></w:rPr><w:${kind}Ref/></w:r>${run(` ${text}`)}</w:p></w:${kind}>`;
const separators = (kind) => `<w:${kind} w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:${kind}><w:${kind} w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:${kind}>`;
const notesFootnotes = `${DECL}<w:footnotes ${NS}>${separators('footnote')}${noteIds.map((id) => noteXml('footnote', id, id === 100 ? 'Footnote in a table cell.' : id % 4 === 2 ? `Long footnote ${id}. ${lorem}${lorem}` : `Footnote ${id}.`)).join('')}</w:footnotes>`;
const notesEndnotes = `${DECL}<w:endnotes ${NS}>${separators('endnote')}${noteXml('endnote', 1, 'First endnote text.')}${noteXml('endnote', 2, `Second endnote. ${lorem}`)}</w:endnotes>`;
writeFileSync(new URL('notes.docx', OUT), zip({
  ...files,
  '[Content_Types].xml': strToU8(ct.replace('</Types>', '<Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/></Types>')),
  'word/_rels/document.xml.rels': strToU8(docRels.replace('</Relationships>', `<Relationship Id="rIdEndnotes" Type="${RT}/endnotes" Target="endnotes.xml"/></Relationships>`)),
  'word/styles.xml': strToU8(noteStyles),
  'word/document.xml': strToU8(`${DECL}<w:document ${NS}><w:body>${notesBody}</w:body></w:document>`),
  'word/footnotes.xml': strToU8(notesFootnotes),
  'word/endnotes.xml': strToU8(notesEndnotes),
}));

console.log('fixtures written to', OUT.pathname);

// ================================================================================================
// Example documents for the Examples menu (apps/web-shared/public/examples). All content is
// written for this project.

const EX = new URL('../apps/web-shared/public/examples/', import.meta.url);
mkdirSync(EX, { recursive: true });

const exStyles = (extra = '') => styles.replace('</w:styles>', `
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:i/><w:color w:val="5A6474"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi"/><w:b/><w:color w:val="1F3864"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="40"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:color w:val="404040"/><w:sz w:val="23"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4680"/><w:tab w:val="right" w:pos="9360"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:color w:val="7F7F7F"/><w:sz w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4680"/><w:tab w:val="right" w:pos="9360"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:color w:val="7F7F7F"/><w:sz w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="EndnoteText"><w:name w:val="endnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="EndnoteReference"><w:name w:val="endnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="864" w:right="864"/><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:color w:val="404040"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="ScheduleTable"><w:name w:val="Schedule Table"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="1F3864"/><w:left w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="1F3864"/><w:right w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="8EA9DB"/></w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="1F3864"/></w:tcPr></w:tblStylePr><w:tblStylePr w:type="band1Horz"><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="EEF2FA"/></w:tcPr></w:tblStylePr></w:style>
${extra}</w:styles>`);

const exNumbering = numbering.replace('<w:num w:numId="1">', `<w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="multilevel"/>
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="432" w:hanging="432"/></w:pPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1.%2"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1008" w:hanging="576"/></w:pPr></w:lvl>
<w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="(%3)"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="432"/></w:pPr></w:lvl>
<w:lvl w:ilvl="3"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="(%4)"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1872" w:hanging="432"/></w:pPr></w:lvl>
</w:abstractNum>
<w:num w:numId="1">`).replace('</w:numbering>', `<w:num w:numId="3"><w:abstractNumId w:val="2"/></w:num>
</w:numbering>`);

const SECT = (extra = '', hdr = true) => `<w:sectPr>${hdr ? '<w:headerReference w:type="default" r:id="rIdH1"/><w:footerReference w:type="default" r:id="rIdF1"/>' : ''}${pgSz}<w:cols w:space="720"/>${extra}</w:sectPr>`;
const exHeader = (text) => `${DECL}<w:hdr ${NS}>${p(`${run(text)}<w:r><w:tab/></w:r><w:r><w:tab/></w:r>${run('Folioline example')}`, '<w:pStyle w:val="Header"/>')}</w:hdr>`;
const exFooter = `${DECL}<w:ftr ${NS}>${p(`${run('Page ')}<w:fldSimple w:instr=" PAGE ">${run('1')}</w:fldSimple>${run(' of ')}<w:fldSimple w:instr=" NUMPAGES ">${run('1')}</w:fldSimple>`, '<w:pStyle w:val="Footer"/><w:jc w:val="center"/>')}</w:ftr>`;

/** Build a package from document parts; only the parts given are written. */
function pack({ body: bodyXml, header, headerXml, comments: cmts, commentsEx: cmtsEx, footnotes: fns, endnotes: ens, media = {}, extraRels = '', title = 'Example', stylesXml = exStyles(), numberingXml = exNumbering, ns = NS }) {
  const overrides = [
    ['/word/document.xml', 'document.main+xml'],
    ['/word/styles.xml', 'styles+xml'],
    ['/word/numbering.xml', 'numbering+xml'],
    ['/word/settings.xml', 'settings+xml'],
    ['/word/header1.xml', 'header+xml'],
    ['/word/footer1.xml', 'footer+xml'],
    ...(cmts ? [['/word/comments.xml', 'comments+xml'], ['/word/commentsExtended.xml', 'commentsExtended+xml']] : []),
    ...(fns ? [['/word/footnotes.xml', 'footnotes+xml']] : []),
    ...(ens ? [['/word/endnotes.xml', 'endnotes+xml']] : []),
  ];
  const ctXml = `${DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${overrides.map(([n, t]) => `<Override PartName="${n}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${t}"/>`).join('')}<Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const relsXml = `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="${RT}/styles" Target="styles.xml"/>
<Relationship Id="rIdNum" Type="${RT}/numbering" Target="numbering.xml"/>
<Relationship Id="rIdSettings" Type="${RT}/settings" Target="settings.xml"/>
<Relationship Id="rIdTheme" Type="${RT}/theme" Target="theme/theme1.xml"/>
<Relationship Id="rIdH1" Type="${RT}/header" Target="header1.xml"/>
<Relationship Id="rIdF1" Type="${RT}/footer" Target="footer1.xml"/>
${cmts ? `<Relationship Id="rIdComments" Type="${RT}/comments" Target="comments.xml"/><Relationship Id="rIdCommentsEx" Type="http://schemas.microsoft.com/office/2011/relationships/commentsExtended" Target="commentsExtended.xml"/>` : ''}
${fns ? `<Relationship Id="rIdFootnotes" Type="${RT}/footnotes" Target="footnotes.xml"/>` : ''}
${ens ? `<Relationship Id="rIdEndnotes" Type="${RT}/endnotes" Target="endnotes.xml"/>` : ''}
${Object.keys(media).map((name, i) => `<Relationship Id="rIdMedia${i + 1}" Type="${RT}/image" Target="media/${name}"/>`).join('')}
${extraRels}
</Relationships>`;
  const coreXml = core.replace('<dc:title>Kitchen sink</dc:title>', `<dc:title>${esc(title)}</dc:title>`);
  const out = {
    '[Content_Types].xml': strToU8(ctXml),
    '_rels/.rels': strToU8(rels),
    'docProps/core.xml': strToU8(coreXml),
    'word/document.xml': strToU8(`${DECL}<w:document ${ns}><w:body>${bodyXml}</w:body></w:document>`),
    'word/_rels/document.xml.rels': strToU8(relsXml),
    'word/styles.xml': strToU8(stylesXml),
    'word/numbering.xml': strToU8(numberingXml),
    'word/settings.xml': strToU8(settings),
    'word/theme/theme1.xml': strToU8(theme),
    'word/header1.xml': strToU8(headerXml ?? exHeader(header ?? title)),
    'word/footer1.xml': strToU8(exFooter),
  };
  if (cmts) {
    out['word/comments.xml'] = strToU8(cmts);
    out['word/commentsExtended.xml'] = strToU8(cmtsEx);
  }
  if (fns) out['word/footnotes.xml'] = strToU8(fns);
  if (ens) out['word/endnotes.xml'] = strToU8(ens);
  for (const [name, bytes] of Object.entries(media)) out[`word/media/${name}`] = new Uint8Array(bytes);
  return zip(out);
}

const ins = (id, author, date, text) => `<w:ins w:id="${id}" w:author="${author}" w:date="${date}">${run(text)}</w:ins>`;
const del = (id, author, date, text) => `<w:del w:id="${id}" w:author="${author}" w:date="${date}"><w:r><w:delText xml:space="preserve">${esc(text)}</w:delText></w:r></w:del>`;
const cStart = (id) => `<w:commentRangeStart w:id="${id}"/>`;
const cEnd = (id) => `<w:commentRangeEnd w:id="${id}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`;
const commentXml = (id, author, date, text, paraId) => `<w:comment w:id="${id}" w:author="${author}" w:date="${date}" w:initials="${author.split(' ').map((x) => x[0]).join('')}"><w:p w14:paraId="${paraId}"><w:r><w:annotationRef/></w:r>${run(text)}</w:p></w:comment>`;
const H = (text, level = 1) => p(run(text), `<w:pStyle w:val="Heading${level}"/>`);
const numbered = (text, ilvl = 0, numId = 3) => p(run(text), `<w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr><w:spacing w:after="100"/>`);
const bullet = (content, ilvl = 0) => p(content.startsWith('<w:') ? content : run(content), `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="1"/></w:numPr>`);
const tc = (content, w, extra = '') => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${extra}</w:tcPr>${content.startsWith('<w:p') ? content : p(run(content))}</w:tc>`;
const table = (widths, rows, style = 'ScheduleTable') => `<w:tbl><w:tblPr><w:tblStyle w:val="${style}"/><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.map((r, i) => `<w:tr>${i === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${r.map((c, j) => tc(c, widths[j])).join('')}</w:tr>`).join('')}</w:tbl>`;

// --- 0. Sample: one page per kind of element, opened by default ---------------------------------
{
  const A = 'Amara Okafor', B = 'Jonas Berg', C = 'Mei Tanaka';
  const d1 = '2026-10-12T09:30:00Z', d2 = '2026-10-14T16:05:00Z', d3 = '2026-10-19T10:45:00Z', d4 = '2026-10-21T14:10:00Z';
  const NSX = NS.replace(' mc:Ignorable', ' xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" mc:Ignorable');
  const SZ = '<w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>';
  const r = run;
  const B_ = '<w:b/>';
  const fn = (id) => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
  const en = (id) => `<w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteReference w:id="${id}"/></w:r>`;
  const fld = (instr, shown) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${r(shown)}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
  const link = (rid, text) => `<w:hyperlink r:id="${rid}" w:history="1">${r(text, '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>`;
  const anchorLink = (name, text) => `<w:hyperlink w:anchor="${name}" w:history="1">${r(text, '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>`;
  const fmtChange = (id, author, date, text, rPr, before = '') => `<w:r><w:rPr>${rPr}<w:rPrChange w:id="${id}" w:author="${author}" w:date="${date}"><w:rPr>${before}</w:rPr></w:rPrChange></w:rPr>${t(text)}</w:r>`;

  // Headings carry hidden _Toc bookmarks the contents link to. Every main heading starts a page,
  // so heading n is on page n + 2 (after the cover and the contents).
  const toc = [];
  let bm = 200;
  const heading = (text, level) => {
    const name = `_Toc${String(910000 + bm).padStart(9, '0')}`;
    const id = bm++;
    toc.push({ text, level, name });
    const brk = level === 1 ? '<w:pageBreakBefore/>' : '';
    return p(`<w:bookmarkStart w:id="${id}" w:name="${name}"/>${r(text)}<w:bookmarkEnd w:id="${id}"/>`, `<w:pStyle w:val="Heading${level}"/>${brk}`);
  };
  const H1 = (text) => heading(text, 1);
  const H2 = (text) => heading(text, 2);

  // Pictures (drawn here, no external assets).
  const solid = (rgb) => png(16, 16, () => rgb);
  const swatches = { 'red.png': solid([214, 48, 49]), 'blue.png': solid([45, 98, 214]), 'green.png': solid([46, 160, 67]), 'orange.png': solid([240, 152, 25]) };
  const chart = png(480, 220, (x, y) => {
    const bars = [[60, 0.45, [91, 134, 229]], [150, 0.7, [91, 134, 229]], [240, 0.58, [91, 134, 229]], [330, 0.86, [46, 160, 67]]];
    if (y >= 200 && y < 202) return x >= 30 ? [120, 120, 120] : [255, 255, 255];
    if (y >= 202) return [255, 255, 255];
    if (x === 30 && y > 10) return [120, 120, 120];
    for (const [bx, h, c] of bars) if (x >= bx && x < bx + 60 && y >= 200 - h * 180) return c;
    if (x > 30 && (y === 65 || y === 110 || y === 155)) return [225, 225, 225];
    return [255, 255, 255];
  });
  const badge = png(150, 150, (x, y) => {
    const dx = x - 75, dy = y - 75, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 56) return [Math.round(30 + (y / 150) * 40), Math.round(95 + (x / 150) * 60), Math.round(74 + (y / 150) * 50)];
    if (d < 64) return [232, 186, 64];
    return [244, 241, 232];
  });
  const media = { ...swatches, 'chart.png': chart, 'badge.png': badge };
  const rid = (name) => `rIdMedia${Object.keys(media).indexOf(name) + 1}`;
  const EMU = 9525;
  let picId = 10;
  const graphic = (name, cx, cy, descr) => `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="${name}" descr="${esc(descr)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid(name)}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
  const inlinePic = (name, w, h, descr) => {
    const cx = w * EMU, cy = h * EMU, id = picId++;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="Picture ${id}" descr="${esc(descr)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>${graphic(name, cx, cy, descr)}</wp:inline></w:drawing></w:r>`;
  };
  const floatPic = (name, w, h, descr) => {
    const cx = w * EMU, cy = h * EMU, id = picId++;
    return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:align>right</wp:align></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="${id}" name="Picture ${id}" descr="${esc(descr)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>${graphic(name, cx, cy, descr)}</wp:anchor></w:drawing></w:r>`;
  };
  const textBox = (lines, wPt, hPt) => {
    const cx = wPt * 12700, cy = hPt * 12700, id = picId++;
    const paras = lines.map((l, i) => `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r>${i === 0 ? '<w:rPr><w:b/><w:color w:val="1F3864"/></w:rPr>' : ''}${t(l)}</w:r></w:p>`).join('');
    return `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="Text Box ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="F3F6FB"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="8EA9DB"/></a:solidFill></a:ln></wps:spPr><wps:txbx><w:txbxContent>${paras}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:inline></w:drawing></mc:Choice><mc:Fallback><w:pict><v:shape id="Text Box ${id}" type="#_x0000_t202" style="width:${wPt}pt;height:${hPt}pt" fillcolor="#F3F6FB" strokecolor="#8EA9DB"><v:textbox><w:txbxContent>${paras}</w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r>`;
  };

  const cellX = (content, w, extra = '') => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${extra}</w:tcPr>${content.startsWith('<w:p') || content.startsWith('<w:tbl') ? content : p(r(content))}</w:tc>`;
  const plainTable = (widths, rows, tblPr = '') => `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders>${tblPr}</w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
  const tight = '<w:spacing w:after="0"/>';
  const caption = (text) => p(r(text), '<w:pStyle w:val="Caption"/><w:jc w:val="center"/>');

  const body = [
    // Cover
    p(r('FOLIOLINE', '<w:b/><w:color w:val="1F3864"/><w:sz w:val="44"/>'), '<w:jc w:val="center"/><w:spacing w:before="2600" w:after="80"/>'),
    p(r('SAMPLE DOCUMENT', '<w:b/><w:color w:val="1F3864"/><w:sz w:val="44"/>'), '<w:jc w:val="center"/><w:spacing w:after="160"/>'),
    p(r('A tour of the elements the editor opens, edits and saves', '<w:i/><w:color w:val="595959"/><w:sz w:val="26"/>'), '<w:jc w:val="center"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="18" w:color="1F3864"/></w:pBdr><w:spacing w:after="480"/>'),
    p(`${r('Version: ', B_)}${r('1.0')}`, `<w:jc w:val="center"/>${tight}`),
    p(`${r('Status: ', B_)}${r('Sample', '<w:color w:val="2E8B57"/>')}`, `<w:jc w:val="center"/>${tight}`),
    p(`${r('Date: ', B_)}${r('24 October 2026')}`, `<w:jc w:val="center"/>${tight}`),
    p(`${r('Reviewers: ', B_)}${r(`${A}, ${B}, ${C}`)}`, `<w:jc w:val="center"/>${tight}`),
    p(`${r('Sections: ', B_)}${r('8')}`, `<w:jc w:val="center"/>${tight}`),
    // Contents (filled in below once the headings are known)
    '@@TOC@@',

    H1('1. Text formatting'),
    H2('1.1 Character formatting'),
    p([r('This sentence uses '), r('bold', B_), r(', '), r('italic', '<w:i/>'), r(', '), r('underlined', '<w:u w:val="single"/>'), r(', '), r('struck through', '<w:strike/>'), r(', '), r('double struck', '<w:dstrike/>'), r(' and '), r('bold italic underlined', '<w:b/><w:i/><w:u w:val="single"/>'), r(' text.')].join('')),
    H2('1.2 Effects and underline styles'),
    p([r('Positions: x'), r('2', '<w:vertAlign w:val="superscript"/>'), r(' and H'), r('2', '<w:vertAlign w:val="subscript"/>'), r('O. Capitals: '), r('Small Caps', '<w:smallCaps/>'), r(' and '), r('all caps', '<w:caps/>'), r('.')].join('')),
    p([r('Underlines: '), r('wavy', '<w:u w:val="wave"/>'), r(', '), r('dotted', '<w:u w:val="dotted"/>'), r(', '), r('dashed', '<w:u w:val="dash"/>'), r(', '), r('double', '<w:u w:val="double"/>'), r(' and '), r('thick', '<w:u w:val="thick"/>'), r('.')].join('')),
    H2('1.3 Fonts and sizes'),
    p([r('Arial', '<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>'), r(' · '), r('Times New Roman', '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>'), r(' · '), r('Courier New', '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>'), r(' · '), r('Georgia', '<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/>'), r(' · '), r('Cambria', '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>')].join('')),
    p([['8', 16], ['10', 20], ['12', 24], ['16', 32], ['24', 48], ['36', 72]].map(([label, hs]) => r(`${label} pt `, `<w:sz w:val="${hs}"/>`)).join('')),
    H2('1.4 Colour and highlighting'),
    p([r('Text colours: '), r('red', '<w:color w:val="C00000"/>'), r(', '), r('blue', '<w:color w:val="0070C0"/>'), r(', '), r('green', '<w:color w:val="00B050"/>'), r(', '), r('purple', '<w:color w:val="7030A0"/>'), r('. Highlights: '), r('yellow', '<w:highlight w:val="yellow"/>'), r(' '), r('cyan', '<w:highlight w:val="cyan"/>'), r(' '), r('green', '<w:highlight w:val="green"/>'), r(' '), r('magenta', '<w:highlight w:val="magenta"/>'), r(' '), r('dark yellow', '<w:highlight w:val="darkYellow"/>'), r('.')].join('')),
    p(`${r('This paragraph has shading behind it, and ')}${r('these words are shaded', '<w:shd w:val="clear" w:color="auto" w:fill="FCE4D6"/>')}${r(' on their own.')}`, '<w:shd w:val="clear" w:color="auto" w:fill="EDF3FB"/>'),
    H2('1.5 Symbols and punctuation'),
    p(r('Em dash — en dash – ellipsis … © ® ™ § ¶ ° • † ‡, a non‑breaking hyphen and “curly” ‘quotes’ that it’s easy to get wrong.')),

    H1('2. Paragraphs'),
    H2('2.1 Alignment'),
    p(r('Left aligned: the usual way text runs down a page.')),
    p(r('Centred: often used for titles and short notices.'), '<w:jc w:val="center"/>'),
    p(r('Right aligned: dates and signatures.'), '<w:jc w:val="right"/>'),
    p(r('Justified: both edges line up, so the spaces between words stretch on every line but the last. A paragraph needs a few lines before the effect shows, which is why this one keeps going for a little while.'), '<w:jc w:val="both"/>'),
    H2('2.2 Indentation'),
    p(r('Indented half an inch from the left margin.'), '<w:ind w:left="720"/>'),
    p(r('A first-line indent: only the opening line moves in, the rest of the paragraph wraps back to the margin as it continues onto the next line.'), '<w:ind w:firstLine="720"/>'),
    p(r('A hanging indent: the first line starts at the margin and the following lines are pushed in, as in reference lists and glossaries.'), '<w:ind w:left="720" w:hanging="720"/>'),
    H2('2.3 Spacing'),
    p(r('One and a half line spacing gives long passages room to breathe on screen and in print. The extra space shows between the lines of a paragraph that wraps, like this one.'), '<w:spacing w:line="360" w:lineRule="auto"/>'),
    p(r('This paragraph has 18 points of space before it and none after.'), '<w:spacing w:before="360" w:after="0"/>'),
    H2('2.4 Borders and shading'),
    p(r('A boxed note: paragraph borders and shading are kept when the file is saved again.'), '<w:pBdr><w:top w:val="single" w:sz="6" w:space="4" w:color="8EA9DB"/><w:left w:val="single" w:sz="6" w:space="4" w:color="8EA9DB"/><w:bottom w:val="single" w:sz="6" w:space="4" w:color="8EA9DB"/><w:right w:val="single" w:sz="6" w:space="4" w:color="8EA9DB"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F3F6FB"/><w:ind w:left="144" w:right="144"/>'),
    H2('2.5 Right-to-left text'),
    p(r('שלום! זוהי פסקה הנכתבת מימין לשמאל.', '<w:rtl/>'), '<w:bidi/>'),
    p(r('مرحبًا، هذه فقرة تُكتب من اليمين إلى اليسار.', '<w:rtl/>'), '<w:bidi/>'),

    H1('3. Lists'),
    H2('3.1 Bulleted list'),
    bullet('Fruit'),
    bullet('Apples', 1),
    bullet('Pears', 1),
    bullet('Vegetables'),
    bullet('Bread'),
    H2('3.2 Numbered list with levels'),
    numbered('Prepare'),
    numbered('Collect the documents', 1),
    numbered('Signed copies', 2),
    numbered('Drafts', 2),
    numbered('Book a room', 1),
    numbered('Review'),
    numbered('Approve'),
    H2('3.3 Numbering that starts again'),
    numbered('A second list, restarted at one', 0, 4),
    numbered('Its second item', 0, 4),
    H2('3.4 Lettered list'),
    numbered('First choice', 0, 5),
    numbered('Second choice', 0, 5),

    H1('4. Tables'),
    H2('4.1 Table with a header row'),
    table([3120, 2080, 2080, 2080], [
      ['Region', 'Q1', 'Q2', 'Q3'],
      ['North', '1,240', '1,310', '1,402'],
      ['South', '980', '1,045', '1,120'],
      ['West', '1,515', '1,498', '1,630'],
    ]),
    p(''),
    H2('4.2 Merged cells'),
    plainTable([2340, 2340, 2340, 2340], [
      `<w:tr>${cellX(p(r('Merged across two columns', B_), '<w:jc w:val="center"/>'), 4680, '<w:gridSpan w:val="2"/><w:shd w:val="clear" w:color="auto" w:fill="DEEAF6"/>')}${cellX('C', 2340)}${cellX('D', 2340)}</w:tr>`,
      `<w:tr>${cellX(p(r('Merged down two rows', B_)), 2340, '<w:vMerge w:val="restart"/><w:vAlign w:val="center"/><w:shd w:val="clear" w:color="auto" w:fill="E2EFDA"/>')}${cellX('B2', 2340)}${cellX('C2', 2340)}${cellX('D2', 2340)}</w:tr>`,
      `<w:tr>${cellX(p(''), 2340, '<w:vMerge/>')}${cellX('B3', 2340)}${cellX('C3', 2340)}${cellX('D3', 2340)}</w:tr>`,
    ]),
    p(''),
    H2('4.3 A table inside a table'),
    plainTable([3120, 6240], [
      `<w:tr>${cellX('The cell on the right holds a second table.', 3120)}${cellX(`${plainTable([2000, 2000], [`<w:tr>${cellX('Inner A', 2000, '<w:shd w:val="clear" w:color="auto" w:fill="FFF2CC"/>')}${cellX('Inner B', 2000)}</w:tr>`, `<w:tr>${cellX('Inner C', 2000)}${cellX('Inner D', 2000, '<w:shd w:val="clear" w:color="auto" w:fill="FFF2CC"/>')}</w:tr>`])}${p('')}`, 6240)}</w:tr>`,
    ]),
    p(''),
    H2('4.4 Borders, shading and alignment'),
    plainTable([3120, 3120, 3120], [
      `<w:tr><w:trPr><w:trHeight w:val="720"/></w:trPr>${cellX('Top', 3120, '<w:vAlign w:val="top"/>')}${cellX(p(r('Middle'), '<w:jc w:val="center"/>'), 3120, '<w:vAlign w:val="center"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>')}${cellX(p(r('Bottom'), '<w:jc w:val="right"/>'), 3120, '<w:vAlign w:val="bottom"/>')}</w:tr>`,
      `<w:tr>${cellX('Thick red top border', 3120, '<w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="C00000"/></w:tcBorders>')}${cellX('Dashed border', 3120, '<w:tcBorders><w:top w:val="dashed" w:sz="8" w:space="0" w:color="0070C0"/><w:left w:val="dashed" w:sz="8" w:space="0" w:color="0070C0"/><w:bottom w:val="dashed" w:sz="8" w:space="0" w:color="0070C0"/><w:right w:val="dashed" w:sz="8" w:space="0" w:color="0070C0"/></w:tcBorders>')}${cellX('Double bottom border', 3120, '<w:tcBorders><w:bottom w:val="double" w:sz="6" w:space="0" w:color="000000"/></w:tcBorders>')}</w:tr>`,
    ]),

    H1('5. Pictures and text boxes'),
    H2('5.1 Pictures in a line of text'),
    p([r('Small pictures sit in the text like letters: '), inlinePic('red.png', 14, 14, 'Red square'), r(' red, '), inlinePic('blue.png', 14, 14, 'Blue square'), r(' blue, '), inlinePic('green.png', 14, 14, 'Green square'), r(' green and '), inlinePic('orange.png', 14, 14, 'Orange square'), r(' orange.')].join('')),
    H2('5.2 A picture on its own line'),
    p(inlinePic('chart.png', 384, 176, 'Bar chart of four quarterly volumes'), '<w:jc w:val="center"/><w:spacing w:after="60"/>'),
    caption('Figure 1: Volumes by quarter'),
    H2('5.3 A picture with text wrapping around it'),
    p(`${floatPic('badge.png', 120, 120, 'Round green badge')}${r('This picture floats at the right margin and the text wraps around its square. Select it to change the wrapping, rotate or flip it, set its size and position, or describe it for screen readers. Text keeps flowing beside the picture until it reaches the bottom of the picture, and then returns to the full width of the column, the way it does in Word.')}`, '<w:jc w:val="both"/>'),
    p(''),
    H2('5.4 A text box'),
    p(textBox(['Text box', 'Text boxes keep their own text, border and fill.', 'Double-click to change the text.'], 300, 76)),

    H1('6. Review: comments and changes'),
    p(r('This page holds comments from three reviewers and changes made while suggesting. Accept or reject them one by one from the panel, or all at once from the Review menu.')),
    H2('6.1 Comments'),
    p(`${r('The launch plan assumes ')}${cStart(1)}${cStart(2)}${r('two weeks of user testing')}${cEnd(1)}${cEnd(2)}${r(' before the public release.')}`),
    p(`${cStart(3)}${r('Support hours will follow the office calendar')}${cEnd(3)}${r(' until the regional teams are staffed.')}`),
    H2('6.2 Tracked changes'),
    p(`${r('The budget covers ')}${ins(11, B, d2, 'travel, ')}${r('equipment and training.')}`),
    p(`${r('Meetings are held ')}${del(12, A, d1, 'every Monday ')}${r('at the start of each week.')}`),
    p(`${r('Reports are due ')}${del(13, C, d3, 'on the first day')}${ins(14, C, d3, 'within five working days')}${r(' of the month.')}`),
    p(`${r('The deadline is ')}${fmtChange(15, B, d4, 'final', B_)}${r(' and cannot move.')}`),

    H1('7. Notes, links and fields'),
    H2('7.1 Footnotes and endnotes'),
    p(`${r('Footnotes are numbered on the page where they are referenced')}${fn(1)}${r(', and a second one follows here')}${fn(2)}${r('. Endnotes collect after the last paragraph of the document')}${en(1)}${r('.')}`),
    H2('7.2 Links and bookmarks'),
    p(`${r('An outside address: ')}${link('rIdLink', 'example.com')}${r('. A link inside the document: ')}${anchorLink('summary', 'go to the summary')}${r('.')}`),
    p(`<w:bookmarkStart w:id="90" w:name="fields"/>${r('This paragraph is the bookmark “fields”. Open the Bookmarks tab of the navigation pane to jump between bookmarks.')}<w:bookmarkEnd w:id="90"/>`),
    H2('7.3 Fields'),
    p(`${r('This is page ')}${fld('PAGE', '9')}${r(' of ')}${fld('NUMPAGES', '10')}${r('. The footer of every page after the cover uses the same fields.')}`),

    H1('8. Page layout'),
    H2('8.1 Headers and footers'),
    p(r('Every page after the cover has a header with the document name and a footer with the page number. Double-click a header or footer to edit it; its Options menu adds page numbers, sets a different first page, and changes the distance from the edge of the page.')),
    H2('8.2 Columns'),
    p(r('The next part of this page switches to two columns with a line between them, then back to one column.')),
    // End of section 1 (cover to here): cover without header.
    p('', `<w:sectPr><w:headerReference w:type="default" r:id="rIdH1"/><w:footerReference w:type="default" r:id="rIdF1"/>${SZ}<w:cols w:space="720"/><w:titlePg/></w:sectPr>`),
    p(r('Columns are part of a section. Text fills the first column to the bottom of the section and then continues at the top of the next one, like a newspaper. A continuous section break lets columns start halfway down a page without a page break.'), '<w:jc w:val="both"/>'),
    p(r('The section after the columns returns to a single column. Section breaks, columns, margins, page size and orientation are all kept when the document is saved again, and can be changed from Page setup in the File menu.'), '<w:jc w:val="both"/>'),
    p('', `<w:sectPr><w:type w:val="continuous"/>${SZ}<w:cols w:num="2" w:space="720" w:sep="1"/></w:sectPr>`),
    p(`<w:bookmarkStart w:id="91" w:name="summary"/>${r('Summary', B_)}<w:bookmarkEnd w:id="91"/>`, '<w:spacing w:before="240"/>'),
    p(r('That completes the tour. Try editing anything on these pages, switch to Suggesting to track your edits, and export the result as a Word document, a PDF or Markdown.')),
    `<w:sectPr><w:type w:val="continuous"/>${SZ}<w:cols w:space="720"/></w:sectPr>`,
  ];

  // Contents: a TOC field whose entries link to the headings, with page numbers.
  const page = (i) => i + 3;
  let h1 = -1;
  const entries = toc.map((e) => {
    if (e.level === 1) h1++;
    return { ...e, page: page(h1) };
  });
  const tocParas = [
    p(r('Contents'), '<w:pStyle w:val="TOCHeading"/><w:pageBreakBefore/>'),
    ...entries.map((e, i) => {
      const begin = i === 0 ? `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>` : '';
      const end = i === entries.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : '';
      return p(`${begin}<w:hyperlink w:anchor="${e.name}" w:history="1">${r(e.text)}<w:r><w:tab/></w:r>${r(String(e.page))}</w:hyperlink>${end}`, `<w:pStyle w:val="TOC${e.level}"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9350"/></w:tabs>`);
    }),
  ];
  const bodyXml = body.join('').replace('@@TOC@@', tocParas.join(''));

  const cmts = `${DECL}<w:comments ${NS}>
${commentXml(1, A, d1, 'Is two weeks enough for the accessibility checks as well?', '20000001')}
${commentXml(2, B, d2, 'Yes. The accessibility review runs in parallel with the first week.', '20000002')}
${commentXml(3, C, d3, 'Add the weekend support rota once it is agreed.', '20000003')}
</w:comments>`;
  const cmtsEx = `${DECL}<w15:commentsEx ${NS}><w15:commentEx w15:paraId="20000001" w15:done="0"/><w15:commentEx w15:paraId="20000002" w15:paraIdParent="20000001" w15:done="0"/><w15:commentEx w15:paraId="20000003" w15:done="0"/></w15:commentsEx>`;
  const noteX = (kind, id, text) => `<w:${kind} w:id="${id}"><w:p><w:pPr><w:pStyle w:val="${kind === 'footnote' ? 'FootnoteText' : 'EndnoteText'}"/></w:pPr><w:r><w:rPr><w:rStyle w:val="${kind === 'footnote' ? 'FootnoteReference' : 'EndnoteReference'}"/></w:rPr><w:${kind}Ref/></w:r>${run(` ${text}`)}</w:p></w:${kind}>`;
  const fns = `${DECL}<w:footnotes ${NS}>${separators('footnote')}${noteX('footnote', 1, 'A footnote. Click it on the page to change its text.')}${noteX('footnote', 2, 'Footnotes are renumbered when one is added or removed.')}</w:footnotes>`;
  const ens = `${DECL}<w:endnotes ${NS}>${separators('endnote')}${noteX('endnote', 1, 'An endnote, printed after the last paragraph.')}</w:endnotes>`;
  const headerXml = `${DECL}<w:hdr ${NS}>${p(`${r('Folioline', '<w:i/>')}<w:r><w:tab/></w:r><w:r><w:tab/></w:r>${r('Sample document', '<w:b/><w:color w:val="2F5496"/>')}`, '<w:pStyle w:val="Header"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="7F7F7F"/></w:pBdr>')}</w:hdr>`;
  const sampleStyles = exStyles(`
<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="200" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:i/><w:color w:val="44546A"/><w:sz w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TOCHeading"><w:name w:val="TOC Heading"/><w:basedOn w:val="Heading1"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:outlineLvl w:val="9"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:before="100" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TOC2"><w:name w:val="toc 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="220"/></w:pPr><w:rPr><w:sz w:val="19"/></w:rPr></w:style>`);
  const sampleNumbering = exNumbering
    .replace('<w:num w:numId="1">', `<w:abstractNum w:abstractNumId="3"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1">`)
    .replace('</w:numbering>', `<w:num w:numId="4"><w:abstractNumId w:val="2"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>
<w:num w:numId="5"><w:abstractNumId w:val="3"/></w:num>
</w:numbering>`);
  writeFileSync(new URL('sample.docx', EX), pack({
    body: bodyXml,
    headerXml,
    comments: cmts,
    commentsEx: cmtsEx,
    footnotes: fns,
    endnotes: ens,
    media,
    ns: NSX,
    title: 'Folioline Sample Document',
    stylesXml: sampleStyles,
    numberingXml: sampleNumbering,
    extraRels: `<Relationship Id="rIdLink" Type="${RT}/hyperlink" Target="https://example.com/" TargetMode="External"/>`,
  }));
}

// --- 1. Review: an agreement with comments and tracked changes ----------------------------------
{
  const A = 'Maya Okafor', B = 'Lucas Brandt', C = 'Priya Raman';
  const d1 = '2026-09-14T09:12:00Z', d2 = '2026-09-15T15:40:00Z', d3 = '2026-09-18T11:05:00Z';
  const body = [
    p(run('Software Services Agreement'), '<w:pStyle w:val="Title"/><w:jc w:val="center"/>'),
    p(run('Between Harbor Lane Analytics Ltd. and Cedar Point Logistics Inc.'), '<w:pStyle w:val="Subtitle"/>'),
    H('1. Purpose'),
    p(`${run('This agreement sets out how Harbor Lane Analytics (the “Provider”) will design, build and ')}${del(101, B, d2, 'operate ')}${ins(102, B, d2, 'support ')}${run('a shipment forecasting service for Cedar Point Logistics (the “Client”). It replaces the letter of intent dated 2 June 2026.')}`),
    p(`${run('The service will help the Client plan warehouse capacity ')}${cStart(1)}${run('two quarters in advance')}${cEnd(1)}${run(' using order history, carrier schedules and regional demand signals.')}`),
    H('2. Scope of work'),
    bullet('Discovery workshops with the Client’s planning team.'),
    bullet('A forecasting model trained on three years of shipment data.'),
    bullet(`${run('A web dashboard ')}${ins(103, C, d3, 'with role-based access ')}${run('for planners and managers.')}`),
    bullet('Monthly accuracy reports and model retraining.'),
    H('3. Fees and payment'),
    p(`${run('The Client will pay the fees in the schedule below. Invoices are due within ')}${del(104, A, d1, '45')}${ins(105, A, d1, '30')}${run(' days of receipt.')}`),
    table([2600, 1500, 2200, 3060], [
      ['Milestone', 'Fee', 'Due', 'Notes'],
      ['Discovery complete', '15%', 'On acceptance', 'Workshop notes and data inventory'],
      ['Model in pilot', '35%', 'Week 10', 'Pilot with two regional warehouses'],
      ['Dashboard launch', '35%', 'Week 16', 'Includes training sessions'],
      ['First quarter of support', '15%', 'Quarterly', 'Accuracy reports and retraining'],
    ]),
    p(''),
    H('4. Confidentiality'),
    p(`${cStart(2)}${run('Each party will keep the other party’s confidential information secure and use it only to perform this agreement.')}${cEnd(2)}${run(' This obligation lasts for three years after the agreement ends.')}`),
    H('5. Term and termination'),
    p(`${run('The agreement starts on the effective date and runs for twelve months. Either party may end it with ')}${cStart(3)}${run('sixty days’ written notice')}${cEnd(3)}${run('.')}`),
    H('Signatures'),
    table([4680, 4680], [
      ['Harbor Lane Analytics Ltd.', 'Cedar Point Logistics Inc.'],
      ['Name: ______________________', 'Name: ______________________'],
      ['Date: ______________________', 'Date: ______________________'],
    ]),
    SECT(),
  ].join('');
  const cmts = `${DECL}<w:comments ${NS}>
${commentXml(1, C, d3, 'Can we say “up to two quarters”? The pilot data only covers one season.', '10000001')}
${commentXml(4, A, '2026-09-18T13:20:00Z', 'Agreed, I will update the wording before signing.', '10000004')}
${commentXml(2, B, d2, 'Legal asked to keep this clause unchanged from the master template.', '10000002')}
${commentXml(3, A, d1, 'Ninety days was our original position. @Lucas Brandt please confirm.', '10000003')}
</w:comments>`;
  const cmtsEx = `${DECL}<w15:commentsEx ${NS}><w15:commentEx w15:paraId="10000001" w15:done="0"/><w15:commentEx w15:paraId="10000004" w15:paraIdParent="10000001" w15:done="0"/><w15:commentEx w15:paraId="10000002" w15:done="1"/><w15:commentEx w15:paraId="10000003" w15:done="0"/></w15:commentsEx>`;
  // The reply (id 4) shares the anchor of comment 1.
  const bodyWithReply = body.replace(`${cStart(1)}`, `${cStart(1)}${cStart(4)}`).replace(`${cEnd(1)}`, `${cEnd(1)}${cEnd(4)}`);
  writeFileSync(new URL('agreement.docx', EX), pack({ body: bodyWithReply, comments: cmts, commentsEx: cmtsEx, title: 'Software Services Agreement', header: 'Software Services Agreement' }));
}

// --- 2. Templating: content controls to fill ----------------------------------------------------
{
  let fid = 2000;
  const field = (tag, alias, value) => `<w:sdt><w:sdtPr><w:alias w:val="${alias}"/><w:tag w:val="${tag}"/><w:id w:val="${++fid}"/><w:text/></w:sdtPr><w:sdtContent>${run(value)}</w:sdtContent></w:sdt>`;
  const body = [
    p(run('Consulting Agreement'), '<w:pStyle w:val="Title"/>'),
    p(`${run('Effective date: ', '<w:b/>')}${field('effective_date', 'Effective Date', 'October 1, 2026')}`),
    p(`${run('This Consulting Agreement is made between ')}${field('client_name', 'Client Name', 'Northwind Traders')}${run(' (the “Client”) and ')}${field('consultant_name', 'Consultant Name', 'Rivera & Stone Consulting')}${run(' (the “Consultant”).')}`),
    H('1. Services'),
    p(`${run('The Consultant will deliver the project ')}${field('project_name', 'Project Name', 'Supply Chain Review')}${run(' as described below.')}`),
    table([3000, 6360], [
      ['Item', 'Detail'],
      ['Project', `${p(field('project_name', 'Project Name', 'Supply Chain Review'))}`],
      ['Start date', `${p(field('start_date', 'Start Date', 'October 15, 2026'))}`],
      ['Completion date', `${p(field('end_date', 'Completion Date', 'January 31, 2027'))}`],
      ['Fee', `${p(field('fee', 'Fee', 'USD 48,000'))}`],
    ]),
    p(''),
    H('2. Payment'),
    p(`${run('The Client will pay ')}${field('fee', 'Fee', 'USD 48,000')}${run(' in three equal instalments. Invoices are payable within 30 days.')}`),
    H('3. Contacts'),
    p(`${run('Notices to the Client go to ')}${field('client_contact', 'Client Contact', 'Jordan Ellis, Head of Operations')}${run('. Notices to the Consultant go to ')}${field('consultant_contact', 'Consultant Contact', 'Ana Rivera, Partner')}${run('.')}`),
    H('4. Signatures'),
    p(`${run('Signed for ')}${field('client_name', 'Client Name', 'Northwind Traders')}${run(': ______________________')}`),
    p(`${run('Signed for ')}${field('consultant_name', 'Consultant Name', 'Rivera & Stone Consulting')}${run(': ______________________')}`),
    SECT(),
  ].join('');
  writeFileSync(new URL('template.docx', EX), pack({ body, title: 'Consulting Agreement', header: 'Consulting Agreement (template)' }));
}

// --- 3. A long report (about 300 pages) ----------------------------------------------------------
{
  const topics = ['warehouse capacity', 'carrier performance', 'customer demand', 'inventory turnover', 'transport costs', 'returns handling', 'staff scheduling', 'energy use', 'safety incidents', 'supplier lead times'];
  const sentence = (i, j) => `In period ${i + 1}.${j + 1}, ${topics[(i + j) % topics.length]} changed as the network adjusted to seasonal volumes, and the operations team recorded the effect on service levels, cost per order and planning accuracy across every region. `;
  let noteId = 0;
  const notes = [];
  const parts = [p(run('Annual Operations Report'), '<w:pStyle w:val="Title"/>'), p(run('Fiscal year 2026 — internal edition'), '<w:pStyle w:val="Subtitle"/>')];
  for (let ch = 0; ch < 165; ch++) {
    parts.push(H(`Chapter ${ch + 1}: ${topics[ch % topics.length][0].toUpperCase()}${topics[ch % topics.length].slice(1)}`));
    for (let k = 0; k < 9; k++) {
      let content = run(sentence(ch, k).repeat(2 + (k % 3)));
      if (k === 4) {
        noteId++;
        notes.push(`<w:footnote w:id="${noteId}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>${run(` Source: regional operations dashboard, chapter ${ch + 1}.`)}</w:p></w:footnote>`);
        content += `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${noteId}"/></w:r>`;
      }
      parts.push(p(content));
      if (k === 6) parts.push(table([3120, 3120, 3120], [['Measure', 'Target', 'Result'], ['On-time delivery', '96%', `${90 + (ch % 9)}%`], ['Cost per order', 'USD 4.10', `USD ${(3.8 + (ch % 7) / 10).toFixed(2)}`], ['Forecast error', '8%', `${6 + (ch % 5)}%`]]), p(''));
    }
  }
  parts.push(SECT());
  const fns = `${DECL}<w:footnotes ${NS}>${separators('footnote')}${notes.join('')}</w:footnotes>`;
  writeFileSync(new URL('long-report.docx', EX), pack({ body: parts.join(''), footnotes: fns, title: 'Annual Operations Report', header: 'Annual Operations Report 2026' }));
}

// --- 4. Tables & columns ------------------------------------------------------------------------
{
  // A simple site plan drawn pixel by pixel.
  const W = 560, Hh = 260;
  const plan = png(W, Hh, (x, y) => {
    const line = (v, a) => Math.abs(v - a) < 1.5;
    const inRect = (x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    const edge = (x0, y0, x1, y1) => inRect(x0, y0, x1, y1) && (line(x, x0) || line(x, x1) || line(y, y0) || line(y, y1));
    if (edge(20, 20, 540, 240) || edge(60, 60, 250, 210) || edge(290, 60, 500, 140) || edge(290, 160, 500, 210)) return [31, 56, 100];
    if (inRect(60, 60, 250, 210) && (x + y) % 18 === 0) return [143, 169, 219];
    if (inRect(290, 60, 500, 140)) return [232, 238, 250];
    if (inRect(290, 160, 500, 210)) return [255, 242, 204];
    if (y > 228 && y < 236 && x > 30 && x < 530 && x % 24 < 12) return [120, 120, 120];
    return [255, 255, 255];
  });
  const cols2 = `<w:sectPr><w:type w:val="continuous"/>${pgSz}<w:cols w:num="2" w:sep="1" w:space="540"/></w:sectPr>`;
  const merged = `<w:tbl><w:tblPr><w:tblStyle w:val="ScheduleTable"/><w:tblW w:w="9360" w:type="dxa"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="2340"/><w:gridCol w:w="2340"/><w:gridCol w:w="2340"/><w:gridCol w:w="2340"/></w:tblGrid>
<w:tr><w:trPr><w:tblHeader/></w:trPr>${tc('Building', 2340)}${tc('Level', 2340)}${tc('Use', 2340)}${tc('Area (m²)', 2340)}</w:tr>
<w:tr>${tc('North hall', 2340, '<w:vMerge w:val="restart"/><w:vAlign w:val="center"/>')}${tc('Ground', 2340)}${tc('Loading docks', 2340)}${tc('1,850', 2340)}</w:tr>
<w:tr>${tc('', 2340, '<w:vMerge/>')}${tc('First', 2340)}${tc('Offices', 2340)}${tc('920', 2340)}</w:tr>
<w:tr>${tc('South hall', 2340, '<w:vMerge w:val="restart"/><w:vAlign w:val="center"/>')}${tc('Ground', 2340)}${tc('Cold storage', 2340, '<w:shd w:val="clear" w:color="auto" w:fill="DDEBF7"/>')}${tc('1,240', 2340)}</w:tr>
<w:tr>${tc('', 2340, '<w:vMerge/>')}${tc('First', 2340)}${tc('Packing', 2340)}${tc('1,100', 2340)}</w:tr>
<w:tr>${tc('Total floor area', 7020, '<w:gridSpan w:val="3"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>')}${tc('5,110', 2340, '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>')}</w:tr>
</w:tbl>`;
  const lorem2 = 'The site is organised so that inbound and outbound flows never cross. Trucks enter from the east gate, unload at the north hall and leave through the south lane, while staff parking and the visitor entrance stay on the west side. ';
  const body = [
    p(`<w:r>${drawing('rIdMedia1', 5334000, 2476500, 1, 'Site plan').replace('Gradient test image', 'Site plan of the distribution centre')}</w:r>`, '<w:jc w:val="center"/>'),
    p(run('Distribution Centre Lease Summary'), '<w:pStyle w:val="Title"/><w:jc w:val="center"/>'),
    p(run('Prepared for the facilities committee.'), `<w:pStyle w:val="Subtitle"/><w:sectPr>${pgSz}<w:cols w:space="720"/></w:sectPr>`),
    H('Site overview', 2),
    p(run(lorem2.repeat(2)), '<w:jc w:val="both"/>'),
    H('Access and parking', 2),
    p(`${run('Access is controlled at both gates. The lease includes 120 parking spaces, of which ')}${del(201, 'Tomás Ferreira', '2026-09-20T10:00:00Z', '20')}${ins(202, 'Tomás Ferreira', '2026-09-20T10:00:00Z', '24')}${run(' are reserved for electric vehicles.')}`, '<w:jc w:val="both"/>'),
    p(run(lorem2.repeat(2)), '<w:jc w:val="both"/>'),
    H('Maintenance', 2),
    p(run(lorem2.repeat(3)), `<w:jc w:val="both"/>${cols2}`),
    H('Space schedule'),
    merged,
    p(''),
    H('Rent schedule'),
    table([2340, 2340, 2340, 2340], [['Year', 'Base rent', 'Service charge', 'Total'], ['2027', 'EUR 412,000', 'EUR 38,500', 'EUR 450,500'], ['2028', 'EUR 424,360', 'EUR 39,600', 'EUR 463,960'], ['2029', 'EUR 437,090', 'EUR 40,800', 'EUR 477,890']]),
    SECT(),
  ].join('');
  writeFileSync(new URL('tables-columns.docx', EX), pack({ body, media: { 'plan.png': plan }, title: 'Distribution Centre Lease Summary', header: 'Lease summary' }));
}

// --- 5. International & RTL ---------------------------------------------------------------------
{
  const rtl = (text) => p(`<w:r><w:rPr><w:rtl/></w:rPr>${t(text)}</w:r>`, '<w:bidi/>');
  const label = (text) => p(run(text, '<w:b/><w:color w:val="1F3864"/>'), '<w:spacing w:before="200" w:after="40"/>');
  const rtlTable = `<w:tbl><w:tblPr><w:bidiVisual/><w:tblStyle w:val="ScheduleTable"/><w:tblW w:w="9360" w:type="dxa"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="3600"/><w:gridCol w:w="2880"/><w:gridCol w:w="2880"/></w:tblGrid>
<w:tr><w:trPr><w:tblHeader/></w:trPr>${['الخدمة', 'الوحدة', 'السعر'].map((c) => `<w:tc><w:tcPr><w:tcW w:w="2880" w:type="dxa"/></w:tcPr>${rtl(c)}</w:tc>`).join('')}</w:tr>
<w:tr>${['ترجمة المستندات', 'لكل صفحة', '١٢٠'].map((c) => `<w:tc><w:tcPr><w:tcW w:w="2880" w:type="dxa"/></w:tcPr>${rtl(c)}</w:tc>`).join('')}</w:tr>
<w:tr>${['مراجعة العقود', 'لكل ساعة', '٣٥٠'].map((c) => `<w:tc><w:tcPr><w:tcW w:w="2880" w:type="dxa"/></w:tcPr>${rtl(c)}</w:tc>`).join('')}</w:tr>
</w:tbl>`;
  const body = [
    p(run('Multilingual Service Notice'), '<w:pStyle w:val="Title"/>'),
    p(run('The same notice in several scripts, including right-to-left languages.'), '<w:pStyle w:val="Subtitle"/><w:jc w:val="left"/>'),
    label('English'),
    p(run('Our support desk is open every weekday. Requests received after six in the evening are answered the next morning.')),
    label('العربية (Arabic)'),
    rtl('مكتب الدعم مفتوح في جميع أيام العمل. يتم الرد على الطلبات التي تصل بعد السادسة مساءً في صباح اليوم التالي.'),
    label('עברית (Hebrew)'),
    rtl('מוקד התמיכה פתוח בכל ימי העבודה. פניות שמתקבלות אחרי שש בערב נענות בבוקר שלמחרת.'),
    label('فارسی (Persian)'),
    rtl('میز پشتیبانی در همه روزهای کاری باز است. درخواست‌هایی که پس از ساعت شش عصر برسند صبح روز بعد پاسخ داده می‌شوند.'),
    label('中文 (Chinese)'),
    p(run('我们的客服中心在每个工作日开放。晚上六点以后收到的请求将在第二天上午回复。')),
    label('日本語 (Japanese)'),
    p(run('サポート窓口は平日毎日営業しています。午後六時以降に受け付けたお問い合わせには翌朝回答いたします。')),
    label('한국어 (Korean)'),
    p(run('고객 지원 센터는 평일에 운영됩니다. 오후 여섯 시 이후에 접수된 요청은 다음 날 아침에 답변드립니다.')),
    label('Ελληνικά (Greek)'),
    p(run('Το γραφείο υποστήριξης είναι ανοιχτό κάθε εργάσιμη ημέρα. Τα αιτήματα μετά τις έξι το απόγευμα απαντώνται το επόμενο πρωί.')),
    label('Русский (Russian)'),
    p(run('Служба поддержки работает в будние дни. На запросы, полученные после шести вечера, мы отвечаем на следующее утро.')),
    label('Price list (right-to-left table)'),
    rtlTable,
    p(''),
    SECT(),
  ].join('');
  writeFileSync(new URL('international.docx', EX), pack({ body, title: 'Multilingual Service Notice', header: 'Multilingual notice' }));
}

// --- 6. Formatting: styles, lists, notes, links and bookmarks -----------------------------------
{
  const fn = (id) => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
  const en = (id) => `<w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteReference w:id="${id}"/></w:r>`;
  const body = [
    p(run('Style and Formatting Sampler'), '<w:pStyle w:val="Title"/>'),
    p(run('A tour of the formatting this editor reads, edits and writes back.'), '<w:pStyle w:val="Subtitle"/><w:jc w:val="left"/>'),
    H('Character formatting'),
    p([run('Regular, '), run('bold', '<w:b/>'), run(', '), run('italic', '<w:i/>'), run(', '), run('underlined', '<w:u w:val="single"/>'), run(', '), run('double underline', '<w:u w:val="double"/>'), run(', '), run('struck', '<w:strike/>'), run(', '), run('small caps', '<w:smallCaps/>'), run(', H'), run('2', '<w:vertAlign w:val="subscript"/>'), run('O and x'), run('2', '<w:vertAlign w:val="superscript"/>'), run('.')].join('')),
    p([run('Colours: '), run('teal', '<w:color w:val="0E7C7B"/>'), run(', '), run('crimson', '<w:color w:val="B4233C"/>'), run(', '), run('highlighted', '<w:highlight w:val="yellow"/>'), run(', '), run('shaded', '<w:shd w:val="clear" w:color="auto" w:fill="E2EFDA"/>'), run('. Fonts: '), run('Georgia', '<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/>'), run(', '), run('Courier New', '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>'), run(', '), run('Times New Roman 14', '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="28"/>'), run('.')].join('')),
    H('Paragraphs'),
    p(run('Centred paragraph with extra spacing before and after.'), '<w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/>'),
    p(run('Right-aligned paragraph.'), '<w:jc w:val="right"/>'),
    p(run('Justified paragraph with a first-line indent. The text is long enough to wrap over several lines so the justification and the indent are both visible on the page, as they would be in a printed report.'), '<w:jc w:val="both"/><w:ind w:firstLine="720"/>'),
    p(run('Double-spaced paragraph showing a larger line height across the wrapped lines of text in this sample paragraph.'), '<w:spacing w:line="480" w:lineRule="auto"/>'),
    p(run('A quotation in the Quote style.'), '<w:pStyle w:val="Quote"/>'),
    H('Lists'),
    numbered('Planning'),
    numbered('Collect requirements', 1),
    numbered('Interview stakeholders', 2),
    numbered('Review existing reports', 2),
    numbered('Agree the scope', 1),
    numbered('Delivery'),
    numbered('Build and test', 1),
    bullet('Bulleted item'),
    bullet('Nested bullet', 1),
    bullet('Another bulleted item'),
    H('Notes, links and bookmarks'),
    p(`${run('Footnotes appear at the bottom of the page')}${fn(1)}${run(' and endnotes after the text')}${en(1)}${run('. A second footnote is here')}${fn(2)}${run('.')}`),
    p(`${run('Visit ')}<w:hyperlink r:id="rIdLink" w:history="1">${run('example.com', '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>${run(' or jump to the ')}<w:hyperlink w:anchor="closing" w:history="1">${run('closing section', '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>${run('.')}`),
    p(`${run('Before a page break.')}<w:r><w:br w:type="page"/></w:r>`),
    p(`<w:bookmarkStart w:id="5" w:name="closing"/>${run('Closing section')}<w:bookmarkEnd w:id="5"/>`, '<w:pStyle w:val="Heading1"/>'),
    p(run('This page starts after a manual page break. Its heading carries the bookmark “closing” that the link above points to.')),
    SECT(),
  ].join('');
  const noteX = (kind, id, text) => `<w:${kind} w:id="${id}"><w:p><w:pPr><w:pStyle w:val="${kind === 'footnote' ? 'FootnoteText' : 'EndnoteText'}"/></w:pPr><w:r><w:rPr><w:rStyle w:val="${kind === 'footnote' ? 'FootnoteReference' : 'EndnoteReference'}"/></w:rPr><w:${kind}Ref/></w:r>${run(` ${text}`)}</w:p></w:${kind}>`;
  const fns = `${DECL}<w:footnotes ${NS}>${separators('footnote')}${noteX('footnote', 1, 'A footnote attached to the first sentence.')}${noteX('footnote', 2, 'Click a note on the page to edit its text.')}</w:footnotes>`;
  const ens = `${DECL}<w:endnotes ${NS}>${separators('endnote')}${noteX('endnote', 1, 'An endnote, listed after the last paragraph.')}</w:endnotes>`;
  writeFileSync(new URL('formatting.docx', EX), pack({ body, footnotes: fns, endnotes: ens, title: 'Style and Formatting Sampler', header: 'Formatting sampler', extraRels: `<Relationship Id="rIdLink" Type="${RT}/hyperlink" Target="https://example.com/" TargetMode="External"/>` }));
}

console.log('examples written to', EX.pathname);
