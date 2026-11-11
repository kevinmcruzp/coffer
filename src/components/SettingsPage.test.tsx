import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './SettingsPage'
import { useSession } from '../hooks/useSession'
import { tauriFileIO } from '../lib/tauriFileIO'
import { chooseBackupPath } from '../lib/vaultDialogs'
import { exportBackup } from '../lib/backup'
import { readMonth, writeMonth } from '../lib/db'
import { openMemoryStore } from '../test/memoryFileIO'
import { deriveKey, generateSalt } from '../lib/crypto'
import { uint8ArrayToBase64 } from '../lib/encoding'
import type { LockTimeout } from '../contexts/session'
import type { VaultStore } from '../lib/vaultStore'
import type { MonthData } from '../types'

const toast = vi.fn()

vi.mock('../hooks/useSession')
vi.mock('../hooks/useToast', () => ({ useToast: () => ({ toast }) }))
vi.mock('../lib/tauriFileIO')
vi.mock('../lib/vaultDialogs')

const MONTH_KEY = '2026-10'
const PASSWORD = 'vault-password'
const VAULT_PATH = 'C:\\Users\\me\\Documents\\finances.coffer'
const BACKUP_PATH = 'D:\\backups\\october.coffer'

const october: MonthData = {
  key: MONTH_KEY,
  expenses: [{ id: 'e1', name: 'Rent', category: 'fixed', currency: 'BRL', debit: 1500, credit: 0 }],
  incomes: [],
  saving: 0,
  adjustment: 0,
  budget: 0,
}

async function makeVault(): Promise<{ db: VaultStore; key: CryptoKey }> {
  const db = await openMemoryStore()
  const salt = generateSalt()
  await db.writeSetting('salt', uint8ArrayToBase64(salt))
  return { db, key: await deriveKey(PASSWORD, salt) }
}

function mockSession(db: VaultStore, key: CryptoKey, lockTimeout: LockTimeout = 15) {
  const setLockTimeout = vi.fn<(value: LockTimeout) => Promise<void>>().mockResolvedValue()
  vi.mocked(useSession).mockReturnValue({
    state: { status: 'unlocked', key },
    db,
    lockTimeout,
    setup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    setLockTimeout,
  })
  return { setLockTimeout }
}

async function backupFileOf(months: MonthData[]): Promise<File> {
  const source = await makeVault()
  for (const m of months) await writeMonth(source.db, m.key, m, source.key)
  const text = await exportBackup(source.db, source.key)
  return new File([text], 'backup.coffer', { type: 'application/octet-stream' })
}

