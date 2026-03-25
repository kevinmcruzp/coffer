import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginScreen } from './LoginScreen'

describe('LoginScreen', () => {
  it('renders password field and unlock button', () => {
    render(<LoginScreen onLogin={() => Promise.resolve()} />)
    expect(screen.getByLabelText('Master password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument()
  })

  it('submit button is disabled when field is empty', () => {
    render(<LoginScreen onLogin={() => Promise.resolve()} />)
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeDisabled()
  })

  it('enables submit when password is typed', async () => {
    render(<LoginScreen onLogin={() => Promise.resolve()} />)
    await userEvent.type(screen.getByLabelText('Master password'), 'any')
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeEnabled()
  })

  it('calls onLogin with typed password', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined)
    render(<LoginScreen onLogin={onLogin} />)
    await userEvent.type(screen.getByLabelText('Master password'), 'mypassword')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(onLogin).toHaveBeenCalledWith('mypassword')
  })

  it('shows error message when onLogin rejects', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('Incorrect password'))
    render(<LoginScreen onLogin={onLogin} />)
    await userEvent.type(screen.getByLabelText('Master password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password. Please try again.')
  })

  it('re-enables button after failed login', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('fail'))
    render(<LoginScreen onLogin={onLogin} />)
    await userEvent.type(screen.getByLabelText('Master password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByRole('button', { name: 'Unlock' })).toBeEnabled()
  })
})
