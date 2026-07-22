import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyFromPreviousModal } from './CopyFromPreviousModal'
import { useExpenses } from '../hooks/useExpenses'
import { useIncomes } from '../hooks/useIncomes'
import type { Expense, Income } from '../types'
import type { UseExpensesResult } from '../hooks/useExpenses'
import type { UseIncomesResult } from '../hooks/useIncomes'

vi.mock('../hooks/useExpenses')
vi.mock('../hooks/useIncomes')
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const CUR = '2025-04'
const PREV = '2025-03'

const prevExpenses: Expense[] = [
  { id: 'r', name: 'Rent', category: 'fixed', currency: 'BRL', debit: 1500, credit: 0 },
  { id: 's', name: 'Sofa', category: 'other', currency: 'BRL', debit: 0, credit: 100, installments: 3 },
  { id: 't', name: 'OldTV', category: 'other', currency: 'BRL', debit: 0, credit: 50, installments: 1 },
  { id: 'c', name: 'Coffee', category: 'other', currency: 'BRL', debit: 0, credit: 25 },
]
const curExpenses: Expense[] = [
  { id: 'c2', name: 'Coffee', category: 'other', currency: 'BRL', debit: 0, credit: 25 },
]

const prevIncomes: Income[] = [
  { id: 'sal', source: 'Salary', currency: 'BRL', amount: 5000 },
  { id: 'bon', source: 'Bonus', currency: 'BRL', amount: 1000 },
]
const curIncomes: Income[] = [
  { id: 'bon2', source: 'Bonus', currency: 'BRL', amount: 1000 },
]

const addExpense = vi.fn().mockResolvedValue(undefined)
const addIncome = vi.fn().mockResolvedValue(undefined)

function expResult(expenses: Expense[], add = vi.fn()): UseExpensesResult {
  return {
    expenses,
    loading: false,
    error: null,
    totals: {
      BRL: { debit: 0, credit: 0, total: 0 },
      USD: { debit: 0, credit: 0, total: 0 },
      CLP: { debit: 0, credit: 0, total: 0 },
    },
    add,
    update: vi.fn(),
    remove: vi.fn(),
  }
}

function incResult(incomes: Income[], add = vi.fn()): UseIncomesResult {
  return {
    incomes,
    loading: false,
    error: null,
    totals: { BRL: 0, USD: 0, CLP: 0 },
    add,
    update: vi.fn(),
    remove: vi.fn(),
  }
}

beforeEach(() => {
  addExpense.mockClear()
  addIncome.mockClear()
  vi.mocked(useExpenses).mockImplementation((mk: string) =>
    mk === PREV ? expResult(prevExpenses) : expResult(curExpenses, addExpense),
  )
  vi.mocked(useIncomes).mockImplementation((mk: string) =>
    mk === PREV ? incResult(prevIncomes) : incResult(curIncomes, addIncome),
  )
})

describe('CopyFromPreviousModal', () => {
  it('lists copyable incomes and expenses from the previous month', () => {
    render(<CopyFromPreviousModal monthKey={CUR} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Rent/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Sofa/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Salary/)).toBeInTheDocument()
  })

  it('excludes a finished parcel (installments === 1)', () => {
    render(<CopyFromPreviousModal monthKey={CUR} onClose={vi.fn()} />)
    expect(screen.queryByLabelText(/OldTV/)).not.toBeInTheDocument()
  })

  it('disables items already present in the current month', () => {
    render(<CopyFromPreviousModal monthKey={CUR} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Coffee/)).toBeDisabled()
    expect(screen.getByLabelText(/Bonus/)).toBeDisabled()
  })

  it('copies selected items, decrementing ongoing installments', async () => {
    const onClose = vi.fn()
    render(<CopyFromPreviousModal monthKey={CUR} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: /copy selected/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())

    expect(addExpense).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rent', category: 'fixed', debit: 1500 }),
    )
    expect(addExpense).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sofa', installments: 2 }),
    )
    expect(addIncome).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'Salary', amount: 5000 }),
    )
    // Rent has no installments in the copied payload
    const rentCall = addExpense.mock.calls.find(c => c[0].name === 'Rent')
    expect(rentCall?.[0]).not.toHaveProperty('installments')
    // Duplicates and finished parcels are never copied
    expect(addExpense).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'Coffee' }))
    expect(addExpense).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'OldTV' }))
    expect(addIncome).not.toHaveBeenCalledWith(expect.objectContaining({ source: 'Bonus' }))
  })

  it('lets the user unselect an item so it is not copied', async () => {
    render(<CopyFromPreviousModal monthKey={CUR} onClose={vi.fn()} />)

    await userEvent.click(screen.getByLabelText(/Rent/))
    await userEvent.click(screen.getByRole('button', { name: /copy selected/i }))

    await waitFor(() => expect(addIncome).toHaveBeenCalled())
    expect(addExpense).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'Rent' }))
  })

  it('shows an empty state when nothing is copyable', () => {
    vi.mocked(useExpenses).mockImplementation((mk: string) =>
      mk === PREV ? expResult([]) : expResult([], addExpense),
    )
    vi.mocked(useIncomes).mockImplementation((mk: string) =>
      mk === PREV ? incResult([]) : incResult([], addIncome),
    )
    render(<CopyFromPreviousModal monthKey={CUR} onClose={vi.fn()} />)
    expect(screen.getByText(/nothing to copy/i)).toBeInTheDocument()
  })
})
