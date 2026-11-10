import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VaultPicker } from './VaultPicker'

describe('VaultPicker', () => {
  it('offers to create a vault or open an existing one', async () => {
    const onCreate = vi.fn()
    const onOpen = vi.fn()
    render(<VaultPicker error={null} busy={false} onCreate={onCreate} onOpen={onOpen} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create a new vault' }))
    await userEvent.click(screen.getByRole('button', { name: 'Open an existing vault' }))

    expect(onCreate).toHaveBeenCalledOnce()
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('shows why the last attempt failed', () => {
    render(<VaultPicker error="This file is not a valid Coffer vault" busy={false} onCreate={vi.fn()} onOpen={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('This file is not a valid Coffer vault')
  })

  it('blocks both choices while a vault is being opened', () => {
    render(<VaultPicker error={null} busy onCreate={vi.fn()} onOpen={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Create a new vault' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Open an existing vault' })).toBeDisabled()
  })
})
