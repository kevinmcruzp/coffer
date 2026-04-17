import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseList } from './ExpenseList'
import { useExpenses } from '../hooks/useExpenses'
import type { Expense } from '../types'
import type { UseExpensesResult } from '../hooks/useExpenses'

vi.mock('../hooks/useExpenses')
vi.mock('../hooks/useSession', () => ({
  useSession: () => ({ state: { status: 'unlocked', key: {} }, db: {} }),
}))
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

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

const expenseA: Expense = { id: 'a', name: 'Alpha', category: 'fixed', currency: 'BRL', debit: 300, credit: 0, fixed: true }
const expenseB: Expense = { id: 'b', name: 'Beta',  category: 'fixed', currency: 'BRL', debit: 100, credit: 0, fixed: true }
const expenseC: Expense = { id: 'c', name: 'Gamma', category: 'fixed', currency: 'BRL', debit: 200, credit: 0, fixed: true }

function makeHookResult(overrides: Partial<UseExpensesResult> = {}): UseExpensesResult {
  return {
    expenses: [],
    loading: false,
    error: null,
    totals: {
      BRL: { debit: 0, credit: 0, total: 0 },
      USD: { debit: 0, credit: 0, total: 0 },
      CLP: { debit: 0, credit: 0, total: 0 },
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
        CLP: { debit: 0, credit: 0, total: 0 },
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
        CLP: { debit: 0, credit: 0, total: 0 },
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

    const checkbox = screen.getByLabelText(/repeat.*rent/i)
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

describe('ExpenseList — installments', () => {
  beforeEach(() => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult())
  })

  it('renders (Nx) badge when installments > 1', () => {
    const expense: Expense = {
      id: 'tv', name: 'TV', category: 'other', currency: 'BRL',
      debit: 0, credit: 200, fixed: false, installments: 6,
    }
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({ expenses: [expense] }))

    render(<ExpenseList monthKey="2025-03" />)

    expect(screen.getByTestId('installments-tv')).toHaveTextContent('(6x)')
  })

  it('does not render badge when installments is 1 or undefined', () => {
    const e1: Expense = { id: 'a', name: 'A', category: 'other', currency: 'BRL', debit: 10, credit: 0, fixed: false }
    const e2: Expense = { id: 'b', name: 'B', category: 'other', currency: 'BRL', debit: 10, credit: 0, fixed: false, installments: 1 }
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({ expenses: [e1, e2] }))

    render(<ExpenseList monthKey="2025-03" />)

    expect(screen.queryByTestId('installments-a')).not.toBeInTheDocument()
    expect(screen.queryByTestId('installments-b')).not.toBeInTheDocument()
  })

  it('divides credit by parcels on submit and persists installments', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({ add }))

    render(<ExpenseList monthKey="2025-03" />)
    const section = screen.getByTestId('group-other')
    const nameInput = within(section).getByPlaceholderText(/name/i)
    const creditInput = within(section).getByLabelText(/credit/i)
    const parcelsInput = within(section).getByLabelText(/parcels/i)

    await userEvent.type(nameInput, 'Sofa')
    await userEvent.clear(creditInput)
    await userEvent.type(creditInput, '400')
    await userEvent.type(parcelsInput, '4')
    await userEvent.click(within(section).getByRole('button', { name: /add/i }))

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sofa', credit: 100, installments: 4 }),
    )
  })

  it('shows parcel hint with breakdown when parcels >= 2 and credit > 0', async () => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult())

    render(<ExpenseList monthKey="2025-03" />)
    const section = screen.getByTestId('group-other')
    const creditInput = within(section).getByLabelText(/credit/i)
    const parcelsInput = within(section).getByLabelText(/parcels/i)

    await userEvent.clear(creditInput)
    await userEvent.type(creditInput, '600')
    await userEvent.type(parcelsInput, '3')

    const hint = within(section).getByTestId('parcel-hint')
    expect(hint).toHaveTextContent(/3×/)
    expect(hint).toHaveTextContent(/200/)
    expect(hint).toHaveTextContent(/600/)
  })

  it('does not show parcel hint when parcels < 2', async () => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult())

    render(<ExpenseList monthKey="2025-03" />)
    const section = screen.getByTestId('group-other')
    const creditInput = within(section).getByLabelText(/credit/i)

    await userEvent.clear(creditInput)
    await userEvent.type(creditInput, '600')

    expect(within(section).queryByTestId('parcel-hint')).not.toBeInTheDocument()
  })

  it('omits installments from add when parcels < 2', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({ add }))

    render(<ExpenseList monthKey="2025-03" />)
    const section = screen.getByTestId('group-other')
    const nameInput = within(section).getByPlaceholderText(/name/i)
    const creditInput = within(section).getByLabelText(/credit/i)

    await userEvent.type(nameInput, 'Coffee')
    await userEvent.clear(creditInput)
    await userEvent.type(creditInput, '15')
    await userEvent.click(within(section).getByRole('button', { name: /add/i }))

    const call = add.mock.calls[0][0]
    expect(call).not.toHaveProperty('installments')
  })
})

describe('ExpenseList — sorting', () => {
  beforeEach(() => {
    vi.mocked(useExpenses).mockReturnValue(makeHookResult({
      expenses: [expenseB, expenseC, expenseA],
    }))
  })

  function rowOrder(section: HTMLElement): string[] {
    return within(section).getAllByRole('row')
      .slice(1) // skip header
      .map(row => row.cells[0].textContent ?? '')
      .filter(t => t !== '') // skip add-form row (empty name cell initially)
  }

  it('default order is name asc', () => {
    render(<ExpenseList monthKey="2025-03" />)
    const section = screen.getByTestId('group-fixed')
    expect(rowOrder(section)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('clicking Name header once (already active) switches to desc', () => {
    render(<ExpenseList monthKey="2025-03" />)
    const section = screen.getByTestId('group-fixed')
    const nameHeader = within(section).getByRole('columnheader', { name: /name/i })
    fireEvent.click(nameHeader) // already active asc → desc
    expect(rowOrder(section)).toEqual(['Gamma', 'Beta', 'Alpha'])
  })

  it('clicking Debit header sorts by debit desc after second click', () => {
    render(<ExpenseList monthKey="2025-03" />)
    const section = screen.getByTestId('group-fixed')
    const debitHeader = within(section).getByRole('columnheader', { name: /debit/i })
    fireEvent.click(debitHeader) // asc: 100, 200, 300
    fireEvent.click(debitHeader) // desc: 300, 200, 100
    expect(rowOrder(section)).toEqual(['Alpha', 'Gamma', 'Beta'])
  })
})
