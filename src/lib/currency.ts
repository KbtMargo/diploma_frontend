export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',   EUR: '€',   GBP: '£',   UAH: '₴',
  PLN: 'PLN ', SEK: 'SEK ', NOK: 'NOK ', DKK: 'DKK ',
  CHF: 'CHF ', CAD: 'CA$', AUD: 'A$',  SGD: 'S$',
  NZD: 'NZ$', JPY: '¥',   KRW: '₩',   INR: '₹',
  BRL: 'R$',  ARS: 'ARS$', MXN: 'MX$', ZAR: 'R ',
  TRY: '₺',  ILS: '₪',  RON: 'RON ', AED: 'AED ',
};

// Approximate rates to USD (May 2026)
export const RATES_TO_USD: Record<string, number> = {
  USD: 1,      EUR: 1.08,  GBP: 1.27,  UAH: 0.024,
  PLN: 0.25,   SEK: 0.095, NOK: 0.093, DKK: 0.145,
  CHF: 1.11,   CAD: 0.73,  AUD: 0.64,  SGD: 0.74,
  NZD: 0.60,   JPY: 0.0067, KRW: 0.00072, INR: 0.012,
  BRL: 0.18,   ARS: 0.001, MXN: 0.052, ZAR: 0.054,
  TRY: 0.028,  ILS: 0.27,  RON: 0.22,  AED: 0.272,
};

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

export function formatAmount(amount: number, currency: string): string {
  const sym = currencySymbol(currency);
  const num = amount.toLocaleString('en-US');
  return `${sym}${num}`;
}

export function usdEquivalent(min?: number, max?: number, currency?: string): string | null {
  if (!currency || currency === 'USD') return null;
  const rate = RATES_TO_USD[currency];
  if (!rate || (!min && !max)) return null;

  const minU = min ? compact(Math.round(min * rate)) : null;
  const maxU = max ? compact(Math.round(max * rate)) : null;

  if (minU && maxU) return `≈ $${minU}–$${maxU}`;
  if (minU) return `≈ $${minU}+`;
  return `≈ up to $${maxU}`;
}
