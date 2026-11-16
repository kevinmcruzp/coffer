import type { Currency } from '../types'

// "R$ 1.234,56" / "US$ 1.234,56" / "CLP 1.234,56"
export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value)
}
