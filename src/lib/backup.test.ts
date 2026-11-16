import { describe, it, expect, beforeEach } from 'vitest'
import { readMonth, writeMonth } from './db'
import { openMemoryStore } from '../test/memoryFileIO'
import type { VaultStore } from './vaultStore'
import { deriveKey, encrypt, generateSalt } from './crypto'
import { scopeToCurrency } from './currencyStore'
import { uint8ArrayToBase64 } from './encoding'
import { exportBackup, importBackup } from './backup'
import type { MonthData } from '../types'

const month1: MonthData = {
  key: '2025-01',
  expenses: [{ id: 'e1', name: 'Rent', category: 'fixed', debit: 1500, credit: 0 }],
  incomes: [{ id: 'i1', source: 'Salary', amount: 5000 }],
  saving: 300,
  adjustment: 0,
  budget: 0,
}

const month2: MonthData = {
  key: '2025-02',
  expenses: [{ id: 'e2', name: 'Groceries', category: 'other', debit: 800, credit: 0 }],
  incomes: [],
  saving: 0,
  adjustment: 50,
  budget: 0,
}

const TEST_PASSWORD = 'test-password'

async function makeSetup() {
  const db = await openMemoryStore()
  const salt = generateSalt()
  const key = await deriveKey(TEST_PASSWORD, salt)
  await db.writeSetting('salt', uint8ArrayToBase64(salt))
  return { db, key }
}

function makeFile(content: string): File {
  return new File([content], 'backup.coffer', { type: 'application/octet-stream' })
}

// A backup as written before currency environments existed: months keyed by bare YYYY-MM.
async function version1Backup(months: Record<string, MonthData>, key: CryptoKey, saltB64: string): Promise<string> {
  const payload = JSON.stringify({ version: 1, months })
  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new TextEncoder().encode(payload))
  writer.close()
  const compressed = new Uint8Array(await new Response(stream.readable).arrayBuffer())
  const ciphertext = await encrypt(uint8ArrayToBase64(compressed), key)
  return JSON.stringify({ version: 1, salt: saltB64, ciphertext })
}

describe('exportBackup / importBackup', () => {
  let db: VaultStore
  let key: CryptoKey

  beforeEach(async () => {
    ;({ db, key } = await makeSetup())
  })

  async function restoreInto(text: string): Promise<{ restored: VaultStore; restoreKey: CryptoKey; count: number }> {
    const restored = await openMemoryStore()
    const restoreKey = await deriveKey(TEST_PASSWORD, generateSalt())
    const count = await importBackup(makeFile(text), restored, TEST_PASSWORD, restoreKey)
    return { restored, restoreKey, count }
  }

  it('round-trip restores the months of every currency intact', async () => {
    const usdMonth1: MonthData = { ...month1, saving: 10 }
    await writeMonth(scopeToCurrency(db, 'BRL'), month1.key, month1, key)
    await writeMonth(scopeToCurrency(db, 'BRL'), month2.key, month2, key)
    await writeMonth(scopeToCurrency(db, 'USD'), usdMonth1.key, usdMonth1, key)

    const { restored, restoreKey, count } = await restoreInto(await exportBackup(db, key))

    expect(count).toBe(3)
    expect(await readMonth(scopeToCurrency(restored, 'BRL'), month1.key, restoreKey)).toEqual(month1)
    expect(await readMonth(scopeToCurrency(restored, 'BRL'), month2.key, restoreKey)).toEqual(month2)
    expect(await readMonth(scopeToCurrency(restored, 'USD'), month1.key, restoreKey)).toEqual(usdMonth1)
    expect((await restored.listMonths()).sort()).toEqual(['BRL:2025-01', 'BRL:2025-02', 'USD:2025-01'])
  })

  it('restores a backup made before currency environments into BRL', async () => {
    const saltB64 = (await db.readSetting('salt'))!
    const text = await version1Backup({ '2025-01': month1, '2025-02': month2 }, key, saltB64)

    const { restored, restoreKey, count } = await restoreInto(text)

    expect(count).toBe(2)
    expect((await restored.listMonths()).sort()).toEqual(['BRL:2025-01', 'BRL:2025-02'])
    expect(await readMonth(scopeToCurrency(restored, 'BRL'), month1.key, restoreKey)).toEqual(month1)
  })

  it('writes nothing when one month of the backup is invalid', async () => {
    const saltB64 = (await db.readSetting('salt'))!
    const broken = { ...month2, saving: -1 }
    const text = await version1Backup({ '2025-01': month1, '2025-02': broken }, key, saltB64)

    const restored = await openMemoryStore()
    await expect(importBackup(makeFile(text), restored, TEST_PASSWORD, key)).rejects.toThrow('Corrupted backup file')
    expect(await restored.listMonths()).toEqual([])
  })

  it('rejects a month filed under something that is not a month', async () => {
    const saltB64 = (await db.readSetting('salt'))!
    const text = await version1Backup({ 'not-a-month': month1 }, key, saltB64)

    const restored = await openMemoryStore()
    await expect(importBackup(makeFile(text), restored, TEST_PASSWORD, key)).rejects.toThrow('Corrupted backup file')
    expect(await restored.listMonths()).toEqual([])
  })

  it('export of empty db returns 0 months on import', async () => {
    const text = await exportBackup(db, key)
    const restoreDB = await openMemoryStore()
    const count = await importBackup(makeFile(text), restoreDB, TEST_PASSWORD, key)
    expect(count).toBe(0)
  })

  it('throws descriptive error when password is wrong', async () => {
    await writeMonth(scopeToCurrency(db, 'BRL'), month1.key, month1, key)
    const text = await exportBackup(db, key)

    await expect(importBackup(makeFile(text), db, 'wrong-password', key)).rejects.toThrow(
      'Invalid backup file or wrong password',
    )
  })

  it('throws descriptive error for corrupted file', async () => {
    await expect(importBackup(makeFile('not-a-valid-ciphertext'), db, TEST_PASSWORD, key)).rejects.toThrow()
  })
})
