import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SetupScreen } from './SetupScreen'

function noop() {
  return Promise.resolve()
}

describe('SetupScreen', () => {
  it('renders password and confirm fields', () => {
    render(<SetupScreen onSetup={noop} />)
    expect(screen.getByLabelText('Master password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  })

  it('submit button is disabled initially', () => {
    render(<SetupScreen onSetup={noop} />)
    expect(screen.getByRole('button', { name: 'Create vault' })).toBeDisabled()
  })

  it('shows error when password is too short', async () => {
    render(<SetupScreen onSetup={noop} />)
    await userEvent.type(screen.getByLabelText('Master password'), 'short')
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    render(<SetupScreen onSetup={noop} />)
    await userEvent.type(screen.getByLabelText('Master password'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different1')
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('keeps submit disabled until no-recovery is acknowledged', async () => {
    render(<SetupScreen onSetup={noop} />)
    await userEvent.type(screen.getByLabelText('Master password'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password123')
    expect(screen.getByRole('button', { name: 'Create vault' })).toBeDisabled()
    await userEvent.click(screen.getByLabelText(/no password recovery/i))
    expect(screen.getByRole('button', { name: 'Create vault' })).toBeEnabled()
  })

  it('calls onSetup with the password on valid submit', async () => {
    const onSetup = vi.fn().mockResolvedValue(undefined)
    render(<SetupScreen onSetup={onSetup} />)
    await userEvent.type(screen.getByLabelText('Master password'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password123')
    await userEvent.click(screen.getByLabelText(/no password recovery/i))
    await userEvent.click(screen.getByRole('button', { name: 'Create vault' }))
    expect(onSetup).toHaveBeenCalledWith('password123')
  })

  it('shows error message when onSetup rejects', async () => {
    const onSetup = vi.fn().mockRejectedValue(new Error('fail'))
    render(<SetupScreen onSetup={onSetup} />)
    await userEvent.type(screen.getByLabelText('Master password'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password123')
    await userEvent.click(screen.getByLabelText(/no password recovery/i))
    await userEvent.click(screen.getByRole('button', { name: 'Create vault' }))
    expect(await screen.findByText('Failed to set up. Please try again.')).toBeInTheDocument()
  })
})
