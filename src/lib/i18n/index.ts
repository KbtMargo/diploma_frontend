export type Locale = 'uk' | 'en' | 'de' | 'pl';

export const LOCALE_TO_BCP47: Record<Locale, string> = {
  uk: 'uk-UA',
  en: 'en-US',
  de: 'de-DE',
  pl: 'pl-PL',
};

export const LOCALES: Locale[] = ['uk', 'en', 'de', 'pl'];
export const DEFAULT_LOCALE: Locale = 'uk';
export const LOCALE_STORAGE_KEY = 'startway-locale';

function deepGet(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function interpolate(str: string, values?: Record<string, string | number>): string {
  if (!values) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? `{{${key}}}`));
}

export function createTranslator(translations: Record<string, unknown>) {
  return function t(key: string, values?: Record<string, string | number>): string {
    const val = deepGet(translations as Record<string, unknown>, key);
    if (typeof val === 'string') return interpolate(val, values);
    return key;
  };
}
