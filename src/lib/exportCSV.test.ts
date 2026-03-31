import { describe, it, expect } from 'vitest'
import { exportCSV } from './exportCSV'
import { parseCSV } from './parseCSV'
import type { MonthData } from '../types'

const baseMonth: MonthData = {
  key: '2025-01',
  expenses: [
    { id: 'e1', name: 'Rent', category: 'fixed', currency: 'BRL', debit: 600, credit: 0, fixed: true },
    { id: 'e2', name: 'Internet', category: 'fixed', currency: 'BRL', debit: 100, credit: 0, fixed: true },
    { id: 'e3', name: 'Gym', category: 'fixed', currency: 'BRL', debit: 0, credit: 120, fixed: true },
    { id: 'e4', name: 'Cinema', category: 'other', currency: 'BRL', debit: 40, credit: 0, fixed: false },
    { id: 'e5', name: 'Shopee', category: 'other', currency: 'BRL', debit: 0, credit: 80, fixed: false },
  ],
  incomes: [{ id: 'i1', source: 'Salary', currency: 'BRL', amount: 3000 }],
  saving: 400,
  adjustment: 50,
}

describe('exportCSV — structure', () => {
  it('produces at least 4 rows', () => {
    const csv = exportCSV(baseMonth)
    const lines = csv.split('\r\n').filter(l => l.trim() !== '')
    expect(lines.length).toBeGreaterThanOrEqual(4)
  })

  it('row 1 contains expected header labels', () => {
    const csv = exportCSV(baseMonth)
    const row1 = csv.split('\r\n')[0]
    expect(row1).toContain('Sobreajuste')
    expect(row1).toContain('Receitas')
    expect(row1).toContain('Poupanca')
  })

  it('row 2 contains summary values', () => {
    const csv = exportCSV(baseMonth)
    const row2 = csv.split('\r\n')[1]
    expect(row2).toContain('3000.00') // income
    expect(row2).toContain('400.00')  // saving
    expect(row2).toContain('50.00')   // adjustment
  })

  it('contains Fixo category label', () => {
    const csv = exportCSV(baseMonth)
    expect(csv).toContain('Fixo')
  })

  it('contains Outros category label', () => {
    const csv = exportCSV(baseMonth)
    expect(csv).toContain('Outros')
  })

  it('includes all expense names', () => {
    const csv = exportCSV(baseMonth)
    expect(csv).toContain('Rent')
    expect(csv).toContain('Internet')
    expect(csv).toContain('Cinema')
    expect(csv).toContain('Shopee')
  })
})

describe('exportCSV — values', () => {
  it('balance = income - debit - credit - saving + adjustment', () => {
    const csv = exportCSV(baseMonth)
    // 3000 - (600+100+40) - (120+80) - 400 + 50 = 1710
    const row2 = csv.split('\r\n')[1]
    expect(row2).toContain('1710.00')
  })

  it('exports empty month without crashing', () => {
    const empty: MonthData = {
      key: '2025-06',
      expenses: [],
      incomes: [],
      saving: 0,
      adjustment: 0,
    }
    expect(() => exportCSV(empty)).not.toThrow()
  })
})

describe('exportCSV — round-trip with parseCSV', () => {
  it('exported CSV re-parses to equivalent data', () => {
    const csv = exportCSV(baseMonth)
    const result = parseCSV(csv)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const expenseNames = result.data.expenses.map(e => e.name)
    expect(expenseNames).toContain('Rent')
    expect(expenseNames).toContain('Cinema')

    const fixedNames = result.data.expenses
      .filter(e => e.category === 'fixed')
      .map(e => e.name)
    expect(fixedNames).toContain('Rent')
    expect(fixedNames).toContain('Internet')

    expect(result.data.saving).toBeCloseTo(400)
    expect(result.data.adjustment).toBeCloseTo(50)
  })
})
