import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { useMonthClosing } from './useMonthClosing'
import { useSession } from './useSession'
import { writeMonth, readMonth } from '../lib/db'
import { openIdbStore } from '../lib/idbStore'
import type { VaultStore } from '../lib/vaultStore'
import { deriveKey, generateSalt } from '../lib/crypto'
import type { MonthData } from '../types'

vi.mock('./useSession')

const OCT = '2026-10'
const NOV = '2026-11'

async function makeContext() {
  const db = await openIdbStore(new IDBFactory())
  const key = await deriveKey('test-pass', generateSalt())
  return { db, key }
}

function mockSession(db: VaultStore, key: CryptoKey) {
  vi.mocked(useSession).mockReturnValue({
    state: { status: 'unlocked', key },
    db,
    lockTimeout: 15,
    setup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setLockTimeout: vi.fn(),
  })
}

function october(): MonthData {
  return {
    key: OCT,
    incomes: [{ id: 'r', source: 'Receitas', currency: 'BRL', amount: 1000 }],
    expenses: [{ id: 'a', name: 'Aluguel', category: 'fixed', currency: 'BRL', debit: 400, credit: 0 }],
    saving: 100,
    adjustment: 0,
    budget: 0,
  }
}

async function setup() {
  const { db, key } = await makeContext()
  await writeMonth(db, OCT, october(), key)
  mockSession(db, key)
  const hook = renderHook(() => useMonthClosing(OCT))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return { db, key, hook }
}

describe('useMonthClosing', () => {
  it('reports an open month', async () => {
    const { hook } = await setup()
    expect(hook.result.current.closing).toBeNull()
    expect(hook.result.current.balance).toBe(500)
    expect(hook.result.current.nextKey).toBe(NOV)
  })

  it('close() freezes the month and carries the balance into the next month', async () => {
    const { db, key, hook } = await setup()

    await act(() => hook.result.current.close())

    expect(hook.result.current.closing?.balance).toBe(500)
    expect((await readMonth(db, OCT, key)).closing?.balance).toBe(500)
    const nov = await readMonth(db, NOV, key)
    expect(nov.incomes).toEqual([
      expect.objectContaining({ source: 'Balance from Oct 2026', amount: 500, carryFrom: OCT }),
    ])
  })

  it('reopen() unfreezes the month and keeps the carry entry', async () => {
    const { db, key, hook } = await setup()
    await act(() => hook.result.current.close())

    await act(() => hook.result.current.reopen())

    expect(hook.result.current.closing).toBeNull()
    expect((await readMonth(db, OCT, key)).closing).toBeUndefined()
    expect((await readMonth(db, NOV, key)).incomes).toHaveLength(1)
  })

  it('close() fails without writing anything when the next month is closed', async () => {
    const { db, key, hook } = await setup()
    await writeMonth(db, NOV, {
      key: NOV, expenses: [], incomes: [], saving: 0, adjustment: 0, budget: 0,
      closing: { balance: 0, closedAt: '2026-12-01T00:00:00.000Z' },
    }, key)

    await expect(act(() => hook.result.current.close())).rejects.toThrow(/Reopen Nov 2026 first/)
    expect((await readMonth(db, OCT, key)).closing).toBeUndefined()
  })

  it('picks up changes written to the month elsewhere', async () => {
    const { db, key, hook } = await setup()

    await act(() => writeMonth(db, OCT, { ...october(), saving: 0 }, key))

    await waitFor(() => expect(hook.result.current.balance).toBe(600))
  })
})
