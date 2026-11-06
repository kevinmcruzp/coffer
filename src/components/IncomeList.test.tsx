import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IncomeList } from './IncomeList'
import { ToastProvider } from './Toast'
import { useIncomes } from '../hooks/useIncomes'
import type { Income } from '../types'
import type { UseIncomesResult } from '../hooks/useIncomes'
import { useMonthClosing } from '../hooks/useMonthClosing'
import type { UseMonthClosingResult } from '../hooks/useMonthClosing'

vi.mock('../hooks/useIncomes')
vi.mock('../hooks/useMonthClosing')

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

const MONTH_KEY = '2025-03'

const baseIncome: Income = {
  id: 'i1',
  source: 'Salary',
  currency: 'BRL',
  amount: 5000,
}

function makeHook(overrides: Partial<UseIncomesResult> = {}): UseIncomesResult {
  return {
    incomes: [],
    closed: false,
    loading: false,
    error: null,
    totals: { BRL: 0, USD: 0, CLP: 0 },
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  }
}

function makeClosing(overrides: Partial<UseMonthClosingResult> = {}): UseMonthClosingResult {
  return {
    closing: { balance: 569.19, closedAt: '2026-11-06T12:00:00.000Z' },
    balance: 569.19,
    nextKey: '2026-11',
    loading: false,
    error: null,
    close: vi.fn(),
    reopen: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(useIncomes).mockReturnValue(makeHook())
  vi.mocked(useMonthClosing).mockReturnValue(makeClosing())
})

describe('IncomeList — loading and error states', () => {
  it('shows loading indicator', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ loading: true }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows error message', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ error: 'Decryption failed' }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.getByText('Decryption failed')).toBeInTheDocument()
  })
})

describe('IncomeList — renders incomes', () => {
  it('renders income rows', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome] }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.getByTestId('source-i1')).toHaveTextContent('Salary')
  })

  it('renders empty table when no incomes', () => {
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.queryByRole('row', { name: /salary/i })).not.toBeInTheDocument()
  })
})

describe('IncomeList — add form', () => {
  it('calls add with form values', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useIncomes).mockReturnValue(makeHook({ add }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.change(screen.getByPlaceholderText('Source'), { target: { value: 'Freelance' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1500' } })
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith({
        source: 'Freelance',
        currency: 'BRL',
        amount: 1500,
      })
    })
  })

  it('starts the add form with an empty amount field', () => {
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })

  it('shows error when add fails', async () => {
    const add = vi.fn().mockRejectedValue(new Error('Amount must be greater than zero'))
    vi.mocked(useIncomes).mockReturnValue(makeHook({ add }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument()
    })
  })
})

describe('IncomeList — inline editing', () => {
  it('shows input when source cell is clicked', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome] }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByTestId('source-i1'))

    expect(screen.getByDisplayValue('Salary')).toBeInTheDocument()
  })

  it('calls update on Enter in source field', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome], update }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByTestId('source-i1'))
    const input = screen.getByDisplayValue('Salary')
    fireEvent.change(input, { target: { value: 'Bonus' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith('i1', { source: 'Bonus' })
    })
  })

  it('cancels edit on Escape', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome] }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByTestId('source-i1'))
    const input = screen.getByDisplayValue('Salary')
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByDisplayValue('Salary')).not.toBeInTheDocument()
    expect(screen.getByTestId('source-i1')).toHaveTextContent('Salary')
  })
})

describe('IncomeList — delete', () => {
  it('shows confirm/cancel after clicking Delete', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome] }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByLabelText('Delete Salary'))

    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls remove on Confirm', async () => {
    const remove = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome], remove }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByLabelText('Delete Salary'))
    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith('i1')
    })
  })

  it('hides confirm on Cancel', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome] }))
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByLabelText('Delete Salary'))
    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Delete Salary')).toBeInTheDocument()
  })
})

describe('IncomeList — totals', () => {
  it('renders totals for active currencies', () => {
    vi.mocked(useIncomes).mockReturnValue(
      makeHook({ incomes: [baseIncome], totals: { BRL: 5000, USD: 0, CLP: 0 } }),
    )
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)

    expect(screen.getByTestId('income-totals-BRL')).toHaveTextContent('5.000')
  })

  it('does not render totals section when all totals are zero', () => {
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.queryByTestId('income-totals-BRL')).not.toBeInTheDocument()
    expect(screen.queryByTestId('income-totals-USD')).not.toBeInTheDocument()
  })
})

describe('IncomeList — carried-over balance', () => {
  const carry: Income = { id: 'c1', source: 'Balance from Oct 2026', currency: 'BRL', amount: 569.19, carryFrom: '2026-10' }

  it('marks the entry with the month it came from', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [carry] }))
    renderWithProviders(<IncomeList monthKey="2026-11" />)
    expect(screen.getByTestId('carry-c1')).toHaveTextContent('Closing of Oct 2026')
  })

  it('cannot be edited or deleted', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [carry] }))
    renderWithProviders(<IncomeList monthKey="2026-11" />)
    fireEvent.click(screen.getByTestId('source-c1'))
    expect(screen.queryByDisplayValue('Balance from Oct 2026')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete Balance from Oct 2026')).not.toBeInTheDocument()
  })

  it('shows a negative carried balance', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [{ ...carry, amount: -38.88 }] }))
    renderWithProviders(<IncomeList monthKey="2026-11" />)
    expect(screen.getByText('-38.88')).toBeInTheDocument()
  })

  it('warns when the source month was reopened', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [carry] }))
    vi.mocked(useMonthClosing).mockReturnValue(makeClosing({ closing: null }))
    renderWithProviders(<IncomeList monthKey="2026-11" />)
    expect(screen.getByTestId('carry-c1')).toHaveTextContent('Oct 2026 was reopened')
  })

  it('shows the total when it is negative', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({
      incomes: [{ ...carry, amount: -38.88 }],
      totals: { BRL: -38.88, USD: 0, CLP: 0 },
    }))
    renderWithProviders(<IncomeList monthKey="2026-11" />)
    expect(screen.getByTestId('income-totals-BRL')).toBeInTheDocument()
  })
})

describe('IncomeList — closed month', () => {
  beforeEach(() => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome], closed: true }))
  })

  it('hides the add form and delete buttons', () => {
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.queryByPlaceholderText('Source')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete Salary')).not.toBeInTheDocument()
  })

  it('does not open inline editing', () => {
    renderWithProviders(<IncomeList monthKey={MONTH_KEY} />)
    fireEvent.click(screen.getByTestId('source-i1'))
    expect(screen.queryByDisplayValue('Salary')).not.toBeInTheDocument()
  })
})
