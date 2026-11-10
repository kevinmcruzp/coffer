import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { useExpenses } from './useExpenses'
import { useSession } from './useSession'
import { writeMonth } from '../lib/db'
import { openIdbStore } from '../lib/idbStore'
import type { VaultStore } from '../lib/vaultStore'
import { deriveKey, generateSalt } from '../lib/crypto'
import type { Expense } from '../types'

vi.mock('./useSession')

const MONTH_KEY = '2025-03'

const baseExpense: Expense = {
  id: 'e1',
  name: 'Rent',
  category: 'fixed',
  currency: 'BRL',
  debit: 1500,
  credit: 0,
}

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

describe('useExpenses — empty month', () => {
  it('returns empty expenses when month does not exist', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.expenses).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns zero totals when expenses are empty', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totals.BRL).toEqual({ debit: 0, credit: 0, total: 0 })
    expect(result.current.totals.USD).toEqual({ debit: 0, credit: 0, total: 0 })
  })
})

describe('useExpenses — loading existing month', () => {
  it('loads expenses from DB', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [baseExpense],
      incomes: [],
      saving: 0,
      adjustment: 0,
      budget: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.expenses).toEqual([baseExpense])
  })
})

describe('useExpenses — add', () => {
  it('adds an expense and persists it', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const input: Omit<Expense, 'id'> = {
      name: 'Coffee',
      category: 'other',
      currency: 'BRL',
      debit: 0,
      credit: 25,
    }

    await act(async () => {
      await result.current.add(input)
    })

    expect(result.current.expenses).toHaveLength(1)
    expect(result.current.expenses[0]).toMatchObject(input)
    expect(result.current.expenses[0].id).toBeTruthy()
  })

  it('rejects when both debit and credit are zero', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.add({
          name: 'Bad',
          category: 'other',
          currency: 'BRL',
          debit: 0,
          credit: 0,        })
      }),
    ).rejects.toThrow()
  })

  it('rejects negative debit values', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.add({
          name: 'Bad',
          category: 'other',
          currency: 'BRL',
          debit: -10,
          credit: 0,        })
      }),
    ).rejects.toThrow()
  })
})

describe('useExpenses — update', () => {
  it('updates an existing expense', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [baseExpense],
      incomes: [],
      saving: 0,
      adjustment: 0,
      budget: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.update('e1', { name: 'Updated Rent', debit: 2000 })
    })

    const updated = result.current.expenses.find(e => e.id === 'e1')
    expect(updated?.name).toBe('Updated Rent')
    expect(updated?.debit).toBe(2000)
  })

  it('throws when expense id is not found', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.update('nonexistent', { name: 'X' })
      }),
    ).rejects.toThrow()
  })
})

describe('useExpenses — remove', () => {
  it('removes an expense', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [baseExpense],
      incomes: [],
      saving: 0,
      adjustment: 0,
      budget: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.remove('e1')
    })

    expect(result.current.expenses).toHaveLength(0)
  })
})

describe('useExpenses — totals', () => {
  it('computes totals per currency', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [
        baseExpense, // BRL debit 1500
        { id: 'e2', name: 'Bill', category: 'other', currency: 'BRL', debit: 0, credit: 200 },
        { id: 'e3', name: 'Sub', category: 'other', currency: 'USD', debit: 0, credit: 15 },
      ],
      incomes: [],
      saving: 0,
      adjustment: 0,
      budget: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totals.BRL).toEqual({ debit: 1500, credit: 200, total: 1700 })
    expect(result.current.totals.USD).toEqual({ debit: 0, credit: 15, total: 15 })
  })
})

describe('useExpenses — closed month', () => {
  async function loadClosed() {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY, expenses: [baseExpense], incomes: [], saving: 0, adjustment: 0, budget: 0,
      closing: { balance: 0, closedAt: '2026-11-06T12:00:00.000Z' },
    }, key)
    mockSession(db, key)
    const { result } = renderHook(() => useExpenses(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))
    return result
  }

  it('exposes whether the month is closed', async () => {
    const result = await loadClosed()
    expect(result.current.closed).toBe(true)
  })

  it('rejects add, update and remove', async () => {
    const result = await loadClosed()
    const { name, category, currency, debit, credit } = baseExpense
    await expect(result.current.add({ name, category, currency, debit, credit })).rejects.toThrow(/closed/)
    await expect(result.current.update(baseExpense.id, { debit: 1 })).rejects.toThrow(/closed/)
    await expect(result.current.remove(baseExpense.id)).rejects.toThrow(/closed/)
  })
})
