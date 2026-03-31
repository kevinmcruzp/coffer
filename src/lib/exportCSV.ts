/**
 * Generates a CSV string in the same format used for import,
 * compatible with the original Google Sheets template.
 *
 * Row 1: column label headers
 * Row 2: summary (Sobreajuste, Saldo, Receitas, Despesas, Cartão, Poupança, TOTAL, Total gasto)
 * Row 3: expense column headers
 * Rows 4+: expense rows (category carry-forward, name, debit, credit)
 */

import type { MonthData } from '../types'

function fmtBRL(value: number): string {
  if (value === 0) return 'BRL 0.00'
  return `BRL ${value.toFixed(2)}`
}

export function exportCSV(data: MonthData): string {
  const totalIncome = data.incomes
    .filter(i => i.currency === 'BRL')
    .reduce((s, i) => s + i.amount, 0)

  const totalDebit = data.expenses
    .filter(e => e.currency === 'BRL')
    .reduce((s, e) => s + e.debit, 0)

  const totalCredit = data.expenses
    .filter(e => e.currency === 'BRL')
    .reduce((s, e) => s + e.credit, 0)

  const balance = totalIncome - totalDebit - totalCredit - data.saving + data.adjustment
  const totalSpent = totalDebit + totalCredit

  const rows: string[] = []

  // Row 1: headers
  rows.push(',,,,,,Sobreajuste,Saldo atual,Receitas,Despesas,Cartao de credito,Poupanca,TOTAL,Total gasto,,')

  // Row 2: summary
  rows.push(
    `,,,,,,${fmtBRL(data.adjustment)},${fmtBRL(balance)},"${fmtBRL(totalIncome)}","${fmtBRL(totalDebit)}",${fmtBRL(totalCredit)},${fmtBRL(data.saving)},${fmtBRL(balance)},"${fmtBRL(totalSpent)}",,`
  )

  // Row 3: column headers
  rows.push(',,Debito,Cartao de credito,,,,,,,,,,,,')

  // Expense rows
  const fixed = data.expenses.filter(e => e.category === 'fixed')
  const others = data.expenses.filter(e => e.category === 'other')

  for (let i = 0; i < fixed.length; i++) {
    const e = fixed[i]
    const cat = i === 0 ? 'Fixo' : ''
    const debit = e.debit > 0 ? `BRL ${e.debit.toFixed(2)}` : ' - '
    const credit = e.credit > 0 ? `BRL ${e.credit.toFixed(2)}` : ''
    rows.push(`${cat},${e.name},${debit},${credit},,,,,,,,,,,,`)
  }

  for (let i = 0; i < others.length; i++) {
    const e = others[i]
    const cat = i === 0 ? 'Outros' : ''
    const debit = e.debit > 0 ? `BRL ${e.debit.toFixed(2)}` : ''
    const credit = e.credit > 0 ? `BRL ${e.credit.toFixed(2)}` : ''
    rows.push(`${cat},${e.name},${debit},${credit},,,,,,,,,,,,`)
  }

  rows.push(',,,,,,,,,,,,,,,' )
  rows.push(',,,,,,,,,,,,,,,' )

  return rows.join('\r\n') + '\r\n'
}

export function downloadCSV(data: MonthData, monthKey: string): void {
  const csv = exportCSV(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Financas(${monthKey}).csv`
  a.click()
  URL.revokeObjectURL(url)
}
