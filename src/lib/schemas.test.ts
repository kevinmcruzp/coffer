import { describe, it, expect } from 'vitest'
import { expenseSchema, incomeSchema, monthKeySchema, monthDataSchema } from './schemas'

const validExpense = {
  id: 'e1',
  name: 'Aluguel',
  category: 'fixed' as const,
  debit: 1500,
  credit: 0,
  fixed: true,
}

const validIncome = {
  id: 'i1',
  source: 'Salário',
  amount: 5000,
}

describe('expenseSchema', () => {
  it('aceita despesa válida com débito', () => {
    expect(expenseSchema.safeParse(validExpense).success).toBe(true)
  })

  it('aceita despesa válida com crédito', () => {
    const data = { ...validExpense, debit: 0, credit: 200 }
    expect(expenseSchema.safeParse(data).success).toBe(true)
  })

  it('aceita despesa com débito e crédito simultâneos', () => {
    const data = { ...validExpense, debit: 100, credit: 50 }
    expect(expenseSchema.safeParse(data).success).toBe(true)
  })

  it('rejeita quando débito e crédito são zero', () => {
    const data = { ...validExpense, debit: 0, credit: 0 }
    const result = expenseSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejeita nome vazio', () => {
    const data = { ...validExpense, name: '' }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejeita débito negativo', () => {
    const data = { ...validExpense, debit: -1 }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejeita crédito negativo', () => {
    const data = { ...validExpense, credit: -0.01 }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })

  it('rejeita categoria inválida', () => {
    const data = { ...validExpense, category: 'unknown' }
    expect(expenseSchema.safeParse(data).success).toBe(false)
  })
})

describe('incomeSchema', () => {
  it('aceita receita válida', () => {
    expect(incomeSchema.safeParse(validIncome).success).toBe(true)
  })

  it('rejeita fonte vazia', () => {
    const data = { ...validIncome, source: '' }
    expect(incomeSchema.safeParse(data).success).toBe(false)
  })

  it('rejeita valor zero', () => {
    const data = { ...validIncome, amount: 0 }
    expect(incomeSchema.safeParse(data).success).toBe(false)
  })

  it('rejeita valor negativo', () => {
    const data = { ...validIncome, amount: -100 }
    expect(incomeSchema.safeParse(data).success).toBe(false)
  })
})

describe('monthKeySchema', () => {
  it('aceita formato YYYY-MM válido', () => {
    expect(monthKeySchema.safeParse('2025-01').success).toBe(true)
    expect(monthKeySchema.safeParse('2025-12').success).toBe(true)
  })

  it('rejeita mês 00', () => {
    expect(monthKeySchema.safeParse('2025-00').success).toBe(false)
  })

  it('rejeita mês 13', () => {
    expect(monthKeySchema.safeParse('2025-13').success).toBe(false)
  })

  it('rejeita formato errado', () => {
    expect(monthKeySchema.safeParse('01-2025').success).toBe(false)
    expect(monthKeySchema.safeParse('2025/01').success).toBe(false)
    expect(monthKeySchema.safeParse('janeiro').success).toBe(false)
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

  it('aceita mês válido completo', () => {
    expect(monthDataSchema.safeParse(validMonth).success).toBe(true)
  })

  it('aceita mês com listas vazias', () => {
    const data = { ...validMonth, expenses: [], incomes: [] }
    expect(monthDataSchema.safeParse(data).success).toBe(true)
  })

  it('rejeita poupança negativa', () => {
    const data = { ...validMonth, saving: -1 }
    expect(monthDataSchema.safeParse(data).success).toBe(false)
  })

  it('aceita ajuste negativo (estorno/correção)', () => {
    const data = { ...validMonth, adjustment: -200 }
    expect(monthDataSchema.safeParse(data).success).toBe(true)
  })

  it('propaga erro de despesa inválida', () => {
    const data = { ...validMonth, expenses: [{ ...validExpense, debit: 0, credit: 0 }] }
    expect(monthDataSchema.safeParse(data).success).toBe(false)
  })
})
