/** What the dialogs of the official interfaces share: their lists, units and number fields. */
import { version } from '../../package.json';
import { EMU_PER_INCH, TWIPS_PER_INCH } from '../core/ooxml/units';
import type { MarkupColor } from '../editor/markup';
import type { MessageKey } from '../i18n';

/** Page sizes in twips (portrait). */
export const PAGE_SIZES: { id: string; key: MessageKey | null; name: string; w: number; h: number }[] = [
  { id: 'letter', key: null, name: 'Letter', w: 12240, h: 15840 },
  { id: 'a4', key: null, name: 'A4', w: 11906, h: 16838 },
  { id: 'legal', key: null, name: 'Legal', w: 12240, h: 20160 },
  { id: 'a3', key: null, name: 'A3', w: 16838, h: 23811 },
  { id: 'a5', key: null, name: 'A5', w: 8391, h: 11906 },
  { id: 'b5', key: null, name: 'B5', w: 9978, h: 14175 },
  { id: 'executive', key: null, name: 'Executive', w: 10440, h: 15120 },
];

// Lengths in dialogs are in inches, or in centimetres where the ruler is metric (`metric`, from
// rulerUsesMetric): to two decimals, "1,5" read as 1.5.
const TW_PER_CM = TWIPS_PER_INCH / 2.54;
const EMU_PER_CM = EMU_PER_INCH / 2.54;
const shown = (n: number) => String(Math.round(n * 100) / 100);
const typed = (s: string) => Number(s.replace(',', '.'));

/** A length in twips as its field shows it. */
export const twipsToField = (tw: number, metric: boolean) => shown(tw / (metric ? TW_PER_CM : TWIPS_PER_INCH));
/**
 * The twips of a length typed in a field, NaN when it is not a number. A field still showing
 * `original` gives it back as it was, so a length left alone does not move by the rounding.
 */
export function fieldToTwips(s: string, metric: boolean, original?: number): number {
  if (original !== undefined && s === twipsToField(original, metric)) return original;
  return Math.round(typed(s) * (metric ? TW_PER_CM : TWIPS_PER_INCH));
}
/** A length in EMUs (pictures, text boxes) as its field shows it. */
export const emuToField = (emu: number, metric: boolean) => shown(emu / (metric ? EMU_PER_CM : EMU_PER_INCH));
/** The EMUs of a length typed in a field, as fieldToTwips. */
export function fieldToEmu(s: string, metric: boolean, original?: number): number {
  if (original !== undefined && s === emuToField(original, metric)) return original;
  return Math.round(typed(s) * (metric ? EMU_PER_CM : EMU_PER_INCH));
}
/** The largest indent or tab position the Paragraph dialog takes (22 inches), in its unit. */
export const paragraphLimit = (metric: boolean) => (metric ? 22 * 2.54 : 22);
/** The smallest text box the dialog makes and the size of a new one, in EMUs. */
export const TEXT_BOX_MIN = { width: 228600, height: 182880 };
export const TEXT_BOX_NEW = { width: 2286000, height: 914400 };

/** A page size as the Size list names it: `Letter (8.5" × 11")`, or `Letter (21.59 × 27.94 cm)` with `centimeters` translated. */
export function pageSizeLabel(p: { name: string; w: number; h: number }, metric: boolean, centimeters: string): string {
  const [w, h] = [twipsToField(p.w, metric), twipsToField(p.h, metric)];
  return metric ? `${p.name} (${w} × ${h} ${centimeters})` : `${p.name} (${w}" × ${h}")`;
}

/** A number typed in a field ("1,5" too), or the fallback. */
export function fieldNumber(v: string, fallback: number): number {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Colours offered for the marks of tracked changes, and for their backgrounds. */
export const MARKUP_TEXT_COLORS = ['black', 'blue', 'turquoise', 'green', 'pink', 'red', 'yellow', 'white', 'darkBlue', 'teal', 'darkGreen', 'violet', 'darkRed', 'darkYellow', 'gray50', 'gray25'] as MarkupColor[];
export const MARKUP_BACK_COLORS = ['lightBlue', 'lightYellow', 'lightOrange', 'lightPurple', 'lightGreen', 'gray', 'pink', 'yellow', 'turquoise'] as MarkupColor[];

const PICTURES: [number[], string, string][] = [
  [[0x89, 0x50, 0x4e, 0x47], 'image/png', 'png'],
  [[0xff, 0xd8, 0xff], 'image/jpeg', 'jpeg'],
  [[0x47, 0x49, 0x46], 'image/gif', 'gif'],
];

/** The type and extension of a PNG, JPEG or GIF picture from its first bytes (null for others). */
export function pictureType(bytes: Uint8Array): { mime: string; ext: string } | null {
  const hit = PICTURES.find(([sig]) => sig.every((b, i) => bytes[i] === b));
  return hit ? { mime: hit[1], ext: hit[2] } : null;
}

/** Widths of the lines of text drawn on the watermark preview's page, in percent. */
export const WATERMARK_PREVIEW_LINES = [90, 80, 85, 60, 88, 75, 82, 50, 70];

/** The keyboard shortcuts dialog: keys (as on Windows and Linux) and what they do. */
export const SHORTCUT_LIST: [string, MessageKey][] = [
  ['Ctrl+B / Ctrl+I / Ctrl+U', 'shortcuts.marks'],
  ['Ctrl+Z / Ctrl+Y', 'shortcuts.undo'],
  ['Ctrl+F', 'shortcuts.find'],
  ['Ctrl+H', 'shortcuts.replace'],
  ['Ctrl+K', 'shortcuts.link'],
  ['Ctrl+Alt+M', 'shortcuts.comment'],
  ['Ctrl+Shift+E', 'shortcuts.suggesting'],
  ['Ctrl+Alt+1…5 / Ctrl+Alt+0', 'shortcuts.headings'],
  ['Ctrl+L / Ctrl+E / Ctrl+R / Ctrl+J', 'shortcuts.align'],
  ['Ctrl+Shift+8 / Ctrl+Shift+7', 'shortcuts.lists'],
  ['Tab / Shift+Tab', 'shortcuts.indent'],
  ['Ctrl+Shift+= / Ctrl+=', 'shortcuts.script'],
  ['Ctrl+Alt+C / Ctrl+Alt+V', 'shortcuts.painter'],
  ['Ctrl+Shift+F5 / Ctrl+G', 'shortcuts.bookmark'],
  ['Ctrl+Enter', 'shortcuts.pageBreak'],
  ['Ctrl+O', 'shortcuts.open'],
  ['Ctrl+S', 'shortcuts.save'],
  ['Ctrl+P', 'shortcuts.print'],
];

/** The version shown in About: that of `@folioline/core`, read from its package.json. */
export const ABOUT_VERSION: string = version;
