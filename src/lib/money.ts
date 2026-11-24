import type { Currency } from '../types'

// (1234.56, 'BRL', 'pt-BR') → "R$ 1.234,56"; (1234.56, 'BRL', 'en-US') → "R$1,234.56".
// `signed` adds an explicit "+" to positive amounts.
export function formatMoney(value: number, currency: Currency, locale: string, signed = false): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value)
}
