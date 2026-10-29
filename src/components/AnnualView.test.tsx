import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { AnnualView } from './AnnualView'
import { useYearSummary } from '../hooks/useYearSummary'
import type { UseYearSummaryResult, MonthRow } from '../hooks/useYearSummary'

vi.mock('../hooks/useYearSummary')

const ZERO = { BRL: 0, USD: 0, CLP: 0 }

function makeHook(overrides: Partial<UseYearSummaryResult> = {}): UseYearSummaryResult {
  return {
    rows: [],
    totals: {
      income: { ...ZERO },
      debit: { ...ZERO },
      credit: { ...ZERO },
      saving: 0,
      adjustment: 0,
      balance: { ...ZERO },
      items: 0,
    },
    loading: false,
    error: null,
    warning: null,
    ...overrides,
  }
}

function makeRow(overrides: Partial<MonthRow> = {}): MonthRow {
  return {
    monthKey: '2025-03',
    income: { ...ZERO, BRL: 5000 },
    debit: { ...ZERO, BRL: 1000 },
    credit: { ...ZERO, BRL: 500 },
    saving: 300,
    adjustment: 0,
    balance: { ...ZERO, BRL: 3200 },
    items: 7,
    prevBalance: null,
    ...overrides,
  }
}

const sampleRow = makeRow()

function table(): HTMLElement {
  return screen.getByRole('table')
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 5, 15))
  vi.mocked(useYearSummary).mockReturnValue(makeHook())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AnnualView — month selection', () => {
  it('calls onSelectMonth with the key of the clicked month', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow] }))
    const onSelectMonth = vi.fn()
    render(<AnnualView year={2025} onSelectMonth={onSelectMonth} />)

    fireEvent.click(within(table()).getByRole('button', { name: 'Open March' }))

    expect(onSelectMonth).toHaveBeenCalledOnce()
    expect(onSelectMonth).toHaveBeenCalledWith('2025-03')
  })

  it('does not select anything on its own', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow] }))
    const onSelectMonth = vi.fn()
    render(<AnnualView year={2025} onSelectMonth={onSelectMonth} />)
    expect(onSelectMonth).not.toHaveBeenCalled()
  })

  it('offers no affordance for months without data', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow] }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)
    expect(within(table()).queryByRole('button', { name: 'Open April' })).not.toBeInTheDocument()
  })
})

describe('AnnualView — the year as twelve months', () => {
  it('renders all twelve months even when only one has data', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow] }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)

    const body = within(table()).getAllByRole('rowgroup')[1]
    expect(within(body).getAllByRole('row')).toHaveLength(12)
    expect(within(body).getByText('Dec')).toBeInTheDocument()
  })

  it('shows the empty state when the year has no data at all', () => {
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)
    expect(screen.getByText('No data for 2025.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('AnnualView — headline figures', () => {
  it('summarises income, spending and net for the year', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({
      rows: [sampleRow],
      totals: {
        income: { ...ZERO, BRL: 5000 },
        debit: { ...ZERO, BRL: 1000 },
        credit: { ...ZERO, BRL: 500 },
        saving: 300,
        adjustment: 0,
        balance: { ...ZERO, BRL: 3200 },
        items: 7,
      },
    }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)

    expect(screen.getByText('Spent')).toBeInTheDocument()
    expect(screen.getByText('Net')).toBeInTheDocument()
    // Spent is debit + credit, a figure the hook does not provide as a column.
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument()
    // Net carries an explicit sign so the figure never relies on colour alone.
    expect(screen.getByText('+R$ 3.200,00')).toBeInTheDocument()
    expect(screen.getByText('1 of 12 months')).toBeInTheDocument()
  })
})

describe('AnnualView — currency', () => {
  it('hides the currency switch when only one currency has data', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow] }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)
    expect(screen.queryByRole('group', { name: 'Currency' })).not.toBeInTheDocument()
  })

  it('scopes the whole view to the chosen currency', () => {
    const usdRow = makeRow({
      monthKey: '2025-04',
      income: { ...ZERO, USD: 800 },
      debit: { ...ZERO, USD: 200 },
      credit: { ...ZERO },
      saving: 0,
      adjustment: 0,
      balance: { ...ZERO, USD: 600 },
    })
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow, usdRow] }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)

    const group = screen.getByRole('group', { name: 'Currency' })
    expect(within(group).getByRole('button', { name: 'BRL' })).toHaveAttribute('aria-pressed', 'true')

    // BRL: March has data, April does not.
    expect(within(table()).getByRole('button', { name: 'Open March' })).toBeInTheDocument()
    expect(within(table()).queryByRole('button', { name: 'Open April' })).not.toBeInTheDocument()

    fireEvent.click(within(group).getByRole('button', { name: 'USD' }))

    // USD: the reverse.
    expect(within(table()).getByRole('button', { name: 'Open April' })).toBeInTheDocument()
    expect(within(table()).queryByRole('button', { name: 'Open March' })).not.toBeInTheDocument()
    // Saving and adjustment are BRL-only, so those columns drop out.
    expect(within(table()).queryByText('Adjustment')).not.toBeInTheDocument()
  })
})

describe('AnnualView — chart', () => {
  const secondRow = makeRow({
    monthKey: '2025-09',
    income: { ...ZERO, BRL: 2000 },
    debit: { ...ZERO, BRL: 3500 },
    credit: { ...ZERO },
    saving: 0,
    balance: { ...ZERO, BRL: -1500 },
  })

  it('plots every month, disabling the ones without data', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow, secondRow] }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)

    const chart = screen.getByRole('figure')
    expect(within(chart).getByRole('button', { name: 'Mar: +3.200' })).toBeEnabled()
    expect(within(chart).getByRole('button', { name: 'Sep: -1.500' })).toBeEnabled()
    expect(within(chart).getByRole('button', { name: 'Apr: no data' })).toBeDisabled()
  })

  it('opens the month behind a clicked column', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow, secondRow] }))
    const onSelectMonth = vi.fn()
    render(<AnnualView year={2025} onSelectMonth={onSelectMonth} />)

    fireEvent.click(within(screen.getByRole('figure')).getByRole('button', { name: 'Mar: +3.200' }))
    expect(onSelectMonth).toHaveBeenCalledWith('2025-03')
  })

  it('is left out when a single month would be the whole chart', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow] }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('AnnualView — states', () => {
  it('shows the loader while the year is being read', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ loading: true }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows the error instead of a table', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ error: 'Failed to load annual data' }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)
    expect(screen.getByText('Failed to load annual data')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('surfaces a partial-read warning alongside the data', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({
      rows: [sampleRow],
      warning: 'Could not load 1 month(s): 2025-08',
    }))
    render(<AnnualView year={2025} onSelectMonth={vi.fn()} />)
    expect(screen.getByText('Could not load 1 month(s): 2025-08')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
