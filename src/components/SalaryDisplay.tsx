'use client';

import { formatSalary } from '@/lib/utils';
import { usdEquivalent } from '@/lib/currency';

type TFn = (key: string, values?: Record<string, string | number>) => string;

interface SalaryDisplayProps {
  min?: number;
  max?: number;
  currency?: string;
  t?: TFn;
  size?: 'sm' | 'md';
}

export function SalaryDisplay({ min, max, currency, t, size = 'md' }: SalaryDisplayProps) {
  const original = formatSalary(min, max, currency, t);
  const usd = usdEquivalent(min, max, currency);

  return (
    <span className="inline-flex flex-col leading-snug">
      <span className={`font-semibold text-indigo-600 ${size === 'sm' ? 'text-sm' : ''}`}>
        {original}
      </span>
      {usd && (
        <span className="text-xs text-gray-400 font-normal">{usd} USD</span>
      )}
    </span>
  );
}
