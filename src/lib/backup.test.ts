import { describe, it, expect, beforeEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { openDB, writeMonth, writeSetting } from './db'
import { deriveKey, generateSalt } from './crypto'
import { uint8ArrayToBase64 } from './encoding'
import { exportBackup, importBackup } from './backup'
import type { MonthData } from '../types'

const month1: MonthData = {
  key: '2025-01',
  expenses: [{ id: 'e1', name: 'Rent', category: 'fixed', currency: 'BRL', debit: 1500, credit: 0, fixed: true }],
  incomes: [{ id: 'i1', source: 'Salary', currency: 'USD', amount: 5000 }],
  saving: 300,
  adjustment: 0,
  budget: 0,
}

const month2: MonthData = {
  key: '2025-02',
  expenses: [{ id: 'e2', name: 'Groceries', category: 'other', currency: 'BRL', debit: 800, credit: 0, fixed: false }],
  incomes: [],
  saving: 0,
  adjustment: 50,
  budget: 0,
}

const TEST_PASSWORD = 'test-password'

async function makeSetup() {
  const db = await openDB(new IDBFactory())
  const salt = generateSalt()
  const key = await deriveKey(TEST_PASSWORD, salt)
  await writeSetting(db, 'salt', uint8ArrayToBase64(salt))
  return { db, key }
}

function makeFile(content: string): File {
  return new File([content], 'backup.coffer', { type: 'application/octet-stream' })
}

describe('exportBackup / importBackup', () => {
  let db: IDBDatabase
  let key: CryptoKey

  beforeEach(async () => {
    ;({ db, key } = await makeSetup())
  })

  it('round-trip restores all months intact', async () => {
    await writeMonth(db, month1.key, month1, key)
    await writeMonth(db, month2.key, month2, key)

    const blob = await exportBackup(db, key)
    const text = await blob.text()

    const restoreDB = await openDB(new IDBFactory())
    const restoreKey = await deriveKey(TEST_PASSWORD, generateSalt())
    const count = await importBackup(makeFile(text), restoreDB, TEST_PASSWORD, restoreKey)

    expect(count).toBe(2)

    const { readMonth } = await import('./db')
    const r1 = await readMonth(restoreDB, month1.key, restoreKey)
    const r2 = await readMonth(restoreDB, month2.key, restoreKey)
    expect(r1).toEqual(month1)
    expect(r2).toEqual(month2)
  })

  it('export of empty db returns 0 months on import', async () => {
    const blob = await exportBackup(db, key)
    const text = await blob.text()
    const restoreDB = await openDB(new IDBFactory())
    const count = await importBackup(makeFile(text), restoreDB, TEST_PASSWORD, key)
    expect(count).toBe(0)
  })

  it('throws descriptive error when password is wrong', async () => {
    await writeMonth(db, month1.key, month1, key)
    const blob = await exportBackup(db, key)
    const text = await blob.text()

    await expect(importBackup(makeFile(text), db, 'wrong-password', key)).rejects.toThrow(
      'Invalid backup file or wrong password',
    )
  })

  it('throws descriptive error for corrupted file', async () => {
    await expect(importBackup(makeFile('not-a-valid-ciphertext'), db, TEST_PASSWORD, key)).rejects.toThrow()
  })
})
