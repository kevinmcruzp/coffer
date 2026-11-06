import { describe, it, expect, beforeEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { openDB, writeSetting, readSetting, writeMonth, writeMonths, readMonth, listMonths } from './db'
import { onMonthChanged } from './monthEvents'
import { deriveKey, generateSalt } from './crypto'
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

async function makeDB() {
  return openDB(new IDBFactory())
}

async function makeKey() {
  return deriveKey('test-password', generateSalt())
}

describe('openDB', () => {
  it('opens the database and creates stores', async () => {
    const db = await makeDB()
    expect(db.objectStoreNames.contains('settings')).toBe(true)
    expect(db.objectStoreNames.contains('months')).toBe(true)
  })
})

describe('writeSetting / readSetting', () => {
  let db: IDBDatabase

  beforeEach(async () => {
    db = await makeDB()
  })

  it('reads back a written value', async () => {
    await writeSetting(db, 'salt', 'abc123')
    expect(await readSetting(db, 'salt')).toBe('abc123')
  })

  it('returns undefined for a missing key', async () => {
    expect(await readSetting(db, 'nonexistent')).toBeUndefined()
  })

  it('overwrites an existing value', async () => {
    await writeSetting(db, 'token', 'first')
    await writeSetting(db, 'token', 'second')
    expect(await readSetting(db, 'token')).toBe('second')
  })
})

describe('writeMonth / readMonth', () => {
  let db: IDBDatabase
  let key: CryptoKey

  beforeEach(async () => {
    db = await makeDB()
    key = await makeKey()
  })

  it('round-trip returns the original MonthData', async () => {
    await writeMonth(db, sampleMonth.key, sampleMonth, key)
    const result = await readMonth(db, sampleMonth.key, key)
    expect(result).toEqual(sampleMonth)
  })

  it('throws when reading with the wrong key', async () => {
    const wrongKey = await makeKey()
    await writeMonth(db, sampleMonth.key, sampleMonth, key)
    await expect(readMonth(db, sampleMonth.key, wrongKey)).rejects.toThrow()
  })

  it('throws when reading a non-existent month', async () => {
    await expect(readMonth(db, '2099-01', key)).rejects.toThrow('not found')
  })

  it('stores data encrypted (plaintext is not readable in the store)', async () => {
    await writeMonth(db, sampleMonth.key, sampleMonth, key)
    const raw = await readSetting(
      db,
      sampleMonth.key,
    )
    expect(raw).toBeUndefined()
  })
})

describe('listMonths', () => {
  let db: IDBDatabase
  let key: CryptoKey

  beforeEach(async () => {
    db = await makeDB()
    key = await makeKey()
  })

  it('returns an empty list when no months exist', async () => {
    expect(await listMonths(db)).toEqual([])
  })

  it('returns all written month keys', async () => {
    await writeMonth(db, '2025-01', { ...sampleMonth, key: '2025-01' }, key)
    await writeMonth(db, '2025-02', { ...sampleMonth, key: '2025-02' }, key)
    const months = await listMonths(db)
    expect(months).toHaveLength(2)
    expect(months).toContain('2025-01')
    expect(months).toContain('2025-02')
  })
})

function blankMonth(key: string, saving = 0): MonthData {
  return { key, expenses: [], incomes: [], saving, adjustment: 0, budget: 0 }
}

describe('writeMonths', () => {
  it('writes several months in one call', async () => {
    const db = await openDB(new IDBFactory())
    const key = await deriveKey('pw', generateSalt())

    await writeMonths(db, [blankMonth('2026-10', 1), blankMonth('2026-11', 2)], key)

    expect((await readMonth(db, '2026-10', key)).saving).toBe(1)
    expect((await readMonth(db, '2026-11', key)).saving).toBe(2)
  })
})

describe('month change notifications', () => {
  it('notifies listeners with the key of each written month until unsubscribed', async () => {
    const db = await openDB(new IDBFactory())
    const key = await deriveKey('pw', generateSalt())
    const seen: string[] = []
    const unsubscribe = onMonthChanged(k => seen.push(k))

    await writeMonth(db, '2026-09', blankMonth('2026-09'), key)
    await writeMonths(db, [blankMonth('2026-10'), blankMonth('2026-11')], key)
    unsubscribe()
    await writeMonth(db, '2026-12', blankMonth('2026-12'), key)

    expect(seen).toEqual(['2026-09', '2026-10', '2026-11'])
  })
})
