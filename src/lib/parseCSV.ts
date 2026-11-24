/**
 * CSV import format (exported from the Google Sheets template):
 *
 * Row 1: column label headers (ignored)
 * Row 2: summary — col[6]=Sobreajuste, col[8]=Receitas, col[11]=Poupança
 * Row 3: expense column headers (ignored)
 * Rows 4+: expense rows until an empty row or a row starting with "UTILIDADES"
 *   col[0]: category — "Fixo" or "Outros" (carry-forward; blank means same as previous)
 *   col[1]: expense name
 *   col[2]: debit amount  (e.g. " BRL 605.21 " or blank)
 *   col[3]: credit amount (e.g. "BRL 139.90"  or blank)
 *
 * - Separator: comma (,)
 * - Encoding: UTF-8
 * - Currency: amounts are imported as plain numbers into the active currency; a "BRL" prefix is ignored
 * - Receitas total is imported as a single income entry with source "Receitas"
 */

import { round2 } from './math'
import type { MessageKey } from './i18n'
import type { Category, Expense, Income, MonthData } from '../types'

export type ParseCSVResult =
  | { ok: true; data: Omit<MonthData, 'key'> }
  | { ok: false; error: MessageKey }

function parseAmount(raw: string): number {
  const cleaned = raw
    .trim()
    .replace(/BRL\s*/g, '')
    .replace(/,/g, '')
    .trim()

  if (cleaned === '' || cleaned === '-') return 0

  const negative = cleaned.startsWith('(') && cleaned.endsWith(')')
  const digits = negative ? cleaned.slice(1, -1) : cleaned
  const value = parseFloat(digits)
  if (isNaN(value)) return 0
  return negative ? -round2(value) : round2(value)
}

function splitCSVRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

export function parseCSV(text: string): ParseCSVResult {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  if (lines.length < 3) {
    return { ok: false, error: 'import.tooFewRows' }
  }

  // Row 2 (index 1): summary
  const summaryRow = splitCSVRow(lines[1])
  const adjustment = parseAmount(summaryRow[6] ?? '')
  const receitasTotal = parseAmount(summaryRow[8] ?? '')
  const saving = parseAmount(summaryRow[11] ?? '')

  const expenses: Expense[] = []
  let currentCategory: Category = 'fixed'

  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue

    const cols = splitCSVRow(lines[i])
    const rawCat = cols[0]?.trim()
    const name = cols[1]?.trim()

    if (!name || rawCat?.toUpperCase() === 'UTILIDADES') break

    if (rawCat === 'Fixo') currentCategory = 'fixed'
    else if (rawCat === 'Outros') currentCategory = 'other'

    const debit = Math.max(0, parseAmount(cols[2] ?? ''))
    const credit = Math.max(0, parseAmount(cols[3] ?? ''))

    if (debit === 0 && credit === 0) continue

    expenses.push({
      id: crypto.randomUUID(),
      name,
      category: currentCategory,
      debit,
      credit,
    })
  }

  const incomes: Income[] = receitasTotal > 0
    ? [{ id: crypto.randomUUID(), source: 'Receitas', amount: receitasTotal }]
    : []

  return {
    ok: true,
    data: { expenses, incomes, saving, adjustment, budget: 0 },
  }
}
