import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { tauriFileIO } from './lib/tauriFileIO'
import { chooseExistingVaultPath, chooseNewVaultPath } from './lib/vaultDialogs'

vi.mock('./lib/platform', () => ({ isDesktop: () => true }))
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

async function setUpVault() {
  await userEvent.type(await screen.findByPlaceholderText('At least 8 characters'), PASSWORD)
  await userEvent.type(screen.getByPlaceholderText('Repeat your password'), PASSWORD)
  await userEvent.click(screen.getByRole('checkbox'))
  await userEvent.click(screen.getByRole('button', { name: /create/i }))
}

describe('App — desktop', () => {
  beforeEach(() => {
    localStorage.clear()
    // A stored theme keeps the app from querying matchMedia, which jsdom lacks.
    localStorage.setItem('coffer-theme', 'dark')
    vi.mocked(chooseNewVaultPath).mockResolvedValue(VAULT)
    vi.mocked(chooseExistingVaultPath).mockResolvedValue(OTHER_VAULT)
  })

  it('keeps the vault in the chosen file and reopens it on the next launch', async () => {
    const first = render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: 'Create a new vault' }))
    await setUpVault()
    await screen.findByRole('button', { name: 'Expenses' }, UNLOCK)

    // Where the data lives is visible to the user.
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText(VAULT)).toBeInTheDocument()

    // The vault file exists on disk and holds the credentials needed to reopen it.
    expect(await tauriFileIO.exists(VAULT)).toBe(true)
    expect(await tauriFileIO.readText(VAULT)).toContain('verificationToken')

    // Next launch goes straight to the password for that same vault.
    first.unmount()
    render(<App />)
    await userEvent.type(await screen.findByPlaceholderText('Your master password'), PASSWORD)
    expect(screen.getByText(VAULT)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /unlock/i }))
    await screen.findByRole('button', { name: 'Expenses' }, UNLOCK)
  }, 40_000)

  it('lets a locked vault be swapped for another one', async () => {
    // The in-memory disk is shared by the whole file, so this test uses its own vault.
    vi.mocked(chooseNewVaultPath).mockResolvedValue('C:\\fresh.coffer')
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'Create a new vault' }))
    await screen.findByPlaceholderText('At least 8 characters')

    await userEvent.click(screen.getByRole('button', { name: 'Use another vault' }))

    expect(await screen.findByRole('button', { name: 'Open an existing vault' })).toBeInTheDocument()
  })
})
