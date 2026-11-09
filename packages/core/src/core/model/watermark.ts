/**
 * Watermarks. Word stores a watermark as a VML shape anchored in the header of each section
 * (a text path for text watermarks, an image for picture watermarks). The shape is kept as an
 * opaque run in the header; the editor paints the watermark behind every page.
 */
import type { Node as PMNode } from 'prosemirror-model';
import { schema } from './schema';
import { attr, child, findFirst, parseFragment } from '../xml/xml';

export interface TextWatermark {
  kind: 'text';
  text: string;
  font: string;
  /** Point size, or auto to fill the page. */
  size: number | 'auto';
  bold: boolean;
  italic: boolean;
  /** RRGGBB */
  color: string;
  /** 0 (opaque) to 100. */
  transparency: number;
  layout: 'diagonal' | 'horizontal';
}

export interface PictureWatermark {
  kind: 'picture';
  mediaPath: string;
  /** Percent of the natural size, or auto to fit the page width. */
  scale: number | 'auto';
  washout: boolean;
  /** Natural size in points (when known). */
  width?: number;
  height?: number;
}

export type Watermark = TextWatermark | PictureWatermark;

export const WATERMARK_PRESETS = ['ASAP', 'CONFIDENTIAL', 'COPY', 'DO NOT COPY', 'DRAFT', 'ORIGINAL', 'PERSONAL', 'SAMPLE', 'TOP SECRET', 'URGENT'];
export const WATERMARK_SIZES = [36, 40, 44, 48, 54, 60, 66, 72, 80, 90, 96, 105, 120, 144];
export const WATERMARK_SCALES = [50, 100, 150, 200, 500];

export const DEFAULT_TEXT_WATERMARK: TextWatermark = {
  kind: 'text',
  text: 'DRAFT',
  font: 'Calibri',
  size: 'auto',
  bold: false,
  italic: false,
  color: 'C0C0C0',
  transparency: 50,
  layout: 'diagonal',
};

/** Label of the opaque run that carries a watermark shape. */
export const WATERMARK_LABEL = 'Watermark';

const VML_COLORS: Record<string, string> = {
  silver: 'C0C0C0', gray: '808080', black: '000000', white: 'FFFFFF', red: 'FF0000', blue: '0000FF', green: '008000', yellow: 'FFFF00', navy: '000080', maroon: '800000', teal: '008080', olive: '808000', purple: '800080', lime: '00FF00', aqua: '00FFFF', fuchsia: 'FF00FF',
};

function vmlColor(v: string | undefined): string {
  if (!v) return 'C0C0C0';
  const m = /#?([0-9a-f]{6})/i.exec(v);
  if (m) return m[1].toUpperCase();
  return VML_COLORS[v.trim().toLowerCase().split(/\s/)[0]] ?? 'C0C0C0';
}

function styleValue(style: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i').exec(style);
  return m?.[1].trim();
}

function points(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = /^([\d.]+)\s*(pt|px|in|cm|mm)?$/.exec(v);
  if (!m) return undefined;
  const n = Number(m[1]);
  switch (m[2]) {
    case 'in': return n * 72;
    case 'cm': return (n / 2.54) * 72;
    case 'mm': return (n / 25.4) * 72;
    case 'px': return n * 0.75;
    default: return n;
  }
}

/** Whether VML content (a w:pict) is a Word watermark shape. */
export function isWatermarkPict(xml: string): boolean {
  return /PowerPlusWaterMarkObject|WordPictureWatermark/.test(xml) || (/v:textpath/.test(xml) && /rotation:\s*315|mso-position-horizontal:\s*center/.test(xml));
}

/**
 * Read a watermark from its VML. A picture watermark names its image as `media:<path>`;
 * `mediaOf` resolves any other r:id of the shape's part to a media path.
 */
