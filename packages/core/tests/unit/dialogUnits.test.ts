import { afterEach, describe, expect, it, vi } from 'vitest';
import { emuToField, fieldToEmu, fieldToTwips, PAGE_SIZES, pageSizeLabel, twipsToField } from '../../src/ui/dialogs';
import { rulerUsesMetric } from '../../src/ui/menus';

describe('lengths in dialogs', () => {
  it('shows a length in inches, or in centimetres where the ruler is metric', () => {
    expect(twipsToField(1440, false)).toBe('1');
    expect(twipsToField(1800, false)).toBe('1.25');
    expect(twipsToField(1440, true)).toBe('2.54');
    expect(twipsToField(567, true)).toBe('1');
    expect(emuToField(914400, false)).toBe('1');
    expect(emuToField(360000, true)).toBe('1');
  });

  it('reads a typed length with a point or a comma', () => {
    expect(fieldToTwips('1.5', false)).toBe(2160);
    expect(fieldToTwips('1,5', false)).toBe(2160);
    expect(fieldToTwips('2', true)).toBe(1134);
    expect(fieldToTwips('', true)).toBe(0);
    expect(fieldToTwips('abc', true)).toBeNaN();
    expect(fieldToEmu('2.54', true)).toBe(914400);
  });

  it('keeps a length whose field still shows it, so the rounding does not move it', () => {
    expect(twipsToField(1800, true)).toBe('3.18');
    expect(fieldToTwips('3.18', true)).toBe(1803);
    expect(fieldToTwips('3.18', true, 1800)).toBe(1800);
    expect(fieldToTwips('3.2', true, 1800)).toBe(1814);
    expect(fieldToEmu(emuToField(123456, true), true, 123456)).toBe(123456);
  });

  it('names the page sizes in inches or centimetres', () => {
    expect(PAGE_SIZES.map((p) => pageSizeLabel(p, false, 'cm'))).toEqual([
      'Letter (8.5" × 11")', 'A4 (8.27" × 11.69")', 'Legal (8.5" × 14")', 'A3 (11.69" × 16.54")', 'A5 (5.83" × 8.27")', 'B5 (6.93" × 9.84")', 'Executive (7.25" × 10.5")',
    ]);
    expect(PAGE_SIZES.map((p) => pageSizeLabel(p, true, 'cm'))).toEqual([
      'Letter (21.59 × 27.94 cm)', 'A4 (21 × 29.7 cm)', 'Legal (21.59 × 35.56 cm)', 'A3 (29.7 × 42 cm)', 'A5 (14.8 × 21 cm)', 'B5 (17.6 × 25 cm)', 'Executive (18.42 × 26.67 cm)',
    ]);
  });
});

describe('where the ruler is metric', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses inches for US English and English with no region, centimetres for the rest', () => {
    const cases: [string, boolean][] = [['en-US', false], ['en', false], ['en-LR', false], ['en-MM', false], ['en-GB', true], ['de-DE', true], ['he-IL', true], ['zh-CN', true]];
    for (const [language, metric] of cases) {
      vi.stubGlobal('navigator', { language });
      expect(rulerUsesMetric(), language).toBe(metric);
    }
  });
});
