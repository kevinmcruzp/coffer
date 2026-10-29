import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { YearNavigator } from './YearNavigator'

// The upper bound is "next year", so the clock has to be pinned.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 5, 15))
})

afterEach(() => {
  vi.useRealTimers()
})

function setup(year = 2026) {
  const onChange = vi.fn()
  render(<YearNavigator year={year} onChange={onChange} />)
  return { onChange }
}

function openPicker(year = 2026) {
  fireEvent.click(screen.getByRole('button', { name: String(year) }))
  return screen.getByRole('dialog')
}

describe('YearNavigator', () => {
  it('shows the active year', () => {
    setup()
    expect(screen.getByRole('button', { name: '2026' })).toBeInTheDocument()
  })

  it('steps a year with the arrows', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByLabelText('Previous year'))
    expect(onChange).toHaveBeenCalledWith(2025)

    onChange.mockClear()
    fireEvent.click(screen.getByLabelText('Next year'))
    expect(onChange).toHaveBeenCalledWith(2027)
  })

  it('disables the previous arrow at the lower bound', () => {
    setup(2000)
    expect(screen.getByLabelText('Previous year')).toBeDisabled()
  })

  it('opens a picker showing the page containing the active year', () => {
    setup()
    const dialog = openPicker()
    // Pages are 12 years wide, aligned on 2000 → 2024 starts the page holding 2026.
    expect(within(dialog).getByText('2024–2035')).toBeInTheDocument()
  })

  it('selects a year from the grid and closes', () => {
    const { onChange } = setup()
    const dialog = openPicker()
    fireEvent.click(within(dialog).getByRole('button', { name: '2024' }))
    expect(onChange).toHaveBeenCalledWith(2024)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('pages back through years before selecting', () => {
    const { onChange } = setup()
    const dialog = openPicker()
    fireEvent.click(within(dialog).getByLabelText('Previous years'))
    expect(within(dialog).getByText('2012–2023')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '2015' }))
    expect(onChange).toHaveBeenCalledWith(2015)
  })

  it('disables years beyond next year', () => {
    setup()
    const dialog = openPicker()
    // Today is 2026, so 2027 is selectable and 2028 is not.
    expect(within(dialog).getByRole('button', { name: '2027' })).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: '2028' })).toBeDisabled()
  })

  it('closes the picker on Escape', () => {
    setup()
    openPicker()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
