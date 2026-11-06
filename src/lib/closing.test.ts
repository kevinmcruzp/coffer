import { describe, it, expect } from 'vitest'
import { monthBalance, closeMonth, reopenMonth, assertMonthOpen, emptyMonth } from './closing'
import type { MonthData } from '../types'

const CLOSED_AT = '2026-11-06T12:00:00.000Z'

function october(): MonthData {
  return {
    key: '2026-10',
    incomes: [
      { id: 'r', source: 'Receitas', currency: 'BRL', amount: 4828.40 },
      { id: 's', source: 'Saldo atual', currency: 'BRL', amount: 1539.30 },
      { id: 'u', source: 'Freela', currency: 'USD', amount: 300 },
    ],
    expenses: [
      { id: 'a', name: 'Aluguel', category: 'fixed', currency: 'BRL', debit: 2114.03, credit: 0 },
      { id: 'b', name: 'Cartão', category: 'other', currency: 'BRL', debit: 0, credit: 2092.55 },
      { id: 'c', name: 'Netflix', category: 'other', currency: 'USD', debit: 0, credit: 20 },
    ],
    saving: 1591.93,
    adjustment: 0,
    budget: 0,
  }
}

function november(): MonthData {
  return {
    ...emptyMonth('2026-11'),
    incomes: [{ id: 'n', source: 'Receitas', currency: 'BRL', amount: 4828.40 }],
  }
}

describe('monthBalance', () => {
  it('is BRL income − debit − credit − saving + adjustment, ignoring other currencies', () => {
    expect(monthBalance(october())).toBe(569.19)
  })

  it('includes the adjustment', () => {
    expect(monthBalance({ ...october(), adjustment: 0.01 })).toBe(569.20)
  })

  it('is 0 for an empty month', () => {
    expect(monthBalance(emptyMonth('2026-10'))).toBe(0)
  })
})

describe('closeMonth', () => {
  it('records the balance and closing time on the closed month', () => {
    const { current } = closeMonth(october(), november(), CLOSED_AT)
    expect(current.closing).toEqual({ balance: 569.19, closedAt: CLOSED_AT })
  })

  it('carries the balance into the next month as a linked income', () => {
    const { next } = closeMonth(october(), november(), CLOSED_AT)
    const carry = next.incomes.find(i => i.carryFrom === '2026-10')
    expect(carry).toMatchObject({ source: 'Balance from Oct 2026', currency: 'BRL', amount: 569.19 })
  })

  it('keeps the other incomes of the next month untouched', () => {
    const { next } = closeMonth(october(), november(), CLOSED_AT)
    expect(next.incomes.find(i => i.id === 'n')).toEqual(november().incomes[0])
  })

  it('updates the existing carry entry instead of duplicating it when re-closing', () => {
    const first = closeMonth(october(), november(), CLOSED_AT)
    const edited = { ...reopenMonth(first.current), adjustment: 0.01 }
    const { next } = closeMonth(edited, first.next, CLOSED_AT)
    const carries = next.incomes.filter(i => i.carryFrom === '2026-10')
    expect(carries).toHaveLength(1)
    expect(carries[0].amount).toBe(569.20)
  })

  it('carries a negative balance as a negative income', () => {
    const { next } = closeMonth({ ...october(), saving: 2200 }, november(), CLOSED_AT)
    expect(next.incomes.find(i => i.carryFrom === '2026-10')?.amount).toBe(-38.88)
  })

  it('creates no carry entry when the balance is zero and removes a stale one', () => {
    const first = closeMonth(october(), november(), CLOSED_AT)
    const zeroed = { ...reopenMonth(first.current), adjustment: -569.19 }
    const { current, next } = closeMonth(zeroed, first.next, CLOSED_AT)
    expect(current.closing?.balance).toBe(0)
    expect(next.incomes.some(i => i.carryFrom === '2026-10')).toBe(false)
  })

  it('does not mutate its inputs', () => {
    const cur = october()
    const nxt = november()
    closeMonth(cur, nxt, CLOSED_AT)
    expect(cur.closing).toBeUndefined()
    expect(nxt.incomes).toHaveLength(1)
  })

  it('rejects closing a month that is already closed', () => {
    const { current } = closeMonth(october(), november(), CLOSED_AT)
    expect(() => closeMonth(current, november(), CLOSED_AT)).toThrow(/already closed/)
  })

  it('rejects closing when the next month is closed', () => {
    const closedNext = { ...november(), closing: { balance: 0, closedAt: CLOSED_AT } }
    expect(() => closeMonth(october(), closedNext, CLOSED_AT)).toThrow(/Reopen Nov 2026 first/)
  })

  it('rejects a next month that is not the following month', () => {
    expect(() => closeMonth(october(), emptyMonth('2026-12'), CLOSED_AT)).toThrow()
  })
})

describe('reopenMonth', () => {
  it('removes the closing record', () => {
    const { current } = closeMonth(october(), november(), CLOSED_AT)
    expect(reopenMonth(current).closing).toBeUndefined()
  })

  it('rejects reopening a month that is not closed', () => {
    expect(() => reopenMonth(october())).toThrow(/not closed/)
  })
})

describe('assertMonthOpen', () => {
  it('passes for an open month', () => {
    expect(() => assertMonthOpen(october())).not.toThrow()
  })

  it('throws for a closed month', () => {
    const { current } = closeMonth(october(), november(), CLOSED_AT)
    expect(() => assertMonthOpen(current)).toThrow(/closed/)
  })
})
