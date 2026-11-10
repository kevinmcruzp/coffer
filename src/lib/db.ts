import { encrypt, decrypt } from './crypto'
import { monthDataSchema } from './schemas'
import { notifyMonthChanged } from './monthEvents'
import type { VaultStore } from './vaultStore'
import type { MonthData } from '../types'

// Encrypted month access on top of any VaultStore: nothing reaches the store in plaintext,
// and everything read back is validated before use.

export async function writeMonth(
  store: VaultStore,
  monthKey: string,
  data: MonthData,
  cryptoKey: CryptoKey,
): Promise<void> {
  const ciphertext = await encrypt(JSON.stringify(data), cryptoKey)
  await store.writeMonthCiphertexts([[monthKey, ciphertext]])
  notifyMonthChanged(monthKey)
}

// Writes several months at once: either all are saved or none is.
// Each month is stored under its own `key`.
export async function writeMonths(
  store: VaultStore,
  months: MonthData[],
  cryptoKey: CryptoKey,
): Promise<void> {
  const entries = await Promise.all(
    months.map(async (m): Promise<[string, string]> => [m.key, await encrypt(JSON.stringify(m), cryptoKey)]),
  )
  await store.writeMonthCiphertexts(entries)
  for (const [monthKey] of entries) notifyMonthChanged(monthKey)
}

export async function readMonth(
  store: VaultStore,
  monthKey: string,
  cryptoKey: CryptoKey,
): Promise<MonthData> {
  const ciphertext = await store.readMonthCiphertext(monthKey)
  if (ciphertext === undefined) throw new Error(`Month "${monthKey}" not found`)

  const plaintext = await decrypt(ciphertext, cryptoKey)
  return monthDataSchema.parse(JSON.parse(plaintext))
}
