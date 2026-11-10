import { describe, it, expect, beforeEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { writeMonth, writeMonths, readMonth } from './db'
import { openIdbStore } from './idbStore'
import { openFileStore } from './fileStore'
import { onMonthChanged } from './monthEvents'
import { deriveKey, generateSalt } from './crypto'
import { createMemoryFileIO } from '../test/memoryFileIO'
import type { VaultStore } from './vaultStore'
import type { MonthData } from '../types'

const sampleMonth: MonthData = {
  key: '2025-03',
  expenses: [
    {
      id: 'e1',
      name: 'Rent',
      category: 'fixed',
      currency: 'BRL',
      debit: 1500,
      credit: 0,
    },
  ],
  incomes: [
    {
      id: 'i1',
      source: 'Salary',
      currency: 'USD',
      amount: 5000,
    },
  ],
  saving: 300,
  adjustment: 0,
  budget: 0,
}

function blankMonth(key: string, saving = 0): MonthData {
  return { key, expenses: [], incomes: [], saving, adjustment: 0, budget: 0 }
}

async function makeKey() {
  return deriveKey('test-password', generateSalt())
}

// The same contract runs against every VaultStore implementation.
const implementations: [string, () => Promise<VaultStore>][] = [
  ['IndexedDB store', () => openIdbStore(new IDBFactory())],
  ['file store', () => openFileStore(createMemoryFileIO(), 'vault.coffer')],
]

describe.each(implementations)('%s', (_name, makeStore) => {
  let store: VaultStore
  let key: CryptoKey

  beforeEach(async () => {
    store = await makeStore()
    key = await makeKey()
  })

  describe('settings', () => {
    it('reads back a written value', async () => {
      await store.writeSetting('salt', 'abc123')
      expect(await store.readSetting('salt')).toBe('abc123')
    })

    it('returns undefined for a missing key', async () => {
      expect(await store.readSetting('nonexistent')).toBeUndefined()
    })

    it('overwrites an existing value', async () => {
      await store.writeSetting('token', 'first')
      await store.writeSetting('token', 'second')
      expect(await store.readSetting('token')).toBe('second')
    })

    it('keeps settings and months apart', async () => {
      await writeMonth(store, sampleMonth.key, sampleMonth, key)
      expect(await store.readSetting(sampleMonth.key)).toBeUndefined()
    })
  })

  describe('writeMonth / readMonth', () => {
    it('round-trip returns the original MonthData', async () => {
      await writeMonth(store, sampleMonth.key, sampleMonth, key)
      expect(await readMonth(store, sampleMonth.key, key)).toEqual(sampleMonth)
    })

    it('throws when reading with the wrong key', async () => {
      const wrongKey = await makeKey()
      await writeMonth(store, sampleMonth.key, sampleMonth, key)
      await expect(readMonth(store, sampleMonth.key, wrongKey)).rejects.toThrow()
    })

    it('throws when reading a non-existent month', async () => {
      await expect(readMonth(store, '2099-01', key)).rejects.toThrow('not found')
    })

    it('stores only ciphertext', async () => {
      await writeMonth(store, sampleMonth.key, sampleMonth, key)
      const raw = await store.readMonthCiphertext(sampleMonth.key)
      expect(raw).toBeDefined()
      expect(raw).not.toContain('Rent')
      expect(raw).not.toContain('Salary')
    })

    it('overwrites an existing month', async () => {
      await writeMonth(store, '2025-03', blankMonth('2025-03', 1), key)
      await writeMonth(store, '2025-03', blankMonth('2025-03', 2), key)
      expect((await readMonth(store, '2025-03', key)).saving).toBe(2)
    })
  })

  describe('listMonths', () => {
    it('returns an empty list when no months exist', async () => {
      expect(await store.listMonths()).toEqual([])
    })

    it('returns all written month keys', async () => {
      await writeMonth(store, '2025-01', blankMonth('2025-01'), key)
      await writeMonth(store, '2025-02', blankMonth('2025-02'), key)
      const months = await store.listMonths()
      expect(months).toHaveLength(2)
      expect(months).toContain('2025-01')
      expect(months).toContain('2025-02')
    })
  })

  describe('writeMonths', () => {
    it('writes several months in one call', async () => {
      await writeMonths(store, [blankMonth('2026-10', 1), blankMonth('2026-11', 2)], key)

      expect((await readMonth(store, '2026-10', key)).saving).toBe(1)
      expect((await readMonth(store, '2026-11', key)).saving).toBe(2)
    })
  })

  describe('month change notifications', () => {
    it('notifies listeners with the key of each written month until unsubscribed', async () => {
      const seen: string[] = []
      const unsubscribe = onMonthChanged(k => seen.push(k))

      await writeMonth(store, '2026-09', blankMonth('2026-09'), key)
      await writeMonths(store, [blankMonth('2026-10'), blankMonth('2026-11')], key)
      unsubscribe()
      await writeMonth(store, '2026-12', blankMonth('2026-12'), key)

      expect(seen).toEqual(['2026-09', '2026-10', '2026-11'])
    })
  })
})
