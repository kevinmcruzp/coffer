import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useIncomes } from './useIncomes'
import { useSession } from './useSession'
import { writeMonth } from '../lib/db'
import { openMemoryStore } from '../test/memoryFileIO'
import type { VaultStore } from '../lib/vaultStore'
import { deriveKey, generateSalt } from '../lib/crypto'
import type { Income } from '../types'

vi.mock('./useSession')

const MONTH_KEY = '2025-03'

const baseIncome: Income = {
  id: 'i1',
  source: 'Salary',
  currency: 'BRL',
  amount: 5000,
}

async function makeContext() {
  const db = await openMemoryStore()
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

describe('useIncomes — empty month', () => {
  it('returns empty incomes when month does not exist', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.incomes).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns zero totals when incomes are empty', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totals).toEqual({ BRL: 0, USD: 0, CLP: 0 })
  })
})

describe('useIncomes — loading existing month', () => {
  it('loads incomes from DB', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [],
      incomes: [baseIncome],
      saving: 0,
      adjustment: 0,
      budget: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.incomes).toEqual([baseIncome])
  })
})

describe('useIncomes — add', () => {
  it('adds an income and persists it', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const input: Omit<Income, 'id'> = {
      source: 'Freelance',
      currency: 'USD',
      amount: 1200,
    }

    await act(async () => {
      await result.current.add(input)
    })

    expect(result.current.incomes).toHaveLength(1)
    expect(result.current.incomes[0]).toMatchObject(input)
    expect(result.current.incomes[0].id).toBeTruthy()
  })

  it('rejects zero amount', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.add({ source: 'Bad', currency: 'BRL', amount: 0 })
      }),
    ).rejects.toThrow()
  })

  it('rejects negative amount', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.add({ source: 'Bad', currency: 'BRL', amount: -100 })
      }),
    ).rejects.toThrow()
  })
})

describe('useIncomes — update', () => {
  it('updates an existing income', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [],
      incomes: [baseIncome],
      saving: 0,
      adjustment: 0,
      budget: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.update('i1', { source: 'Bonus', amount: 8000 })
    })

    const updated = result.current.incomes.find(i => i.id === 'i1')
    expect(updated?.source).toBe('Bonus')
    expect(updated?.amount).toBe(8000)
  })

  it('throws when income id is not found', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.update('nonexistent', { source: 'X' })
      }),
    ).rejects.toThrow()
  })
})

describe('useIncomes — remove', () => {
  it('removes an income', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [],
      incomes: [baseIncome],
      saving: 0,
      adjustment: 0,
      budget: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.remove('i1')
    })

    expect(result.current.incomes).toHaveLength(0)
  })
})

describe('useIncomes — totals', () => {
  it('computes total per currency', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [],
      incomes: [
        baseIncome, // BRL 5000
        { id: 'i2', source: 'Bonus', currency: 'BRL', amount: 1000 },
        { id: 'i3', source: 'Consulting', currency: 'USD', amount: 500 },
      ],
      saving: 0,
      adjustment: 0,
      budget: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totals.BRL).toBe(6000)
    expect(result.current.totals.USD).toBe(500)
  })
})

describe('useIncomes — closed months and carried-over entries', () => {
  const closing = { balance: 0, closedAt: '2026-11-06T12:00:00.000Z' }
  const carry: Income = { id: 'c1', source: 'Balance from Feb 2025', currency: 'BRL', amount: 300, carryFrom: '2025-02' }

  async function load(incomes: Income[], closed: boolean) {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY, expenses: [], incomes, saving: 0, adjustment: 0, budget: 0,
      ...(closed ? { closing } : {}),
    }, key)
    mockSession(db, key)
    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))
    return { db, key, result }
  }

  it('exposes whether the month is closed', async () => {
    const { result } = await load([], true)
    expect(result.current.closed).toBe(true)
  })

  it('rejects add, update and remove on a closed month', async () => {
    const { result } = await load([baseIncome], true)
    await expect(result.current.add({ source: 'X', currency: 'BRL', amount: 1 })).rejects.toThrow(/closed/)
    await expect(result.current.update('i1', { amount: 1 })).rejects.toThrow(/closed/)
    await expect(result.current.remove('i1')).rejects.toThrow(/closed/)
  })

  it('rejects editing or removing a carried-over entry', async () => {
    const { result } = await load([carry], false)
    await expect(result.current.update('c1', { amount: 1 })).rejects.toThrow(/closing/)
    await expect(result.current.remove('c1')).rejects.toThrow(/closing/)
  })

  it('never turns a regular income into a carried-over entry', async () => {
    const { result } = await load([baseIncome], false)
    await act(() => result.current.update('i1', { carryFrom: '2025-02' }))
    expect(result.current.incomes[0].carryFrom).toBeUndefined()
  })

  it('counts a negative carried-over entry in the totals', async () => {
    const { result } = await load([baseIncome, { ...carry, amount: -200 }], false)
    expect(result.current.totals.BRL).toBe(4800)
  })

  it('refreshes when the month is written elsewhere', async () => {
    const { db, key, result } = await load([], false)
    await act(() => writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY, expenses: [], incomes: [baseIncome], saving: 0, adjustment: 0, budget: 0,
    }, key))
    await waitFor(() => expect(result.current.incomes).toHaveLength(1))
  })
})
