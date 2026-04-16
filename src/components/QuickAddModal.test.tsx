import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickAddModal } from './QuickAddModal'
import { useExpenses } from '../hooks/useExpenses'
import type { UseExpensesResult } from '../hooks/useExpenses'

vi.mock('../hooks/useExpenses')

function makeHook(overrides: Partial<UseExpensesResult> = {}): UseExpensesResult {
  return {
    expenses: [],
    loading: false,
    error: null,
    totals: { BRL: { debit: 0, credit: 0, total: 0 }, USD: { debit: 0, credit: 0, total: 0 }, CLP: { debit: 0, credit: 0, total: 0 } },
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(useExpenses).mockReturnValue(makeHook())
})

describe('QuickAddModal', () => {
  it('calls add with correct data on submit', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useExpenses).mockReturnValue(makeHook({ add }))
    const onClose = vi.fn()

    render(<QuickAddModal monthKey="2025-03" onClose={onClose} />)

    await userEvent.type(screen.getByPlaceholderText('Name'), 'Coffee')
    await userEvent.type(screen.getByLabelText('Debit'), '15')
    await userEvent.click(screen.getByRole('button', { name: /add expense/i }))

    await waitFor(() => {
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Coffee', debit: 15, category: 'other' }),
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on backdrop click', () => {
    const onClose = vi.fn()
    const { container } = render(<QuickAddModal monthKey="2025-03" onClose={onClose} />)
    fireEvent.click(container.firstChild as HTMLElement)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on × button click', async () => {
    const onClose = vi.fn()
    render(<QuickAddModal monthKey="2025-03" onClose={onClose} />)
    await userEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error and does not close when add fails', async () => {
    const add = vi.fn().mockRejectedValue(new Error('Name is required'))
    vi.mocked(useExpenses).mockReturnValue(makeHook({ add }))
    const onClose = vi.fn()

    render(<QuickAddModal monthKey="2025-03" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /add expense/i }))

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
