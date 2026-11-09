/**
 * Text boxes: a DrawingML shape (wps) with a VML fallback for older readers, kept as an opaque
 * run. The editor shows the text of the box and edits its text, size and border as a whole.
 */
import { attr, child, el, elements, type XmlElement, findAll, findFirst, parseFragment, serializeNode, textContent, txt } from '../xml/xml';

export const TEXTBOX_LABEL = 'Text box';

export interface TextBoxInfo {
  text: string;
  /** EMU */
  width: number;
  height: number;
  border: boolean;
}

const EMU_PER_PT = 12700;

function paragraphs(text: string): XmlElement[] {
  return text.split('\n').map((line) => el('w:p', {}, [el('w:r', {}, [el('w:t', { 'xml:space': 'preserve' }, [txt(line)])])]));
}

function lines(content: XmlElement): string {
  return elements(content).filter((e) => e.name === 'w:p').map((p) => findAll(p, 'w:t').map(textContent).join('')).join('\n');
}

/** Whether drawing XML holds a text box. */
export function isTextBoxXml(xml: string): boolean {
  return /wps:txbx|v:textbox/.test(xml) && /w:txbxContent/.test(xml);
}

/** Text, size and border of a text box. */
export function textBoxInfo(xml: string): TextBoxInfo {
  const x = parseFragment(xml);
  const content = findFirst(x, 'w:txbxContent');
  const extent = findFirst(x, 'wp:extent');
  const ln = findFirst(x, 'a:ln');
  return {
    text: content ? lines(content) : '',
    width: Number(attr(extent, 'cx') ?? 1828800),
    height: Number(attr(extent, 'cy') ?? 914400),
    border: !ln || !child(ln, 'a:noFill'),
  };
}

/** Fill and outline colours of a text box, for display (outline null: none). */
export function textBoxLook(xml: string): { fill?: string; line?: string | null } {
  const sp = /<wps:spPr>([\s\S]*?)<\/wps:spPr>/.exec(xml)?.[1] ?? '';
  const ln = /<a:ln\b[^>]*?(?:\/>|>([\s\S]*?)<\/a:ln>)/.exec(sp);
  const fill = /<a:solidFill>\s*<a:srgbClr val="([0-9A-Fa-f]{6})"/.exec(sp.replace(/<a:ln\b[\s\S]*?(?:<\/a:ln>|\/>)/, ''))?.[1];
  let line: string | null | undefined;
  if (ln?.[1] !== undefined) line = /<a:noFill\/>/.test(ln[1]) ? null : /<a:srgbClr val="([0-9A-Fa-f]{6})"/.exec(ln[1])?.[1];
  return { fill: fill?.toUpperCase(), line: typeof line === 'string' ? line.toUpperCase() : line };
}

/** Plain text shown for a text box in the page. */
export function textBoxText(xml: string): string {
  try {
    return textBoxInfo(xml).text;
  } catch {
    return '';
  }
}

