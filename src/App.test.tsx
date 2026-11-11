import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { tauriFileIO } from './lib/tauriFileIO'
import { chooseExistingVaultPath, chooseNewVaultPath } from './lib/vaultDialogs'

vi.mock('./lib/vaultDialogs')
vi.mock('./lib/tauriFileIO', async () => {
  const { createMemoryFileIO } = await import('./test/memoryFileIO')
  return { tauriFileIO: createMemoryFileIO() }
})

const PASSWORD = 'correct-horse-battery'
const VAULT = 'C:\\Users\\me\\Documents\\finances.coffer'
const OTHER_VAULT = 'D:\\other.coffer'

// PBKDF2 at production strength makes unlocking slow under test.
const UNLOCK = { timeout: 10_000 }

// The in-memory disk is shared by the whole file, so each test creates its own vault.
async function createVault(path: string) {
  vi.mocked(chooseNewVaultPath).mockResolvedValue(path)
  await userEvent.click(await screen.findByRole('button', { name: 'Create a new vault' }))
  await userEvent.type(await screen.findByPlaceholderText('At least 8 characters'), PASSWORD)
  await userEvent.type(screen.getByPlaceholderText('Repeat your password'), PASSWORD)
  await userEvent.click(screen.getByRole('checkbox'))
  await userEvent.click(screen.getByRole('button', { name: /create/i }))
  await screen.findByRole('button', { name: 'Expenses' }, UNLOCK)
}

async function unlockVault() {
  await userEvent.type(await screen.findByPlaceholderText('Your master password'), PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: /unlock/i }))
  await screen.findByRole('button', { name: 'Expenses' }, UNLOCK)
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    // A stored theme keeps the app from querying matchMedia, which jsdom lacks.
    localStorage.setItem('coffer-theme', 'dark')
    vi.mocked(chooseExistingVaultPath).mockResolvedValue(OTHER_VAULT)
  })

  it('keeps the vault in the chosen file and reopens it on the next launch', async () => {
    const first = render(<App />)
    await createVault(VAULT)

    // Where the data lives is visible to the user.
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText(VAULT)).toBeInTheDocument()

    // The vault file exists on disk and holds the credentials needed to reopen it.
    expect(await tauriFileIO.exists(VAULT)).toBe(true)
    expect(await tauriFileIO.readText(VAULT)).toContain('verificationToken')

    // Next launch goes straight to the password for that same vault.
    first.unmount()
    render(<App />)
    await screen.findByPlaceholderText('Your master password')
    expect(screen.getByText(VAULT)).toBeInTheDocument()
    await unlockVault()
  }, 40_000)

  it('lets a locked vault be swapped for another one', async () => {
    vi.mocked(chooseNewVaultPath).mockResolvedValue('C:\\fresh.coffer')
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Create a new vault' }))
    await screen.findByPlaceholderText('At least 8 characters')

    await userEvent.click(screen.getByRole('button', { name: 'Use another vault' }))

    expect(await screen.findByRole('button', { name: 'Open an existing vault' })).toBeInTheDocument()
  })

  it('opens settings as a page, keeps data tools out of the sidebar, and persists changes', async () => {
    const first = render(<App />)
    await createVault('C:\\settings.coffer')

    // Data tools live in Settings, not in the everyday sidebar.
    expect(screen.queryByRole('button', { name: 'Save backup' })).not.toBeInTheDocument()
    expect(screen.queryByText('Import')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save backup' })).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByLabelText('Auto-lock after inactivity')).toHaveValue('30')
  }, 40_000)
})
