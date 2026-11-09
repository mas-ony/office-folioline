import { en, type MessageKey } from './en';

export type { MessageKey };
export type Locale = 'en' | 'pl' | 'de' | 'fr' | 'ja' | 'es' | 'pt-BR' | 'he' | 'hi' | 'id' | 'tr' | 'zh-CN';
export type Messages = Partial<Record<MessageKey, string>>;
export type Params = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: Params) => string;

/** Interface languages, in the order the Settings tab lists them. */
export const LOCALES: { id: Locale; native: string; english: string; rtl?: boolean }[] = [
  { id: 'en', native: 'English', english: 'English' },
  { id: 'pl', native: 'Polski', english: 'Polish' },
  { id: 'de', native: 'Deutsch', english: 'German' },
  { id: 'fr', native: 'Français', english: 'French' },
  { id: 'ja', native: '日本語', english: 'Japanese' },
  { id: 'es', native: 'Español', english: 'Spanish' },
  { id: 'pt-BR', native: 'Português (Brasil)', english: 'Portuguese (Brazil)' },
  { id: 'he', native: 'עברית', english: 'Hebrew', rtl: true },
  { id: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { id: 'id', native: 'Bahasa Indonesia', english: 'Indonesian' },
  { id: 'tr', native: 'Türkçe', english: 'Turkish' },
  { id: 'zh-CN', native: '简体中文', english: 'Chinese (Simplified)' },
];

/** Locale catalogues load on demand, so only the chosen language is downloaded. */
const loaders: Record<Exclude<Locale, 'en'>, () => Promise<Messages>> = {
  pl: () => import('./locales/pl').then((m) => m.default),
  de: () => import('./locales/de').then((m) => m.default),
  fr: () => import('./locales/fr').then((m) => m.default),
  ja: () => import('./locales/ja').then((m) => m.default),
  es: () => import('./locales/es').then((m) => m.default),
  'pt-BR': () => import('./locales/pt-BR').then((m) => m.default),
  he: () => import('./locales/he').then((m) => m.default),
  hi: () => import('./locales/hi').then((m) => m.default),
  id: () => import('./locales/id').then((m) => m.default),
  tr: () => import('./locales/tr').then((m) => m.default),
  'zh-CN': () => import('./locales/zh-CN').then((m) => m.default),
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && LOCALES.some((l) => l.id === v);
}

export function loadMessages(locale: Locale): Promise<Messages> {
  return locale === 'en' ? Promise.resolve({}) : loaders[locale]();
}

/** The locale matching the browser languages, or English. */
export function browserLocale(): Locale {
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const raw of langs) {
    const exact = LOCALES.find((l) => l.id.toLowerCase() === raw.toLowerCase());
    if (exact) return exact.id;
    const base = raw.split('-')[0].toLowerCase();
    const loose = LOCALES.find((l) => l.id.split('-')[0].toLowerCase() === base);
    if (loose) return loose.id;
  }
  return 'en';
}

/** Find the matching closing brace of the group that opens at `open`. */
function closing(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return s.length - 1;
}

/**
 * Fill `{name}` placeholders and `{name, plural, one {...} other {...}}` groups (`#` is the
 * number, `=0 {...}` matches exactly).
 */
export function format(template: string, params: Params | undefined, locale: string): string {
  if (!params || template.indexOf('{') < 0) return template;
  let out = '';
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf('{', i);
    if (open < 0) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, open);
    const end = closing(template, open);
    const body = template.slice(open + 1, end);
    const m = /^\s*(\w+)\s*,\s*plural\s*,(.*)$/s.exec(body);
    if (m) {
      const n = Number(params[m[1]] ?? 0);
      const cases = new Map<string, string>();
      const rest = m[2];
      let j = 0;
      while (j < rest.length) {
        const sel = /\s*(=\d+|\w+)\s*\{/y;
        sel.lastIndex = j;
        const s = sel.exec(rest);
        if (!s) break;
        const o = sel.lastIndex - 1;
        const c = closing(rest, o);
        cases.set(s[1], rest.slice(o + 1, c));
        j = c + 1;
      }
      let rule = 'other';
      try {
        rule = new Intl.PluralRules(locale).select(n);
      } catch {
        rule = n === 1 ? 'one' : 'other';
      }
      const chosen = cases.get(`=${n}`) ?? cases.get(rule) ?? cases.get('other') ?? '';
      out += format(chosen.replace(/#/g, String(n)), params, locale);
    } else {
      const v = params[body.trim()];
      out += v === undefined ? `{${body}}` : String(v);
    }
    i = end + 1;
  }
  return out;
}

export function makeTranslate(locale: Locale, messages: Messages): Translate {
  return (key, params) => format(messages[key] ?? en[key] ?? key, params, locale);
}

/** Whether the locale is written right to left. */
export function isRtl(locale: Locale): boolean {
  return !!LOCALES.find((l) => l.id === locale)?.rtl;
}
