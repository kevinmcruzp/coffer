import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { useYearSummary } from './useYearSummary'
import { useSession } from './useSession'
import { openDB, writeMonth } from '../lib/db'
import { deriveKey, generateSalt } from '../lib/crypto'
import type { MonthData } from '../types'

vi.mock('./useSession')

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

const jan: MonthData = {
  key: '2025-01',
  expenses: [
    { id: 'e1', name: 'Rent', category: 'fixed', currency: 'BRL', debit: 600, credit: 0, fixed: true },
    { id: 'e2', name: 'Card', category: 'other', currency: 'BRL', debit: 0, credit: 200, fixed: false },
  ],
  incomes: [{ id: 'i1', source: 'Salary', currency: 'BRL', amount: 3000 }],
  saving: 400,
  adjustment: 50,
}

const feb: MonthData = {
  key: '2025-02',
  expenses: [
    { id: 'e3', name: 'Rent', category: 'fixed', currency: 'BRL', debit: 600, credit: 0, fixed: true },
  ],
  incomes: [{ id: 'i2', source: 'Salary', currency: 'BRL', amount: 3000 }],
  saving: 500,
  adjustment: 0,
}

describe('useYearSummary — basic', () => {
  it('returns loading=true initially', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useYearSummary(2025))
    expect(result.current.loading).toBe(true)
  })

  it('returns empty rows for a year with no data', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useYearSummary(2025))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.rows).toHaveLength(0)
    expect(result.current.error).toBeNull()
  })

  it('returns only months from the requested year', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-01', jan, key)
    await writeMonth(db, '2024-12', { ...jan, key: '2024-12' }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useYearSummary(2025))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0].monthKey).toBe('2025-01')
  })

  it('sorts months chronologically', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-02', feb, key)
    await writeMonth(db, '2025-01', jan, key)
    mockSession(db, key)

    const { result } = renderHook(() => useYearSummary(2025))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.rows.map(r => r.monthKey)).toEqual(['2025-01', '2025-02'])
  })
})

describe('useYearSummary — row calculations', () => {
  it('computes income, debit, credit, saving, adjustment per row', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-01', jan, key)
    mockSession(db, key)

    const { result } = renderHook(() => useYearSummary(2025))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const row = result.current.rows[0]
    expect(row.income.BRL).toBe(3000)
    expect(row.debit.BRL).toBe(600)
    expect(row.credit.BRL).toBe(200)
    expect(row.saving).toBe(400)
    expect(row.adjustment).toBe(50)
  })

  it('computes BRL balance = income - debit - credit - saving + adjustment', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-01', jan, key)
    mockSession(db, key)

    const { result } = renderHook(() => useYearSummary(2025))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const row = result.current.rows[0]
    // 3000 - 600 - 200 - 400 + 50 = 1850
    expect(row.balance.BRL).toBe(1850)
  })
})

describe('useYearSummary — annual totals', () => {
  it('sums income, debit, credit, saving, adjustment across months', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-01', jan, key)
    await writeMonth(db, '2025-02', feb, key)
    mockSession(db, key)

    const { result } = renderHook(() => useYearSummary(2025))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const t = result.current.totals
    expect(t.income.BRL).toBe(6000)
    expect(t.debit.BRL).toBe(1200)
    expect(t.credit.BRL).toBe(200)
    expect(t.saving).toBe(900)
    expect(t.adjustment).toBe(50)
  })

  it('computes annual balance correctly', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-01', jan, key)
    await writeMonth(db, '2025-02', feb, key)
    mockSession(db, key)

    const { result } = renderHook(() => useYearSummary(2025))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // 6000 - 1200 - 200 - 900 + 50 = 3750
    expect(result.current.totals.balance.BRL).toBe(3750)
  })
})