export function parseWatermark(xml: string, mediaOf: (rid: string) => string | null = () => null): Watermark | null {
  let root;
  try {
    root = parseFragment(xml);
  } catch {
    return null;
  }
  const shape = findFirst(root, 'v:shape');
  if (!shape) return null;
  const style = attr(shape, 'style') ?? '';
  const textpath = child(shape, 'v:textpath') ?? findFirst(shape, 'v:textpath');
  if (textpath) {
    const tpStyle = attr(textpath, 'style') ?? '';
    const font = (styleValue(tpStyle, 'font-family') ?? 'Calibri').replace(/^["']|["']$/g, '').replace(/&quot;/g, '');
    const fontSize = points(styleValue(tpStyle, 'font-size'));
    const fill = child(shape, 'v:fill');
    const opacity = Number((attr(fill, 'opacity') ?? '1').replace(/f$/, ''));
    const op = attr(fill, 'opacity')?.endsWith('f') ? opacity / 65536 : opacity;
    const rotation = Number(styleValue(style, 'rotation') ?? '0');
    return {
      kind: 'text',
      text: attr(textpath, 'string') ?? '',
      font: font || 'Calibri',
      size: fontSize && fontSize > 1 ? Math.round(fontSize) : 'auto',
      bold: /font-weight:\s*bold/i.test(tpStyle),
      italic: /font-style:\s*italic/i.test(tpStyle),
      color: vmlColor(attr(shape, 'fillcolor')),
      transparency: Math.round(Math.max(0, Math.min(1, 1 - (Number.isFinite(op) ? op : 1))) * 100),
      layout: Math.abs(((rotation % 360) + 360) % 360 - 315) < 1 || Math.abs(rotation + 45) < 1 ? 'diagonal' : 'horizontal',
    };
  }
  const imagedata = child(shape, 'v:imagedata') ?? findFirst(shape, 'v:imagedata');
  const rid = attr(imagedata, 'r:id');
  const media = rid ? (rid.startsWith('media:') ? rid.slice(6) : mediaOf(rid)) : null;
  if (!media) return null;
  const w = points(styleValue(style, 'width'));
  const h = points(styleValue(style, 'height'));
  return { kind: 'picture', mediaPath: media, scale: 'auto', washout: !!attr(imagedata, 'gain') || !!attr(imagedata, 'blacklevel'), width: w, height: h };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Size of a text watermark shape in points, for a margin box of `boxW` points. */
export function textWatermarkBox(w: TextWatermark, boxW: number, boxH: number): { width: number; height: number } {
  const n = Math.max(1, [...w.text].length);
  if (w.size === 'auto') {
    // Fill the box along the diagonal (or across for horizontal text).
    const span = w.layout === 'diagonal' ? Math.hypot(boxW, boxH) * 0.78 : boxW * 0.92;
    const width = Math.min(span, n * 0.62 * 400);
    return { width, height: Math.max(20, Math.min(width / (n * 0.62), boxH)) };
  }
  return { width: w.size * n * 0.62, height: w.size };
}

/**
 * VML for a watermark (a w:pict run), as a fragment with the canonical prefixes. Picture
 * watermarks reference their image as `media:<path>`, which the exporter turns into a
 * relationship of the header part.
 */
export function watermarkXml(w: Watermark, seq: number, boxW = 468, boxH = 648): string {
  const pos = 'mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin';
  if (w.kind === 'text') {
    const { width, height } = textWatermarkBox(w, boxW, boxH);
    const rot = w.layout === 'diagonal' ? 'rotation:315;' : '';
    const font = `font-family:&quot;${esc(w.font)}&quot;;font-size:${w.size === 'auto' ? 1 : w.size}pt${w.bold ? ';font-weight:bold' : ''}${w.italic ? ';font-style:italic' : ''}`;
    const opacity = Math.max(0, Math.min(1, 1 - w.transparency / 100));
    return `<w:pict><v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e"><v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas><v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="t"/><v:handles><v:h position="#0,bottomRight" xrange="6629,14971"/></v:handles><o:lock v:ext="edit" text="t" shapetype="t"/></v:shapetype><v:shape id="PowerPlusWaterMarkObject${seq}" o:spid="_x0000_s${2049 + seq}" type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:${width.toFixed(1)}pt;height:${height.toFixed(1)}pt;${rot}z-index:-251657216;${pos}" o:allowincell="f" fillcolor="#${w.color}" stroked="f"><v:fill opacity="${opacity.toFixed(2)}"/><v:textpath style="${font}" string="${esc(w.text)}"/><w10:wrap anchorx="margin" anchory="margin"/></v:shape></w:pict>`;
  }
  const nat = { width: w.width ?? boxW, height: w.height ?? boxW * 0.66 };
  const k = w.scale === 'auto' ? Math.min(boxW / nat.width, boxH / nat.height) : w.scale / 100;
  const washout = w.washout ? ' gain="19661f" blacklevel="22938f"' : '';
  return `<w:pict><v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f"><v:stroke joinstyle="miter"/><v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/><o:lock v:ext="edit" aspectratio="t"/></v:shapetype><v:shape id="WordPictureWatermark${seq}" o:spid="_x0000_s${2049 + seq}" type="#_x0000_t75" style="position:absolute;margin-left:0;margin-top:0;width:${(nat.width * k).toFixed(1)}pt;height:${(nat.height * k).toFixed(1)}pt;z-index:-251657216;${pos}" o:allowincell="f"><v:imagedata r:id="media:${esc(w.mediaPath)}" o:title=""${washout}/></v:shape></w:pict>`;
}

/** The watermark carried by a header document, if any. */
export function findWatermark(doc: PMNode): { node: PMNode; pos: number } | null {
  let found: { node: PMNode; pos: number } | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type === schema.nodes.opaque_inline && node.attrs.label === WATERMARK_LABEL) {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found;
}

/** A header document with its watermark replaced (or removed when `xml` is null). */
export function withWatermark(doc: PMNode, xml: string | null, part: string): PMNode {
  const blocks: PMNode[] = [];
  let placed = false;
  doc.forEach((block) => {
    if (block.isTextblock) {
      const kids: PMNode[] = [];
      block.forEach((n) => {
        if (!(n.type === schema.nodes.opaque_inline && n.attrs.label === WATERMARK_LABEL)) kids.push(n);
      });
      if (xml && !placed) {
        kids.unshift(schema.nodes.opaque_inline.create({ xml, label: WATERMARK_LABEL, part }));
        placed = true;
      }
      blocks.push(block.type.create(block.attrs, kids, block.marks));
    } else blocks.push(block);
  });
  if (xml && !placed) blocks.unshift(schema.nodes.paragraph.create({ styleId: 'Header' }, [schema.nodes.opaque_inline.create({ xml, label: WATERMARK_LABEL, part })]));
  return doc.type.create(doc.attrs, blocks);
}
