'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { translateText } from '@/lib/translate';

export function useAutoTranslate(text: string | undefined | null): string {
  const { locale } = useI18n();
  const [result, setResult] = useState(text ?? '');

  useEffect(() => {
    const src = text ?? '';
    if (!src || locale === 'uk') { setResult(src); return; }
    let cancelled = false;
    translateText(src, locale).then(t => { if (!cancelled) setResult(t); });
    return () => { cancelled = true; };
  }, [text, locale]);

  return result;
}

// Translates a multiline string line by line (better quality for short segments)
export function useAutoTranslateLines(text: string | undefined | null): string {
  const { locale } = useI18n();
  const [result, setResult] = useState(text ?? '');

  useEffect(() => {
    const src = text ?? '';
    if (!src || locale === 'uk') { setResult(src); return; }
    let cancelled = false;
    const lines = src.split('\n').map(l => l.trim()).filter(Boolean);
    Promise.all(lines.map(line => translateText(line, locale)))
      .then(translated => { if (!cancelled) setResult(translated.join('\n')); });
    return () => { cancelled = true; };
  }, [text, locale]);

  return result;
}
