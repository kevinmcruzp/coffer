import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MonthNavigator } from './MonthNavigator'

function setup(overrides: Partial<Parameters<typeof MonthNavigator>[0]> = {}) {
  const props = {
    monthKey: '2026-07',
    canGoBack: true,
    goBack: vi.fn(),
    goForward: vi.fn(),
    goTo: vi.fn(),
    ...overrides,
  }
  render(<MonthNavigator {...props} />)
  return props
}

describe('MonthNavigator', () => {
  it('shows the formatted month label', () => {
    setup()
    expect(screen.getByRole('button', { name: /july 2026/i })).toBeInTheDocument()
  })

  it('calls goBack and goForward from the arrows', () => {
    const { goBack, goForward } = setup()
    fireEvent.click(screen.getByLabelText('Previous month'))
    fireEvent.click(screen.getByLabelText('Next month'))
    expect(goBack).toHaveBeenCalledOnce()
    expect(goForward).toHaveBeenCalledOnce()
  })

  it('disables the previous arrow when navigation is bounded', () => {
    setup({ canGoBack: false })
    expect(screen.getByLabelText('Previous month')).toBeDisabled()
  })

  it('opens the picker when the label is clicked', () => {
    setup()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /july 2026/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('selects a month in the current year and closes', () => {
    const { goTo } = setup()
    fireEvent.click(screen.getByRole('button', { name: /july 2026/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'March' }))
    expect(goTo).toHaveBeenCalledWith('2026-03')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('changes year with the year stepper before selecting', () => {
    const { goTo } = setup()
    fireEvent.click(screen.getByRole('button', { name: /july 2026/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByLabelText('Previous year'))
    fireEvent.click(within(dialog).getByLabelText('Previous year'))
    expect(within(dialog).getByText('2024')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'December' }))
    expect(goTo).toHaveBeenCalledWith('2024-12')
  })

  it('closes the picker on Escape', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /july 2026/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
