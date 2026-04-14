import { encrypt, decrypt } from './crypto'
import { uint8ArrayToBase64, base64ToUint8Array } from './encoding'
import { listMonths, readMonth, writeMonth } from './db'
import type { MonthData } from '../types'

type BackupPayload = {
  version: 1
  months: Record<string, MonthData>
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
  const monthKeys = await listMonths(db)
  const months: Record<string, MonthData> = {}
  for (const k of monthKeys) {
    months[k] = await readMonth(db, k, key)
  }
  const json = JSON.stringify({ version: 1, months } satisfies BackupPayload)
  const compressed = await compress(json)
  const ciphertext = await encrypt(uint8ArrayToBase64(compressed), key)
  return new Blob([ciphertext], { type: 'application/octet-stream' })
}

export async function importBackup(file: File, db: IDBDatabase, key: CryptoKey): Promise<number> {
  const ciphertext = await file.text()

  let compressedB64: string
  try {
    compressedB64 = await decrypt(ciphertext, key)
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
    await writeMonth(db, k, monthData, key)
    count++
  }
  return count
}
