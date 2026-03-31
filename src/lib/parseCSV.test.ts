import { describe, it, expect } from 'vitest'
import { parseCSV } from './parseCSV'

const SAMPLE_CSV = `,,,,,,Sobreajuste,Saldo atual,Receitas,Despesas,Cartao de credito,Poupanca,TOTAL,Total gasto,,
,,,,,,BRL 0.00, BRL 303.35 ," BRL 3,828.54 ","BRL 1,877.97",BRL 653.83,BRL 826.38, BRL 773.71 ," BRL (2,531.80)",,
,,Debito,Cartao de credito,,,,,,,,,,,,
Fixo,Aluguel, BRL 605.21 ,,,,,,,,,,,,,
,Condominio, - ,,,,,,,,,,,,,
,Luz, BRL 29.41 ,,,,,,,,,,,,,
,Internet, BRL 106.00 ,,,,,,,,,,,,,
,Academia,,BRL 139.90,,,,,,,,,,,,
,Tim,,BRL 54.99,,,,,,,,,,,,
Outros,Shopee,,BRL 138.84,,,,,,,,,,,,
,Cinema,BRL 38.00,,,,,,,,,,,,,
,Saida Strike, BRL 32.00 ,BRL 51.50,,,,,,,,,,,,
,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,
UTILIDADES,,-1,,,,,,,,,,,,,
`

describe('parseCSV — valid input', () => {
  it('returns ok: true for valid CSV', () => {
    const result = parseCSV(SAMPLE_CSV)
    expect(result.ok).toBe(true)
  })

  it('parses expenses from Fixo group', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    const fixedExpenses = result.data.expenses.filter(e => e.category === 'fixed')
    const names = fixedExpenses.map(e => e.name)
    expect(names).toContain('Aluguel')
    expect(names).toContain('Luz')
    expect(names).toContain('Internet')
    expect(names).toContain('Academia')
    expect(names).toContain('Tim')
  })

  it('parses expenses from Outros group', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    const otherExpenses = result.data.expenses.filter(e => e.category === 'other')
    const names = otherExpenses.map(e => e.name)
    expect(names).toContain('Shopee')
    expect(names).toContain('Cinema')
  })

  it('correctly parses debit and credit values', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    const aluguel = result.data.expenses.find(e => e.name === 'Aluguel')
    expect(aluguel?.debit).toBeCloseTo(605.21)
    expect(aluguel?.credit).toBe(0)

    const academia = result.data.expenses.find(e => e.name === 'Academia')
    expect(academia?.debit).toBe(0)
    expect(academia?.credit).toBeCloseTo(139.90)
  })

  it('parses expense with both debit and credit', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    const saida = result.data.expenses.find(e => e.name === 'Saida Strike')
    expect(saida?.debit).toBeCloseTo(32.00)
    expect(saida?.credit).toBeCloseTo(51.50)
  })

  it('skips rows where both debit and credit are zero or dash', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    const condominio = result.data.expenses.find(e => e.name === 'Condominio')
    expect(condominio).toBeUndefined()
  })

  it('marks Fixo expenses as fixed: true', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    const fixedExpenses = result.data.expenses.filter(e => e.category === 'fixed')
    expect(fixedExpenses.every(e => e.fixed === true)).toBe(true)
  })

  it('marks Outros expenses as fixed: false', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    const otherExpenses = result.data.expenses.filter(e => e.category === 'other')
    expect(otherExpenses.every(e => e.fixed === false)).toBe(true)
  })

  it('stops parsing at UTILIDADES row', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    // UTILIDADES row and below should not produce expenses
    const utilidades = result.data.expenses.find(e => e.name === 'UTILIDADES')
    expect(utilidades).toBeUndefined()
  })

  it('parses saving from summary row', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    expect(result.data.saving).toBeCloseTo(826.38)
  })

  it('parses adjustment from summary row', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    expect(result.data.adjustment).toBe(0)
  })

  it('imports receitas total as a single income entry', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    expect(result.data.incomes).toHaveLength(1)
    expect(result.data.incomes[0].source).toBe('Receitas')
    expect(result.data.incomes[0].amount).toBeCloseTo(3828.54)
    expect(result.data.incomes[0].currency).toBe('BRL')
  })

  it('assigns unique ids to each expense', () => {
    const result = parseCSV(SAMPLE_CSV)
    if (!result.ok) throw new Error(result.error)

    const ids = result.data.expenses.map(e => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('produces no incomes when receitas total is zero', () => {
    const csv = SAMPLE_CSV.replace('" BRL 3,828.54 "', 'BRL 0.00')
    const result = parseCSV(csv)
    if (!result.ok) throw new Error(result.error)

    expect(result.data.incomes).toHaveLength(0)
  })
})

describe('parseCSV — malformed input', () => {
  it('returns ok: false when file has too few rows', () => {
    const result = parseCSV('row1\nrow2')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeTruthy()
  })

  it('returns empty expenses for CSV with no data rows', () => {
    const csv = `header\n,,,,,,BRL 0.00,BRL 0.00,BRL 0.00,BRL 0.00,BRL 0.00,BRL 0.00\nDebito,Cartao\n`
    const result = parseCSV(csv)
    if (!result.ok) throw new Error(result.error)

    expect(result.data.expenses).toHaveLength(0)
  })
})
