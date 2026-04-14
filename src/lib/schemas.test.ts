import { describe, it, expect } from 'vitest'
import { expenseSchema, incomeSchema, monthKeySchema, monthDataSchema } from './schemas'

const validExpense = {
  id: 'e1',
  name: 'Rent',
  category: 'fixed' as const,
  currency: 'BRL' as const,
  debit: 1500,
  credit: 0,
  fixed: true,
}

const validIncome = {
  id: 'i1',
  source: 'Salary',
  currency: 'USD' as const,
  amount: 5000,
}

describe('expenseSchema', () => {
  it('accepts valid expense with debit only', () => {
    expect(expenseSchema.safeParse(validExpense).success).toBe(true)
  })

  it('accepts valid expense with credit only', () => {
    const data = { ...validExpense, debit: 0, credit: 200 }
    expect(expenseSchema.safeParse(data).success).toBe(true)
  })

  it('accepts expense with both debit and credit', () => {
    const data = { ...validExpense, debit: 100, credit: 50 }
    expect(expenseSchema.safeParse(data).success).toBe(true)
  })

  it('accepts USD currency', () => {
    const data = { ...validExpense, currency: 'USD' as const }
    expect(expenseSchema.safeParse(data).success).toBe(true)
  })

  it('rejects when both debit and credit are zero', () => {
    const data = { ...validExpense, debit: 0, credit: 0 }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejects empty name', () => {
    const data = { ...validExpense, name: '' }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejects negative debit', () => {
    const data = { ...validExpense, debit: -1 }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejects negative credit', () => {
    const data = { ...validExpense, credit: -0.01 }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejects invalid category', () => {
    const data = { ...validExpense, category: 'unknown' }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejects invalid currency', () => {
    const data = { ...validExpense, currency: 'EUR' }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })
})

describe('incomeSchema', () => {
  it('accepts valid income', () => {
    expect(incomeSchema.safeParse(validIncome).success).toBe(true)
  })

  it('accepts BRL currency', () => {
    const data = { ...validIncome, currency: 'BRL' as const }
    expect(incomeSchema.safeParse(data).success).toBe(true)
  })

  it('rejects empty source', () => {
    const data = { ...validIncome, source: '' }
    expect(incomeSchema.safeParse(data).success).toBe(false)
  })

  it('rejects zero amount', () => {
    const data = { ...validIncome, amount: 0 }
    expect(incomeSchema.safeParse(data).success).toBe(false)
  })

  it('rejects negative amount', () => {
    const data = { ...validIncome, amount: -100 }
    expect(incomeSchema.safeParse(data).success).toBe(false)
  })

  it('rejects invalid currency', () => {
    const data = { ...validIncome, currency: 'GBP' }
    expect(incomeSchema.safeParse(data).success).toBe(false)
  })
})

describe('monthKeySchema', () => {
  it('accepts valid YYYY-MM format', () => {
    expect(monthKeySchema.safeParse('2025-01').success).toBe(true)
    expect(monthKeySchema.safeParse('2025-12').success).toBe(true)
  })

  it('rejects month 00', () => {
    expect(monthKeySchema.safeParse('2025-00').success).toBe(false)
  })

  it('rejects month 13', () => {
    expect(monthKeySchema.safeParse('2025-13').success).toBe(false)
  })

  it('rejects wrong format', () => {
    expect(monthKeySchema.safeParse('01-2025').success).toBe(false)
    expect(monthKeySchema.safeParse('2025/01').success).toBe(false)
    expect(monthKeySchema.safeParse('january').success).toBe(false)
  })
})

describe('monthDataSchema', () => {
  const validMonth = {
    key: '2025-03',
    expenses: [validExpense],
    incomes: [validIncome],
    saving: 500,
    adjustment: 0,
  }

  it('accepts a complete valid month', () => {
    expect(monthDataSchema.safeParse(validMonth).success).toBe(true)
  })

  it('accepts month with empty lists', () => {
    const data = { ...validMonth, expenses: [], incomes: [] }
    expect(monthDataSchema.safeParse(data).success).toBe(true)
  })

  it('rejects negative saving', () => {
    const data = { ...validMonth, saving: -1 }
    expect(monthDataSchema.safeParse(data).success).toBe(false)
  })

  it('accepts negative adjustment (refund or correction)', () => {
    const data = { ...validMonth, adjustment: -200 }
    expect(monthDataSchema.safeParse(data).success).toBe(true)
  })

  it('propagates error from invalid expense', () => {
    const data = { ...validMonth, expenses: [{ ...validExpense, debit: 0, credit: 0 }] }
    expect(monthDataSchema.safeParse(data).success).toBe(false)
  })
})

describe('budget in monthDataSchema', () => {
  const base = {
    key: '2025-03',
    expenses: [],
    incomes: [],
    saving: 0,
    adjustment: 0,
  }

  it('defaults to 0 when budget is absent (backward compat)', () => {
    const result = monthDataSchema.parse(base)
    expect(result.budget).toBe(0)
  })

  it('accepts a valid budget', () => {
    const result = monthDataSchema.parse({ ...base, budget: 1500 })
    expect(result.budget).toBe(1500)
  })

  it('rejects negative budget', () => {
    expect(() => monthDataSchema.parse({ ...base, budget: -1 })).toThrow()
  })
})
