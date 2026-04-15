import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnnualView } from './AnnualView'
import { useYearSummary } from '../hooks/useYearSummary'
import type { UseYearSummaryResult } from '../hooks/useYearSummary'

vi.mock('../hooks/useYearSummary')

function makeHook(overrides: Partial<UseYearSummaryResult> = {}): UseYearSummaryResult {
  return {
    rows: [],
    totals: {
      income: { BRL: 0, USD: 0 },
      debit: { BRL: 0, USD: 0 },
      credit: { BRL: 0, USD: 0 },
      saving: 0,
      adjustment: 0,
      balance: { BRL: 0, USD: 0 },
    },
    loading: false,
    error: null,
    warning: null,
    ...overrides,
  }
}

const sampleRow = {
  monthKey: '2025-03',
  income: { BRL: 5000, USD: 0 },
  debit: { BRL: 1000, USD: 0 },
  credit: { BRL: 500, USD: 0 },
  saving: 300,
  adjustment: 0,
  balance: { BRL: 3200, USD: 0 },
  prevBalance: null,
}

beforeEach(() => {
  vi.mocked(useYearSummary).mockReturnValue(makeHook())
})

describe('AnnualView — onSelect', () => {
  it('calls onSelectMonth with the correct key when a row is clicked', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow] }))
    const onSelectMonth = vi.fn()
    render(<AnnualView currentYear={2025} onSelectMonth={onSelectMonth} />)

    // "Mar" also appears in bar chart SVG — find the <td> and click its <tr>
    const marTd = screen.getAllByText('Mar').find(el => el.tagName.toLowerCase() === 'td')!
    fireEvent.click(marTd.closest('tr')!)

    expect(onSelectMonth).toHaveBeenCalledOnce()
    expect(onSelectMonth).toHaveBeenCalledWith('2025-03')
  })

  it('does not call onSelectMonth when no row is clicked', () => {
    vi.mocked(useYearSummary).mockReturnValue(makeHook({ rows: [sampleRow] }))
    const onSelectMonth = vi.fn()
    render(<AnnualView currentYear={2025} onSelectMonth={onSelectMonth} />)

    expect(onSelectMonth).not.toHaveBeenCalled()
  })
})

describe('AnnualView — year navigation', () => {
  it('shows empty state for the selected year', () => {
    render(<AnnualView currentYear={2025} onSelectMonth={vi.fn()} />)
    expect(screen.getByText('No data for 2025.')).toBeInTheDocument()
  })

  it('renders the year selector', () => {
    render(<AnnualView currentYear={2025} onSelectMonth={vi.fn()} />)
    expect(screen.getByText('2025')).toBeInTheDocument()
  })
})
