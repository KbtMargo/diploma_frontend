'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type Locale, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, createTranslator } from '@/lib/i18n';
import uk from '@/lib/i18n/uk.json';
import en from '@/lib/i18n/en.json';
import de from '@/lib/i18n/de.json';
import pl from '@/lib/i18n/pl.json';

const translations: Record<Locale, Record<string, unknown>> = { uk, en, de, pl };

type TFunction = (key: string, values?: Record<string, string | number>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored && translations[stored]) {
      setLocaleState(stored);
      document.documentElement.lang = stored;
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    createTranslator(translations[locale]),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
