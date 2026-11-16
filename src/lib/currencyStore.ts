import { CURRENCIES } from '../types'
import type { Currency } from '../types'
import { monthKeySchema } from './schemas'
import type { VaultStore } from './vaultStore'

// Each currency is its own environment: the same calendar month exists once per currency,
// stored in the vault under "<currency>:<YYYY-MM>" (e.g. "USD:2026-11").

export const DEFAULT_CURRENCY: Currency = 'BRL'

export function parseCurrency(raw: string | undefined): Currency {
  return CURRENCIES.find(c => c === raw) ?? DEFAULT_CURRENCY
}

export function monthStoreKey(currency: Currency, monthKey: string): string {
  return `${currency}:${monthKey}`
}

export function parseMonthStoreKey(storeKey: string): { currency: Currency; monthKey: string } | null {
  const separator = storeKey.indexOf(':')
  const currency = CURRENCIES.find(c => c === storeKey.slice(0, separator))
  const monthKey = storeKey.slice(separator + 1)
  if (separator === -1 || currency === undefined || !monthKeySchema.safeParse(monthKey).success) return null
  return { currency, monthKey }
}

// View of the vault limited to one currency: months are read and written by their plain
// YYYY-MM key and never mix with another currency's. Settings belong to the whole vault.
export function scopeToCurrency(store: VaultStore, currency: Currency): VaultStore {
  const prefix = monthStoreKey(currency, '')
  return {
    readSetting: key => store.readSetting(key),
    writeSetting: (key, value) => store.writeSetting(key, value),
    readMonthCiphertext: monthKey => store.readMonthCiphertext(prefix + monthKey),
    writeMonthCiphertexts: entries =>
      store.writeMonthCiphertexts(entries.map(([monthKey, ciphertext]) => [prefix + monthKey, ciphertext])),
    listMonths: async () =>
      (await store.listMonths()).filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length)),
  }
}
