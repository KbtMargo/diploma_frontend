'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { LOCALES, type Locale } from '@/lib/i18n';

const FLAG: Record<Locale, string> = {
  uk: 'UA',
  en: 'EN',
  de: 'DE',
  pl: 'PL',
};

const LABEL: Record<Locale, string> = {
  uk: 'UA',
  en: 'EN',
  de: 'DE',
  pl: 'PL',
};

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-medium"
        aria-label="Change language"
      >
        <Globe size={16} />
        <span>{LABEL[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {LOCALES.map(loc => (
            <button
              key={loc}
              onClick={() => { setLocale(loc); setOpen(false); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                locale === loc
                  ? 'text-indigo-600 bg-indigo-50 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{FLAG[loc]}</span>
              <span>{t(`lang.${loc}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
