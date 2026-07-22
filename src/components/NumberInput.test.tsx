import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NumberInput } from './NumberInput'

describe('NumberInput', () => {
  it('renders as a number input', () => {
    render(<NumberInput aria-label="amount" />)
    expect(screen.getByLabelText('amount')).toHaveAttribute('type', 'number')
  })

  it('selects its contents on focus so typing replaces the value', () => {
    const select = vi.spyOn(HTMLInputElement.prototype, 'select')
    render(<NumberInput aria-label="amount" defaultValue="10" />)
    fireEvent.focus(screen.getByLabelText('amount'))
    expect(select).toHaveBeenCalled()
    select.mockRestore()
  })

  it('still calls a caller-supplied onFocus', () => {
    const onFocus = vi.fn()
    render(<NumberInput aria-label="amount" onFocus={onFocus} />)
    fireEvent.focus(screen.getByLabelText('amount'))
    expect(onFocus).toHaveBeenCalled()
  })
})
