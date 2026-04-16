import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, format } from 'date-fns';
import { uk } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeDate(date: string | Date): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 0) return 'щойно'; // ← додати для від'ємних значень
  if (diffSec < 10) return 'щойно';
  if (diffSec < 60) return `${diffSec} сек тому`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} хв тому`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} год тому`;
  
  return format(d, 'dd.MM.yyyy HH:mm', { locale: uk });
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd.MM.yyyy', { locale: uk });
}

export function formatSalary(min?: number, max?: number, currency?: string): string {
  if (!min && !max) return 'Зарплата не вказана';
  const curr = currency || 'USD';
  if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ${curr}`;
  if (min) return `від ${min.toLocaleString()} ${curr}`;
  return `до ${max!.toLocaleString()} ${curr}`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}