/** A new text box (mc:AlternateContent with the wps shape and a VML fallback). */
export function textBoxXml(info: TextBoxInfo, seq = 1): string {
  const cx = Math.max(EMU_PER_PT * 18, Math.round(info.width));
  const cy = Math.max(EMU_PER_PT * 12, Math.round(info.height));
  const line = info.border
    ? el('a:ln', { w: 6350 }, [el('a:solidFill', {}, [el('a:prstClr', { val: 'black' })])])
    : el('a:ln', {}, [el('a:noFill')]);
  const wsp = el('wps:wsp', {}, [
    el('wps:cNvSpPr', { txBox: 1 }),
    el('wps:spPr', {}, [
      el('a:xfrm', {}, [el('a:off', { x: 0, y: 0 }), el('a:ext', { cx, cy })]),
      el('a:prstGeom', { prst: 'rect' }, [el('a:avLst')]),
      el('a:solidFill', {}, [el('a:schemeClr', { val: 'lt1' })]),
      line,
    ]),
    el('wps:txbx', {}, [el('w:txbxContent', {}, paragraphs(info.text))]),
    el('wps:bodyPr', { rot: 0, vert: 'horz', wrap: 'square', lIns: 91440, tIns: 45720, rIns: 91440, bIns: 45720, anchor: 't', anchorCtr: 0 }, [el('a:noAutofit')]),
  ]);
  const drawing = el('w:drawing', {}, [
    el('wp:inline', { distT: 0, distB: 0, distL: 0, distR: 0 }, [
      el('wp:extent', { cx, cy }),
      el('wp:effectExtent', { l: 0, t: 0, r: 0, b: 0 }),
      el('wp:docPr', { id: seq, name: `Text Box ${seq}` }),
      el('wp:cNvGraphicFramePr'),
      el('a:graphic', {}, [el('a:graphicData', { uri: 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape' }, [wsp])]),
    ]),
  ]);
  const wPt = (cx / EMU_PER_PT).toFixed(1);
  const hPt = (cy / EMU_PER_PT).toFixed(1);
  const vml = el('w:pict', {}, [
    el('v:shapetype', { id: '_x0000_t202', coordsize: '21600,21600', 'o:spt': 202, path: 'm,l,21600r21600,l21600,xe' }, [
      el('v:stroke', { joinstyle: 'miter' }),
      el('v:path', { gradientshapeok: 't', 'o:connecttype': 'rect' }),
    ]),
    el('v:shape', { id: `Text Box ${seq}`, 'o:spid': '', type: '#_x0000_t202', style: `width:${wPt}pt;height:${hPt}pt;mso-position-horizontal-relative:char;mso-position-vertical-relative:line`, fillcolor: 'white', stroked: info.border ? 't' : 'f', strokeweight: '.5pt' }, [
      el('v:textbox', {}, [el('w:txbxContent', {}, paragraphs(info.text))]),
    ]),
  ]);
  const ac = el('mc:AlternateContent', {}, [
    el('mc:Choice', { Requires: 'wps' }, [drawing]),
    el('mc:Fallback', {}, [vml]),
  ]);
  return serializeNode(ac);
}

/** The XML of a text box with new text, size and border (other properties kept). */
export function updateTextBoxXml(xml: string, info: TextBoxInfo): string {
  const x = parseFragment(xml);
  const cx = Math.max(EMU_PER_PT * 18, Math.round(info.width));
  const cy = Math.max(EMU_PER_PT * 12, Math.round(info.height));
  for (const content of findAll(x, 'w:txbxContent')) {
    const first = elements(content).find((e) => e.name === 'w:p');
    const pPr = first ? child(first, 'w:pPr') : undefined;
    const rPr = first ? findFirst(first, 'w:rPr') : undefined;
    content.children = paragraphs(info.text).map((p) => {
      if (pPr) p.children.unshift(JSON.parse(JSON.stringify(pPr)) as XmlElement);
      if (rPr) for (const r of elements(p).filter((e) => e.name === 'w:r')) r.children.unshift(JSON.parse(JSON.stringify(rPr)) as XmlElement);
      return p;
    });
  }
  for (const e of [...findAll(x, 'wp:extent'), ...findAll(x, 'a:ext')]) {
    if (e.attrs.cx !== undefined) {
      e.attrs.cx = String(cx);
      e.attrs.cy = String(cy);
    }
  }
  for (const shape of findAll(x, 'v:shape')) {
    shape.attrs.style = (shape.attrs.style ?? '').replace(/width:[^;]+/, `width:${(cx / EMU_PER_PT).toFixed(1)}pt`).replace(/height:[^;]+/, `height:${(cy / EMU_PER_PT).toFixed(1)}pt`);
    shape.attrs.stroked = info.border ? 't' : 'f';
  }
  for (const sp of findAll(x, 'wps:spPr')) {
    const i = sp.children.findIndex((c) => c.type === 'element' && c.name === 'a:ln');
    const line = info.border
      ? el('a:ln', { w: 6350 }, [el('a:solidFill', {}, [el('a:prstClr', { val: 'black' })])])
      : el('a:ln', {}, [el('a:noFill')]);
    if (i >= 0) sp.children[i] = line;
    else sp.children.push(line);
  }
  return serializeNode(x);
}
