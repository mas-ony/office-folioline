/** Choices and labels of the formatting toolbar, shared by the React and Vue interfaces. */
import type { BorderPreset } from '../editor/tableFormat';
import type { MessageKey, Translate } from '../i18n';
import type { MenuIcon } from './menus';
import { FONT_GROUPS } from './types';

export const ALIGNS: readonly { value: 'left' | 'center' | 'right' | 'both'; key: MessageKey; icon: MenuIcon; cmd: 'alignLeft' | 'alignCenter' | 'alignRight' | 'justify'; sc: string }[] = [
  { value: 'left', key: 'toolbar.alignLeft', icon: 'TextAlignStart', cmd: 'alignLeft', sc: 'Ctrl+L' },
  { value: 'center', key: 'toolbar.center', icon: 'TextAlignCenter', cmd: 'alignCenter', sc: 'Ctrl+E' },
  { value: 'right', key: 'toolbar.alignRight', icon: 'TextAlignEnd', cmd: 'alignRight', sc: 'Ctrl+R' },
  { value: 'both', key: 'toolbar.justify', icon: 'TextAlignJustify', cmd: 'justify', sc: 'Ctrl+J' },
];

export const PRESET_KEYS: Record<BorderPreset, MessageKey> = {
  all: 'table.allBorders', outside: 'table.outsideBorders', inside: 'table.insideBorders', none: 'table.noBorders',
  top: 'table.topBorder', bottom: 'table.bottomBorder', left: 'table.leftBorder', right: 'table.rightBorder',
};

/** Whether a border preset's icon draws a side: top, bottom, left, right, or the inside lines h and v. */
export function presetHasSide(preset: BorderPreset, side: string): boolean {
  return preset === 'all' || preset === side || (preset === 'outside' && ['top', 'bottom', 'left', 'right'].includes(side)) || (preset === 'inside' && ['h', 'v'].includes(side));
}

/** The dash pattern and width of a border style's sample line. */
export function sampleStroke(style: string, width = 1): { dash?: string; width: number } {
  const dash = style === 'dashed' ? '6 3' : style === 'dotted' ? '1.5 2.5' : undefined;
  return { dash, width: style === 'thick' ? 3 : Math.max(1, width) };
}

/** The font picker's groups (the document's own fonts first) with the fonts matching `query`. */
export function fontGroups(t: Translate, documentFonts: string[], query: string): { label: string; fonts: string[] }[] {
  const listed = new Set(FONT_GROUPS.flatMap((g) => g.fonts));
  const q = query.trim().toLowerCase();
  return [
    { label: t('toolbar.documentFonts'), fonts: documentFonts.filter((f) => !listed.has(f)) },
    ...FONT_GROUPS.map((g) => ({ label: t(`toolbar.${g.id}` as MessageKey), fonts: g.fonts })),
  ].map((g) => ({ ...g, fonts: g.fonts.filter((f) => f.toLowerCase().includes(q)) })).filter((g) => g.fonts.length);
}

/** A typed font size in points, to the half point, or null when Word does not allow it. */
export function parseFontSize(text: string): number | null {
  const n = Math.round(Number(text.replace(',', '.')) * 2) / 2;
  return n >= 1 && n <= 1638 ? n : null;
}