describe('SettingsPage', () => {
  let db: VaultStore
  let key: CryptoKey
  const onImport = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ db, key } = await makeVault())
  })

  function renderPage() {
    return render(<SettingsPage vaultPath={VAULT_PATH} onImport={onImport} />)
  }

  describe('auto-lock', () => {
    it('shows the current timeout', () => {
      mockSession(db, key, 30)
      renderPage()
      expect(screen.getByLabelText('Auto-lock after inactivity')).toHaveValue('30')
    })

    it('saves as soon as a new timeout is chosen', async () => {
      const { setLockTimeout } = mockSession(db, key)
      renderPage()

      await userEvent.selectOptions(screen.getByLabelText('Auto-lock after inactivity'), '60')

      expect(setLockTimeout).toHaveBeenCalledWith(60)
      await waitFor(() => expect(toast).toHaveBeenCalledWith('Auto-lock updated'))
    })

    it('can be turned off', async () => {
      const { setLockTimeout } = mockSession(db, key)
      renderPage()

      await userEvent.selectOptions(screen.getByLabelText('Auto-lock after inactivity'), 'never')

      expect(setLockTimeout).toHaveBeenCalledWith('never')
    })

    it('reports a failed save', async () => {
      const { setLockTimeout } = mockSession(db, key)
      setLockTimeout.mockRejectedValue(new Error('disk full'))
      renderPage()

      await userEvent.selectOptions(screen.getByLabelText('Auto-lock after inactivity'), '5')

      await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), 'error'))
      expect(toast).not.toHaveBeenCalledWith('Auto-lock updated')
    })
  })

  describe('data', () => {
    it('opens the CSV import', async () => {
      mockSession(db, key)
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }))

      expect(onImport).toHaveBeenCalledOnce()
    })

    it('shows where the vault file lives', () => {
      mockSession(db, key)
      renderPage()

      expect(screen.getByText(VAULT_PATH)).toBeInTheDocument()
    })

    it('saves an encrypted backup of the whole vault where the user chooses', async () => {
      mockSession(db, key)
      vi.mocked(chooseBackupPath).mockResolvedValue(BACKUP_PATH)
      await writeMonth(db, MONTH_KEY, october, key)
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Save backup' }))

      await waitFor(() => expect(toast).toHaveBeenCalledWith('Backup saved'))
      expect(chooseBackupPath).toHaveBeenCalledWith(expect.stringMatching(/^coffer-backup-\d{4}-\d{2}-\d{2}\.coffer$/))
      expect(tauriFileIO.writeText).toHaveBeenCalledOnce()
      const [path, text] = vi.mocked(tauriFileIO.writeText).mock.calls[0]
      expect(path).toBe(BACKUP_PATH)
      expect(text).toContain('ciphertext')
      expect(text).not.toContain('Rent')
    })

    it('saves nothing when the save dialog is cancelled', async () => {
      mockSession(db, key)
      vi.mocked(chooseBackupPath).mockResolvedValue(null)
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Save backup' }))

      await waitFor(() => expect(chooseBackupPath).toHaveBeenCalled())
      expect(tauriFileIO.writeText).not.toHaveBeenCalled()
      expect(toast).not.toHaveBeenCalled()
    })

    it('refuses to write the backup over the open vault', async () => {
      mockSession(db, key)
      vi.mocked(chooseBackupPath).mockResolvedValue(VAULT_PATH.toUpperCase())
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Save backup' }))

      await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('vault you have open'), 'error'))
      expect(tauriFileIO.writeText).not.toHaveBeenCalled()
    })

    it('reports a backup that could not be written', async () => {
      mockSession(db, key)
      vi.mocked(chooseBackupPath).mockResolvedValue(BACKUP_PATH)
      vi.mocked(tauriFileIO.writeText).mockRejectedValue(new Error('Could not write the vault file: disk full'))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Save backup' }))

      await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('disk full'), 'error'))
      expect(toast).not.toHaveBeenCalledWith('Backup saved')
    })

    it('restores a backup after asking for its password', async () => {
      mockSession(db, key)
      const file = await backupFileOf([october])
      renderPage()

      await userEvent.upload(screen.getByLabelText('Restore backup'), file)
      await userEvent.type(screen.getByLabelText('Backup password'), PASSWORD)
      await userEvent.click(screen.getByRole('button', { name: 'Restore' }))

      await waitFor(() => expect(toast).toHaveBeenCalledWith('1 month restored'))
      expect(await readMonth(db, MONTH_KEY, key)).toEqual(october)
      expect(screen.queryByLabelText('Backup password')).not.toBeInTheDocument()
    })

    it('restores nothing with the wrong password', async () => {
      mockSession(db, key)
      const file = await backupFileOf([october])
      renderPage()

      await userEvent.upload(screen.getByLabelText('Restore backup'), file)
      await userEvent.type(screen.getByLabelText('Backup password'), 'not-the-password')
      await userEvent.click(screen.getByRole('button', { name: 'Restore' }))

      await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.any(String), 'error'))
      expect(await db.listMonths()).toEqual([])
    })

    it('lets the restore be cancelled', async () => {
      mockSession(db, key)
      const file = await backupFileOf([october])
      renderPage()

      await userEvent.upload(screen.getByLabelText('Restore backup'), file)
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByLabelText('Backup password')).not.toBeInTheDocument()
      expect(await db.listMonths()).toEqual([])
    })
  })
})
