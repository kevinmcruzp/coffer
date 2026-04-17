import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IncomeList } from './IncomeList'
import { useIncomes } from '../hooks/useIncomes'
import type { Income } from '../types'
import type { UseIncomesResult } from '../hooks/useIncomes'

vi.mock('../hooks/useIncomes')

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
    loading: false,
    error: null,
    totals: { BRL: 0, USD: 0, CLP: 0 },
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(useIncomes).mockReturnValue(makeHook())
})

describe('IncomeList — loading and error states', () => {
  it('shows loading indicator', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ loading: true }))
    render(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows error message', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ error: 'Decryption failed' }))
    render(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.getByText('Decryption failed')).toBeInTheDocument()
  })
})

describe('IncomeList — renders incomes', () => {
  it('renders income rows', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome] }))
    render(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.getByTestId('source-i1')).toHaveTextContent('Salary')
  })

  it('renders empty table when no incomes', () => {
    render(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.queryByRole('row', { name: /salary/i })).not.toBeInTheDocument()
  })
})

describe('IncomeList — add form', () => {
  it('calls add with form values', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useIncomes).mockReturnValue(makeHook({ add }))
    render(<IncomeList monthKey={MONTH_KEY} />)

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

  it('shows error when add fails', async () => {
    const add = vi.fn().mockRejectedValue(new Error('Amount must be greater than zero'))
    vi.mocked(useIncomes).mockReturnValue(makeHook({ add }))
    render(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument()
    })
  })
})

describe('IncomeList — inline editing', () => {
  it('shows input when source cell is clicked', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome] }))
    render(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByTestId('source-i1'))

    expect(screen.getByDisplayValue('Salary')).toBeInTheDocument()
  })

  it('calls update on Enter in source field', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome], update }))
    render(<IncomeList monthKey={MONTH_KEY} />)

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
    render(<IncomeList monthKey={MONTH_KEY} />)

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
    render(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByLabelText('Delete Salary'))

    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls remove on Confirm', async () => {
    const remove = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome], remove }))
    render(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByLabelText('Delete Salary'))
    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith('i1')
    })
  })

  it('hides confirm on Cancel', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome] }))
    render(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByLabelText('Delete Salary'))
    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Delete Salary')).toBeInTheDocument()
  })
})

describe('IncomeList — repeat checkbox', () => {
  it('renders unchecked Repeat checkbox by default', () => {
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome] }))
    render(<IncomeList monthKey={MONTH_KEY} />)
    const checkbox = screen.getByLabelText('Repeat')
    expect(checkbox).not.toBeChecked()
  })

  it('renders checked Repeat checkbox when recurring is true', () => {
    vi.mocked(useIncomes).mockReturnValue(
      makeHook({ incomes: [{ ...baseIncome, recurring: true }] }),
    )
    render(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.getByLabelText('Repeat')).toBeChecked()
  })

  it('calls update with recurring: true when checkbox is checked', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useIncomes).mockReturnValue(makeHook({ incomes: [baseIncome], update }))
    render(<IncomeList monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByLabelText('Repeat'))

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith('i1', { recurring: true })
    })
  })
})

describe('IncomeList — totals', () => {
  it('renders totals for active currencies', () => {
    vi.mocked(useIncomes).mockReturnValue(
      makeHook({ incomes: [baseIncome], totals: { BRL: 5000, USD: 0, CLP: 0 } }),
    )
    render(<IncomeList monthKey={MONTH_KEY} />)

    expect(screen.getByTestId('income-totals-BRL')).toHaveTextContent('5.000')
  })

  it('does not render totals section when all totals are zero', () => {
    render(<IncomeList monthKey={MONTH_KEY} />)
    expect(screen.queryByTestId('income-totals-BRL')).not.toBeInTheDocument()
    expect(screen.queryByTestId('income-totals-USD')).not.toBeInTheDocument()
  })
})
