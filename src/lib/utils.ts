import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns';
import { formatAmount } from './currency';

type TFn = (key: string, values?: Record<string, string | number>) => string;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeDate(date: string | Date, t?: TFn): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  const tr = (key: string, values?: Record<string, string | number>) =>
    t ? t(`utils.${key}`, values) : fallbackRelative(key, values);

  if (diffSec < 10) return tr('justNow');
  if (diffSec < 60) return tr('secAgo', { n: diffSec });
  if (diffSec < 3600) return tr('minAgo', { n: Math.floor(diffSec / 60) });
  if (diffSec < 86400) return tr('hourAgo', { n: Math.floor(diffSec / 3600) });

  return format(d, 'dd.MM.yyyy HH:mm');
}

function fallbackRelative(key: string, values?: Record<string, string | number>): string {
  const n = values?.n ?? '';
  switch (key) {
    case 'justNow': return 'щойно';
    case 'secAgo':  return `${n} сек тому`;
    case 'minAgo':  return `${n} хв тому`;
    case 'hourAgo': return `${n} год тому`;
    default: return '';
  }
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd.MM.yyyy');
}

export function formatSalary(min?: number, max?: number, currency?: string, t?: TFn): string {
  if (!min && !max) return t ? t('utils.salaryNotSet') : 'Зарплата не вказана';
  const curr = currency || 'USD';
  const from = t ? t('utils.salaryFrom') : 'від';
  const to   = t ? t('utils.salaryTo')   : 'до';
  if (min && max) return `${formatAmount(min, curr)} – ${formatAmount(max, curr)}`;
  if (min) return `${from} ${formatAmount(min, curr)}`;
  return `${to} ${formatAmount(max!, curr)}`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}