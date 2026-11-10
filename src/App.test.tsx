import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const PASSWORD = 'correct-horse-battery'

// PBKDF2 at production strength makes unlocking slow under test.
const UNLOCK = { timeout: 10_000 }

async function createVault() {
  await userEvent.type(await screen.findByPlaceholderText('At least 8 characters'), PASSWORD)
  await userEvent.type(screen.getByPlaceholderText('Repeat your password'), PASSWORD)
  await userEvent.click(screen.getByRole('checkbox'))
  await userEvent.click(screen.getByRole('button'))
}

async function unlockVault() {
  await userEvent.type(await screen.findByPlaceholderText('Your master password'), PASSWORD)
  await userEvent.click(screen.getByRole('button'))
}

async function openSettings() {
  await userEvent.click(await screen.findByRole('button', { name: 'Settings' }, UNLOCK))
}

describe('App — settings page', () => {
  beforeEach(() => {
    // A stored theme keeps the app from querying matchMedia, which jsdom lacks.
    localStorage.setItem('coffer-theme', 'dark')
  })

  it('opens settings as a page, keeps data tools out of the sidebar, and persists changes', async () => {
    const first = render(<App />)
    await createVault()

    // Data tools live in Settings, not in the everyday sidebar.
    await screen.findByRole('button', { name: 'Expenses' }, UNLOCK)
    expect(screen.queryByRole('button', { name: 'Download backup' })).not.toBeInTheDocument()
    expect(screen.queryByText('Import')).not.toBeInTheDocument()

    await openSettings()
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download backup' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quick add expense' })).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Auto-lock after inactivity'), '30')
    await screen.findByText('Auto-lock updated')

    // Leaving settings brings the ledger back.
    await userEvent.click(screen.getByRole('button', { name: 'Expenses' }))
    expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quick add expense' })).toBeInTheDocument()

    // The choice survives closing and reopening the app.
    first.unmount()
    render(<App />)
    await unlockVault()
    await openSettings()
    expect(screen.getByLabelText('Auto-lock after inactivity')).toHaveValue('30')
  }, 30_000)
})
