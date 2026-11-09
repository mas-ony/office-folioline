/** Colours of the colour and highlight pickers, shared by the React and Vue interfaces. */
import type { DocxDocument } from '../core/document';
import type { MessageKey, Translate } from '../i18n';

/** Office theme colours, used when the document has no theme part. */
const OFFICE_THEME: Record<string, string> = {
  lt1: 'FFFFFF', dk1: '000000', lt2: 'E7E6E6', dk2: '44546A',
  accent1: '4472C4', accent2: 'ED7D31', accent3: 'A5A5A5', accent4: 'FFC000', accent5: '5B9BD5', accent6: '70AD47',
};

type Step = ['lighter' | 'darker', number];

const THEME_SLOTS: { key: string; name: (t: Translate) => string; steps: Step[] }[] = [
  { key: 'lt1', name: (t) => t('color.background1'), steps: [['darker', 5], ['darker', 15], ['darker', 25], ['darker', 35], ['darker', 50]] },
  { key: 'dk1', name: (t) => t('color.text1'), steps: [['lighter', 50], ['lighter', 35], ['lighter', 25], ['lighter', 15], ['lighter', 5]] },
  { key: 'lt2', name: (t) => t('color.background2'), steps: [['darker', 10], ['darker', 25], ['darker', 50], ['darker', 75], ['darker', 90]] },
  { key: 'dk2', name: (t) => t('color.text2'), steps: [['lighter', 80], ['lighter', 60], ['lighter', 40], ['darker', 25], ['darker', 50]] },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({
    key: `accent${n}`,
    name: (t: Translate) => t('color.accent', { n }),
    steps: [['lighter', 80], ['lighter', 60], ['lighter', 40], ['darker', 25], ['darker', 50]] as Step[],
  })),
];

export const STANDARD_COLORS: { hex: string; key: MessageKey }[] = [
  { hex: 'C00000', key: 'color.darkRed' },
  { hex: 'FF0000', key: 'color.red' },
  { hex: 'FFC000', key: 'color.orange' },
  { hex: 'FFFF00', key: 'color.yellow' },
  { hex: '92D050', key: 'color.lightGreen' },
  { hex: '00B050', key: 'color.green' },
  { hex: '00B0F0', key: 'color.lightBlue' },
  { hex: '0070C0', key: 'color.blue' },
  { hex: '002060', key: 'color.darkBlue' },
  { hex: '7030A0', key: 'color.purple' },
];

/** Word's highlight colours (w:highlight values). */
export const HIGHLIGHTS: { name: string; hex: string; key: MessageKey }[] = [
  { name: 'yellow', hex: 'FFFF00', key: 'color.yellow' },
  { name: 'green', hex: '00FF00', key: 'color.brightGreen' },
  { name: 'cyan', hex: '00FFFF', key: 'color.cyan' },
  { name: 'magenta', hex: 'FF00FF', key: 'color.magenta' },
  { name: 'blue', hex: '0000FF', key: 'color.blue' },
  { name: 'red', hex: 'FF0000', key: 'color.red' },
  { name: 'darkBlue', hex: '000080', key: 'color.darkBlue' },
  { name: 'darkCyan', hex: '008080', key: 'color.darkCyan' },
  { name: 'darkGreen', hex: '008000', key: 'color.darkGreen' },
  { name: 'darkMagenta', hex: '800080', key: 'color.darkMagenta' },
  { name: 'darkRed', hex: '800000', key: 'color.darkRed' },
  { name: 'darkYellow', hex: '808000', key: 'color.darkYellow' },
  { name: 'darkGray', hex: '808080', key: 'color.darkGray' },
  { name: 'lightGray', hex: 'C0C0C0', key: 'color.lightGray' },
  { name: 'black', hex: '000000', key: 'color.black' },
];

function mix(hex: string, kind: 'lighter' | 'darker', pct: number): string {
  const n = parseInt(hex, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(kind === 'lighter' ? c + (255 - c) * (pct / 100) : c * (1 - pct / 100)));
  return ch.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function themeColors(docx: DocxDocument | null): Record<string, string> {
  const c = docx?.theme.colors ?? {};
  const out: Record<string, string> = { ...OFFICE_THEME };
  for (const k of Object.keys(OFFICE_THEME)) if (c[k] && /^[0-9A-F]{6}$/i.test(c[k])) out[k] = c[k].toUpperCase();
  return out;
}

export interface Swatch {
  key: string;
  hex: string;
  label: string;
}

/** A document's theme colours, and their tints and shades in five rows, as the colour picker shows them. */
export function themeSwatches(docx: DocxDocument | null, t: Translate): { theme: Swatch[]; shades: Swatch[] } {
  const theme = themeColors(docx);
  return {
    theme: THEME_SLOTS.map((s) => ({ key: s.key, hex: theme[s.key], label: s.name(t) })),
    shades: [0, 1, 2, 3, 4].flatMap((row) => THEME_SLOTS.map((s) => {
      const [kind, pct] = s.steps[row];
      const hex = mix(theme[s.key], kind, pct);
      return { key: `${s.key}-${row}`, hex, label: t(kind === 'lighter' ? 'color.lighter' : 'color.darker', { name: s.name(t), percent: pct }) };
    })),
  };
}

/** CSS colour of a highlight name or #hex shading. */
export function highlightCss(value: string | null): string {
  if (!value) return 'transparent';
  if (value.startsWith('#')) return value;
  const h = HIGHLIGHTS.find((x) => x.name === value);
  return h ? `#${h.hex}` : value;
}
