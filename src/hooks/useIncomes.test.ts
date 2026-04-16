import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { useIncomes } from './useIncomes'
import { useSession } from './useSession'
import { openDB, writeMonth } from '../lib/db'
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
  const db = await openDB(new IDBFactory())
  const key = await deriveKey('test-pass', generateSalt())
  return { db, key }
}

function mockSession(db: IDBDatabase, key: CryptoKey) {
  vi.mocked(useSession).mockReturnValue({
    state: { status: 'unlocked', key },
    db,
    setup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
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
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useIncomes(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.totals.BRL).toBe(6000)
    expect(result.current.totals.USD).toBe(500)
  })
})
