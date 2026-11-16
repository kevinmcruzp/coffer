import { encrypt, decrypt, deriveKey } from './crypto'
import { uint8ArrayToBase64, base64ToUint8Array } from './encoding'
import { readMonth, writeMonths } from './db'
import { DEFAULT_CURRENCY, monthStoreKey, parseMonthStoreKey, scopeToCurrency } from './currencyStore'
import { monthDataSchema } from './schemas'
import type { VaultStore } from './vaultStore'
import type { Currency, MonthData } from '../types'

// Version 2 keys each month by currency ("BRL:2026-11"), like the vault file. Version 1
// was written before currency environments and keys months by the bare YYYY-MM.
type BackupPayload = {
  version: 1 | 2
  months: Record<string, unknown>
}

type BackupEnvelope = {
  version: 1
  salt: string
  ciphertext: string
}

async function compress(text: string): Promise<Uint8Array> {
  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new TextEncoder().encode(text))
  writer.close()
  const buffer = await new Response(stream.readable).arrayBuffer()
  return new Uint8Array(buffer)
}

async function decompress(bytes: Uint8Array): Promise<string> {
  const stream = new DecompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new Uint8Array(bytes))
  writer.close()
  const buffer = await new Response(stream.readable).arrayBuffer()
  return new TextDecoder().decode(buffer)
}

// Where a month of a backup belongs. Version 1 months all go to BRL, the same choice the
// vault file makes when it upgrades.
function monthLocation(version: 1 | 2, storeKey: string): { currency: Currency; monthKey: string } | null {
  return parseMonthStoreKey(version === 2 ? storeKey : monthStoreKey(DEFAULT_CURRENCY, storeKey))
}

// Backup file format: JSON envelope { version, salt, ciphertext }
//   - salt: random, stored in the envelope so the backup password can be re-derived on import
//   - ciphertext: AES-GCM encrypted payload of gzip(JSON({ version, months }))
// A backup holds the whole vault — every currency — whatever currency is active.
//
// The backup password is independent of the session password. Re-deriving the key from
// the backup salt + backup password allows restoring to a different account or device.
// The session key (passed as `key` to importBackup) is only used to write months to the DB.

export async function exportBackup(vault: VaultStore, key: CryptoKey): Promise<string> {
  const saltB64 = await vault.readSetting('salt')
  if (!saltB64) throw new Error('Session not initialized')

  const months: Record<string, MonthData> = {}
  for (const storeKey of await vault.listMonths()) {
    months[storeKey] = await readMonth(vault, storeKey, key)
  }
  const json = JSON.stringify({ version: 2, months } satisfies BackupPayload)
  const compressed = await compress(json)
  const ciphertext = await encrypt(uint8ArrayToBase64(compressed), key)

  const envelope: BackupEnvelope = { version: 1, salt: saltB64, ciphertext }
  return JSON.stringify(envelope)
}

export async function importBackup(
  file: File,
  vault: VaultStore,
  password: string,
  sessionKey: CryptoKey,
): Promise<number> {
  const text = await file.text()

  let envelope: BackupEnvelope
  try {
    const parsed = JSON.parse(text) as BackupEnvelope
    if (parsed.version !== 1 || !parsed.salt || !parsed.ciphertext) {
      throw new Error('Invalid backup format')
    }
    envelope = parsed
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Invalid')) throw err
    throw new Error('Invalid backup file or wrong password')
  }

  const backupKey = await deriveKey(password, base64ToUint8Array(envelope.salt))

  let compressedB64: string
  try {
    compressedB64 = await decrypt(envelope.ciphertext, backupKey)
  } catch {
    throw new Error('Invalid backup file or wrong password')
  }

  let payload: BackupPayload
  try {
    const json = await decompress(base64ToUint8Array(compressedB64))
    const parsed = JSON.parse(json) as BackupPayload
    if ((parsed.version !== 1 && parsed.version !== 2) || typeof parsed.months !== 'object' || parsed.months === null) {
      throw new Error('Invalid backup format')
    }
    payload = parsed
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Invalid')) throw err
    throw new Error('Corrupted backup file')
  }

  // Everything is validated before anything is written: one bad month aborts the restore.
  const byCurrency = new Map<Currency, MonthData[]>()
  for (const [storeKey, monthData] of Object.entries(payload.months)) {
    const location = monthLocation(payload.version, storeKey)
    const parsed = monthDataSchema.safeParse(monthData)
    if (!location || !parsed.success) throw new Error('Corrupted backup file')
    // The key a month is filed under is the one that counts.
    const month: MonthData = { ...parsed.data, key: location.monthKey }
    byCurrency.set(location.currency, [...(byCurrency.get(location.currency) ?? []), month])
  }

  let count = 0
  for (const [currency, months] of byCurrency) {
    await writeMonths(scopeToCurrency(vault, currency), months, sessionKey)
    count += months.length
  }
  return count
}
