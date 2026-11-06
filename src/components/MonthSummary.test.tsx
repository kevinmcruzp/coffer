import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MonthSummary } from './MonthSummary'
import { useExpenses } from '../hooks/useExpenses'
import { useIncomes } from '../hooks/useIncomes'
import { useMonthMeta } from '../hooks/useMonthMeta'
import { useMonthClosing } from '../hooks/useMonthClosing'
import type { UseExpensesResult } from '../hooks/useExpenses'
import type { UseIncomesResult } from '../hooks/useIncomes'
import type { UseMonthMetaResult } from '../hooks/useMonthMeta'
import type { UseMonthClosingResult } from '../hooks/useMonthClosing'

vi.mock('../hooks/useExpenses')
vi.mock('../hooks/useIncomes')
vi.mock('../hooks/useMonthMeta')
vi.mock('../hooks/useMonthClosing')
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const MONTH_KEY = '2026-10'

function mockData(closed: boolean) {
  const expenses: UseExpensesResult = {
    expenses: [],
    closed,
    loading: false,
    error: null,
    totals: {
      BRL: { debit: 0, credit: 0, total: 0 },
      USD: { debit: 0, credit: 0, total: 0 },
      CLP: { debit: 0, credit: 0, total: 0 },
    },
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }
  const incomes: UseIncomesResult = {
    incomes: [],
    closed,
    loading: false,
    error: null,
    totals: { BRL: 569.19, USD: 0, CLP: 0 },
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }
  const meta: UseMonthMetaResult = {
    saving: 0,
    adjustment: 0,
    budget: 0,
    loading: false,
    error: null,
    setSaving: vi.fn(),
    setAdjustment: vi.fn(),
    setBudget: vi.fn(),
  }
  vi.mocked(useExpenses).mockReturnValue(expenses)
  vi.mocked(useIncomes).mockReturnValue(incomes)
  vi.mocked(useMonthMeta).mockReturnValue(meta)
}

function mockClosing(overrides: Partial<UseMonthClosingResult> = {}): UseMonthClosingResult {
  const result: UseMonthClosingResult = {
    closing: null,
    balance: 569.19,
    nextKey: '2026-11',
    loading: false,
    error: null,
    close: vi.fn().mockResolvedValue(undefined),
    reopen: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  vi.mocked(useMonthClosing).mockReturnValue(result)
  return result
}

describe('MonthSummary — closing an open month', () => {
  beforeEach(() => mockData(false))

  it('asks for confirmation showing the balance and the destination month', () => {
    mockClosing()
    render(<MonthSummary monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close month' }))

    expect(screen.getByTestId('close-confirm')).toHaveTextContent('R$ 569,19')
    expect(screen.getByTestId('close-confirm')).toHaveTextContent('Nov 2026')
  })

  it('closes the month on confirm', async () => {
    const closing = mockClosing()
    render(<MonthSummary monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm close' }))

    await waitFor(() => expect(closing.close).toHaveBeenCalledOnce())
  })

  it('does not close when cancelled', () => {
    const closing = mockClosing()
    render(<MonthSummary monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(closing.close).not.toHaveBeenCalled()
    expect(screen.queryByTestId('close-confirm')).not.toBeInTheDocument()
  })

  it('shows the error when closing fails', async () => {
    mockClosing({ close: vi.fn().mockRejectedValue(new Error('Nov 2026 is closed. Reopen Nov 2026 first.')) })
    render(<MonthSummary monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByRole('button', { name: 'Close month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm close' }))

    expect(await screen.findByText(/Reopen Nov 2026 first/)).toBeInTheDocument()
  })
})

describe('MonthSummary — closed month', () => {
  beforeEach(() => mockData(true))

  it('shows when it was closed and what was carried', () => {
    mockClosing({ closing: { balance: 569.19, closedAt: '2026-11-06T12:00:00.000Z' } })
    render(<MonthSummary monthKey={MONTH_KEY} />)

    const status = screen.getByTestId('closing-status')
    expect(status).toHaveTextContent('Closed on 06/11/2026')
    expect(status).toHaveTextContent('R$ 569,19 carried to Nov 2026')
  })

  it('disables saving, adjustment and budget inputs', () => {
    mockClosing({ closing: { balance: 569.19, closedAt: '2026-11-06T12:00:00.000Z' } })
    render(<MonthSummary monthKey={MONTH_KEY} />)

    for (const input of screen.getAllByRole('spinbutton')) expect(input).toBeDisabled()
  })

  it('reopens the month', async () => {
    const closing = mockClosing({ closing: { balance: 569.19, closedAt: '2026-11-06T12:00:00.000Z' } })
    render(<MonthSummary monthKey={MONTH_KEY} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }))

    await waitFor(() => expect(closing.reopen).toHaveBeenCalledOnce())
  })
})
