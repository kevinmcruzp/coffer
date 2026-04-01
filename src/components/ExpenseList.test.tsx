import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseList } from './ExpenseList'
import { useExpenses } from '../hooks/useExpenses'
import type { Expense } from '../types'
import type { UseExpensesResult } from '../hooks/useExpenses'

vi.mock('../hooks/useExpenses')

const fixedExpense: Expense = {
  id: 'e1',
  name: 'Rent',
  category: 'fixed',
  currency: 'BRL',
  debit: 1500,
  credit: 0,
  fixed: true,
}

const otherExpense: Expense = {
  id: 'e2',
  name: 'Coffee',
  category: 'other',
  currency: 'BRL',
  debit: 0,
  credit: 25,
  fixed: false,
}

function makeHookResult(overrides: Partial<UseExpensesResult> = {}): UseExpensesResult {
  return {
    expenses: [],
    loading: false,
    error: null,
    totals: {
      BRL: { debit: 0, credit: 0, total: 0 },
      USD: { debit: 0, credit: 0, total: 0 },
    },
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('ExpenseList', () => {
  beforeEach(() => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult())
  })

  it('shows loading indicator while loading', () => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({ loading: true }))
    render(<ExpenseList monthKey="2025-03" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error message when error is set', () => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({ error: 'Failed to decrypt' }))
    render(<ExpenseList monthKey="2025-03" />)
    expect(screen.getByText(/failed to decrypt/i)).toBeInTheDocument()
  })

  it('renders Fixed and Others sections', () => {
    render(<ExpenseList monthKey="2025-03" />)
    expect(screen.getByTestId('group-fixed')).toBeInTheDocument()
    expect(screen.getByTestId('group-other')).toBeInTheDocument()
  })

  it('renders expenses in the correct category group', () => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({
      expenses: [fixedExpense, otherExpense],
    }))
    render(<ExpenseList monthKey="2025-03" />)

    const fixoSection = screen.getByTestId('group-fixed')
    const outrosSection = screen.getByTestId('group-other')

    expect(within(fixoSection).getByText('Rent')).toBeInTheDocument()
    expect(within(outrosSection).getByText('Coffee')).toBeInTheDocument()
    expect(within(fixoSection).queryByText('Coffee')).not.toBeInTheDocument()
  })

  it('calls add with correct data when add form is submitted in Fixo group', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({ add }))

    render(<ExpenseList monthKey="2025-03" />)

    const fixoSection = screen.getByTestId('group-fixed')
    const nameInput = within(fixoSection).getByPlaceholderText(/name/i)
    const debitInput = within(fixoSection).getByLabelText(/debit/i)
    const creditInput = within(fixoSection).getByLabelText(/credit/i)
    const addButton = within(fixoSection).getByRole('button', { name: /add/i })

    await userEvent.type(nameInput, 'Internet')
    await userEvent.clear(debitInput)
    await userEvent.type(debitInput, '100')
    await userEvent.clear(creditInput)
    await userEvent.type(creditInput, '0')
    await userEvent.click(addButton)

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Internet', category: 'fixed', debit: 100 }),
    )
  })

  it('shows delete confirmation when delete button is clicked', async () => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({ expenses: [fixedExpense] }))
    render(<ExpenseList monthKey="2025-03" />)

    const deleteBtn = screen.getByRole('button', { name: /delete rent/i })
    await userEvent.click(deleteBtn)

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls remove when delete is confirmed', async () => {
    const remove = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({
      expenses: [fixedExpense],
      remove,
    }))
    render(<ExpenseList monthKey="2025-03" />)

    await userEvent.click(screen.getByRole('button', { name: /delete rent/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))

    expect(remove).toHaveBeenCalledWith('e1')
  })

  it('does not call remove when delete is cancelled', async () => {
    const remove = vi.fn()
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({
      expenses: [fixedExpense],
      remove,
    }))
    render(<ExpenseList monthKey="2025-03" />)

    await userEvent.click(screen.getByRole('button', { name: /delete rent/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(remove).not.toHaveBeenCalled()
  })

  it('calls update when inline name edit is committed', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({
      expenses: [fixedExpense],
      update,
    }))
    render(<ExpenseList monthKey="2025-03" />)

    await userEvent.click(screen.getByTestId('name-e1'))
    const input = screen.getByDisplayValue('Rent')
    await userEvent.clear(input)
    await userEvent.type(input, 'New Rent')
    await userEvent.keyboard('{Enter}')

    expect(update).toHaveBeenCalledWith('e1', expect.objectContaining({ name: 'New Rent' }))
  })

  it('shows BRL totals row', () => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({
      totals: {
        BRL: { debit: 1500, credit: 200, total: 1700 },
        USD: { debit: 0, credit: 0, total: 0 },
      },
    }))
    render(<ExpenseList monthKey="2025-03" />)

    expect(screen.getByTestId('totals-BRL')).toBeInTheDocument()
    expect(screen.getByTestId('totals-BRL')).toHaveTextContent('1.500')
    expect(screen.getByTestId('totals-BRL')).toHaveTextContent('200')
  })

  it('does not show USD totals when all USD values are zero', () => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({
      totals: {
        BRL: { debit: 100, credit: 0, total: 100 },
        USD: { debit: 0, credit: 0, total: 0 },
      },
    }))
    render(<ExpenseList monthKey="2025-03" />)

    expect(screen.queryByTestId('totals-USD')).not.toBeInTheDocument()
  })

  it('calls update when fixed checkbox is toggled', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({
      expenses: [fixedExpense],
      update,
    }))
    render(<ExpenseList monthKey="2025-03" />)

    const checkbox = screen.getByLabelText(/fixed.*rent/i)
    await userEvent.click(checkbox)

    expect(update).toHaveBeenCalledWith('e1', { fixed: false })
  })

  it('clears add form after successful submission', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({ add }))

    render(<ExpenseList monthKey="2025-03" />)

    const fixoSection = screen.getByTestId('group-fixed')
    const nameInput = within(fixoSection).getByPlaceholderText(/name/i)
    const debitInput = within(fixoSection).getByLabelText(/debit/i)

    await userEvent.type(nameInput, 'Internet')
    await userEvent.clear(debitInput)
    await userEvent.type(debitInput, '100')
    await userEvent.click(within(fixoSection).getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(nameInput).toHaveValue('')
    })
  })
})
