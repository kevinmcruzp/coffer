import { encrypt, decrypt } from './crypto'
import { monthDataSchema } from './schemas'
import type { MonthData } from '../types'

const DB_NAME = 'coffer'
const DB_VERSION = 1

// Object stores:
//   settings — key/value strings: "salt", "verificationToken", "lockTimeoutMinutes"
//   months   — key = YYYY-MM, value = encrypted MonthData JSON (via writeMonth/readMonth)

export function openDB(idb: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }
      if (!db.objectStoreNames.contains('months')) {
        db.createObjectStore('months')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function writeSetting(db: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite')
    const request = tx.objectStore('settings').put(value, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function readSetting(db: IDBDatabase, key: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly')
    const request = tx.objectStore('settings').get(key)
    request.onsuccess = () => resolve(request.result as string | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function writeMonth(
  db: IDBDatabase,
  monthKey: string,
  data: MonthData,
  cryptoKey: CryptoKey,
): Promise<void> {
  const ciphertext = await encrypt(JSON.stringify(data), cryptoKey)
  return new Promise((resolve, reject) => {
    const tx = db.transaction('months', 'readwrite')
    const request = tx.objectStore('months').put(ciphertext, monthKey)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function readMonth(
  db: IDBDatabase,
  monthKey: string,
  cryptoKey: CryptoKey,
): Promise<MonthData> {
  const ciphertext = await new Promise<string>((resolve, reject) => {
    const tx = db.transaction('months', 'readonly')
    const request = tx.objectStore('months').get(monthKey)
    request.onsuccess = () => {
      if (request.result === undefined) reject(new Error(`Month "${monthKey}" not found`))
      else resolve(request.result as string)
    }
    request.onerror = () => reject(request.error)
  })

  const plaintext = await decrypt(ciphertext, cryptoKey)
  return monthDataSchema.parse(JSON.parse(plaintext))
}

export function listMonths(db: IDBDatabase): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('months', 'readonly')
    const request = tx.objectStore('months').getAllKeys()
    request.onsuccess = () => resolve(request.result as string[])
    request.onerror = () => reject(request.error)
  })
}
