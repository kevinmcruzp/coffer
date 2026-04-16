import { encrypt, decrypt, deriveKey } from './crypto'
import { uint8ArrayToBase64, base64ToUint8Array } from './encoding'
import { listMonths, readMonth, readSetting, writeMonth } from './db'
import type { MonthData } from '../types'

type BackupPayload = {
  version: 1
  months: Record<string, MonthData>
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
  writer.write(bytes)
  writer.close()
  const buffer = await new Response(stream.readable).arrayBuffer()
  return new TextDecoder().decode(buffer)
}

export async function exportBackup(db: IDBDatabase, key: CryptoKey): Promise<Blob> {
  const saltB64 = await readSetting(db, 'salt')
  if (!saltB64) throw new Error('Session not initialized')

  const monthKeys = await listMonths(db)
  const months: Record<string, MonthData> = {}
  for (const k of monthKeys) {
    months[k] = await readMonth(db, k, key)
  }
  const json = JSON.stringify({ version: 1, months } satisfies BackupPayload)
  const compressed = await compress(json)
  const ciphertext = await encrypt(uint8ArrayToBase64(compressed), key)

  const envelope: BackupEnvelope = { version: 1, salt: saltB64, ciphertext }
  return new Blob([JSON.stringify(envelope)], { type: 'application/octet-stream' })
}

export async function importBackup(
  file: File,
  db: IDBDatabase,
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
    if (parsed.version !== 1 || typeof parsed.months !== 'object' || parsed.months === null) {
      throw new Error('Invalid backup format')
    }
    payload = parsed
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Invalid')) throw err
    throw new Error('Corrupted backup file')
  }

  let count = 0
  for (const [k, monthData] of Object.entries(payload.months)) {
    await writeMonth(db, k, monthData, sessionKey)
    count++
  }
  return count
}
