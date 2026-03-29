import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { useCurrentMonth } from './useCurrentMonth'
import { useSession } from './useSession'
import { openDB, writeMonth, readMonth } from '../lib/db'
import { deriveKey, generateSalt } from '../lib/crypto'
import type { Expense, MonthData } from '../types'

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

const fixedExpense: Expense = {
  id: 'e1',
  name: 'Rent',
  category: 'fixed',
  currency: 'BRL',
  debit: 2000,
  credit: 0,
  fixed: true,
}

const nonFixedExpense: Expense = {
  id: 'e2',
  name: 'Dinner',
  category: 'other',
  currency: 'BRL',
  debit: 150,
  credit: 0,
  fixed: false,
}

describe('useCurrentMonth — navigation', () => {
  it('starts with the provided initial month key', () => {
    const { db, key } = { db: null as unknown as IDBDatabase, key: null as unknown as CryptoKey }
    vi.mocked(useSession).mockReturnValue({
      state: { status: 'unlocked', key },
      db,
      setup: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    })

    const { result } = renderHook(() => useCurrentMonth('2025-06'))
    expect(result.current.monthKey).toBe('2025-06')
  })

  it('goBack moves to the previous month', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useCurrentMonth('2025-06'))

    await act(async () => { await result.current.goBack() })

    expect(result.current.monthKey).toBe('2025-05')
  })

  it('goBack wraps correctly across year boundary', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useCurrentMonth('2025-01'))

    await act(async () => { await result.current.goBack() })

    expect(result.current.monthKey).toBe('2024-12')
  })

  it('goForward moves to the next month', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useCurrentMonth('2025-06'))

    await act(async () => { await result.current.goForward() })

    expect(result.current.monthKey).toBe('2025-07')
  })

  it('goForward wraps correctly across year boundary', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useCurrentMonth('2025-12'))

    await act(async () => { await result.current.goForward() })

    expect(result.current.monthKey).toBe('2026-01')
  })
})

describe('useCurrentMonth — cloning fixed expenses', () => {
  it('creates new month with only fixed expenses cloned', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-06', {
      key: '2025-06',
      expenses: [fixedExpense, nonFixedExpense],
      incomes: [{ id: 'i1', source: 'Salary', currency: 'BRL', amount: 5000 }],
      saving: 200,
      adjustment: 50,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useCurrentMonth('2025-06'))

    await act(async () => { await result.current.goForward() })

    expect(result.current.monthKey).toBe('2025-07')

    const newMonth = await readMonth(db, '2025-07', key)
    expect(newMonth.expenses).toHaveLength(1)
    expect(newMonth.expenses[0].name).toBe('Rent')
    expect(newMonth.expenses[0].fixed).toBe(true)
  })

  it('assigns new ids to cloned expenses', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-06', {
      key: '2025-06',
      expenses: [fixedExpense],
      incomes: [],
      saving: 0,
      adjustment: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useCurrentMonth('2025-06'))

    await act(async () => { await result.current.goForward() })

    const newMonth = await readMonth(db, '2025-07', key)
    expect(newMonth.expenses[0].id).not.toBe(fixedExpense.id)
  })

  it('does not clone incomes, saving or adjustment', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-06', {
      key: '2025-06',
      expenses: [fixedExpense],
      incomes: [{ id: 'i1', source: 'Salary', currency: 'BRL', amount: 5000 }],
      saving: 300,
      adjustment: -100,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useCurrentMonth('2025-06'))

    await act(async () => { await result.current.goForward() })

    const newMonth = await readMonth(db, '2025-07', key)
    expect(newMonth.incomes).toHaveLength(0)
    expect(newMonth.saving).toBe(0)
    expect(newMonth.adjustment).toBe(0)
  })

  it('creates empty month when current month has no fixed expenses', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, '2025-06', {
      key: '2025-06',
      expenses: [nonFixedExpense],
      incomes: [],
      saving: 0,
      adjustment: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useCurrentMonth('2025-06'))

    await act(async () => { await result.current.goForward() })

    const newMonth = await readMonth(db, '2025-07', key)
    expect(newMonth.expenses).toHaveLength(0)
  })
})

describe('useCurrentMonth — existing month not overwritten', () => {
  it('navigating to an existing month does not duplicate data', async () => {
    const { db, key } = await makeContext()

    const july: MonthData = {
      key: '2025-07',
      expenses: [{ id: 'e3', name: 'Custom', category: 'other', currency: 'USD', debit: 99, credit: 0, fixed: false }],
      incomes: [],
      saving: 0,
      adjustment: 0,
    }
    await writeMonth(db, '2025-06', {
      key: '2025-06',
      expenses: [fixedExpense],
      incomes: [],
      saving: 0,
      adjustment: 0,
    }, key)
    await writeMonth(db, '2025-07', july, key)
    mockSession(db, key)

    const { result } = renderHook(() => useCurrentMonth('2025-06'))

    await act(async () => { await result.current.goForward() })

    const loaded = await readMonth(db, '2025-07', key)
    expect(loaded.expenses).toHaveLength(1)
    expect(loaded.expenses[0].name).toBe('Custom')
  })
})
