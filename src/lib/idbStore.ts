import type { VaultStore } from './vaultStore'

const DB_NAME = 'coffer'
const DB_VERSION = 1

// Object stores:
//   settings — key/value strings: "salt", "verificationToken", "lockTimeoutMinutes"
//   months   — key = YYYY-MM, value = encrypted MonthData JSON

function openDatabase(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
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

function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Vault kept inside the browser's IndexedDB — used by the web/mobile build.
export async function openIdbStore(idb: IDBFactory = indexedDB): Promise<VaultStore> {
  const db = await openDatabase(idb)

  return {
    readSetting: key =>
      settle<string | undefined>(db.transaction('settings', 'readonly').objectStore('settings').get(key)),

    writeSetting: async (key, value) => {
      await settle(db.transaction('settings', 'readwrite').objectStore('settings').put(value, key))
    },

    readMonthCiphertext: monthKey =>
      settle<string | undefined>(db.transaction('months', 'readonly').objectStore('months').get(monthKey)),

    writeMonthCiphertexts: entries =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction('months', 'readwrite')
        const store = tx.objectStore('months')
        for (const [monthKey, ciphertext] of entries) store.put(ciphertext, monthKey)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),

    listMonths: async () => {
      const keys = await settle(db.transaction('months', 'readonly').objectStore('months').getAllKeys())
      return keys.map(String)
    },
  }
}
