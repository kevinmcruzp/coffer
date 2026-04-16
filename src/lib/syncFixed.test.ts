import { describe, it, expect } from 'vitest'
import { syncFixed } from './syncFixed'
import type { Expense, MonthData } from '../types'

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: crypto.randomUUID(),
    name: 'Rent',
    category: 'fixed',
    currency: 'BRL',
    debit: 1500,
    credit: 0,
    fixed: true,
    ...overrides,
  }
}

function makeMonth(expenses: Expense[], key = '2025-03'): MonthData {
  return { key, expenses, incomes: [], saving: 0, adjustment: 0, budget: 0 }
}

describe('syncFixed', () => {
  it('returns fixed expenses from prev that are missing in current', () => {
    const prev = makeMonth([
      makeExpense({ name: 'Rent' }),
      makeExpense({ name: 'Internet' }),
    ])
    const current = makeMonth([], '2025-04')

    const result = syncFixed(prev, current)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Rent')
    expect(result[1].name).toBe('Internet')
  })

  it('does not include non-fixed expenses', () => {
    const prev = makeMonth([
      makeExpense({ name: 'Rent', fixed: true }),
      makeExpense({ name: 'Coffee', fixed: false }),
    ])
    const current = makeMonth([], '2025-04')

    const result = syncFixed(prev, current)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Rent')
  })

  it('skips expenses that already exist in current (by name + category)', () => {
    const prev = makeMonth([
      makeExpense({ name: 'Rent', category: 'fixed' }),
      makeExpense({ name: 'Internet', category: 'fixed' }),
    ])
    const current = makeMonth([
      makeExpense({ name: 'Rent', category: 'fixed' }),
    ], '2025-04')

    const result = syncFixed(prev, current)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Internet')
  })

  it('comparison is case-insensitive', () => {
    const prev = makeMonth([
      makeExpense({ name: 'RENT', category: 'fixed' }),
    ])
    const current = makeMonth([
      makeExpense({ name: 'rent', category: 'fixed' }),
    ], '2025-04')

    const result = syncFixed(prev, current)

    expect(result).toHaveLength(0)
  })

  it('same name but different category is not a duplicate', () => {
    const prev = makeMonth([
      makeExpense({ name: 'Gym', category: 'fixed' }),
    ])
    const current = makeMonth([
      makeExpense({ name: 'Gym', category: 'other' }),
    ], '2025-04')

    const result = syncFixed(prev, current)

    expect(result).toHaveLength(1)
  })

  it('returns empty array when prev has no fixed expenses', () => {
    const prev = makeMonth([
      makeExpense({ name: 'Coffee', fixed: false }),
    ])
    const current = makeMonth([], '2025-04')

    const result = syncFixed(prev, current)

    expect(result).toHaveLength(0)
  })

  it('returns empty array when all fixed already exist', () => {
    const prev = makeMonth([
      makeExpense({ name: 'Rent' }),
    ])
    const current = makeMonth([
      makeExpense({ name: 'Rent' }),
    ], '2025-04')

    const result = syncFixed(prev, current)

    expect(result).toHaveLength(0)
  })

  it('strips the id from returned expenses', () => {
    const prev = makeMonth([makeExpense({ name: 'Rent' })])
    const current = makeMonth([], '2025-04')

    const result = syncFixed(prev, current)

    expect(result[0]).not.toHaveProperty('id')
  })

  it('returns expenses with fixed: false', () => {
    const prev = makeMonth([makeExpense({ name: 'Rent', fixed: true })])
    const current = makeMonth([], '2025-04')

    const result = syncFixed(prev, current)

    expect(result[0].fixed).toBe(false)
  })
})
