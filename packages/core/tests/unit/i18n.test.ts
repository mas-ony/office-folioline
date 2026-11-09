import { describe, expect, it } from 'vitest';
import { en, type MessageKey } from '../../src/i18n/en';
import { format, LOCALES, loadMessages } from '../../src/i18n';

/** Parameter names of a message: `{name}` and the variable of plural groups. */
function params(s: string): string[] {
  const out = new Set<string>();
  for (const m of s.matchAll(/\{(\w+)\}|\{\s*(\w+)\s*,\s*plural/g)) out.add(m[1] ?? m[2]);
  return [...out].sort();
}

describe('translations', () => {
  for (const { id } of LOCALES.filter((l) => l.id !== 'en')) {
    it(`${id} translates every string with the same parameters`, async () => {
      const messages = await loadMessages(id);
      const keys = Object.keys(en) as MessageKey[];
      expect(keys.filter((k) => !messages[k])).toEqual([]);
      expect(Object.keys(messages).filter((k) => !(k in en))).toEqual([]);
      const mismatched = keys.filter((k) => messages[k] && params(messages[k]!).join() !== params(en[k]).join());
      expect(mismatched).toEqual([]);
      // Plural messages produce text for every count.
      for (const k of keys.filter((key) => /plural/.test(en[key]))) {
        for (const n of [0, 1, 2, 5, 22]) expect(format(messages[k]!, { count: n }, id)).not.toMatch(/[{}]/);
      }
    });
  }
});
