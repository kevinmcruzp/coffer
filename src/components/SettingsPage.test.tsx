import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { SettingsPage } from './SettingsPage'
import { useSession } from '../hooks/useSession'
import { downloadBlob } from '../lib/download'
import { exportBackup } from '../lib/backup'
import { readMonth, writeMonth } from '../lib/db'
import { openIdbStore } from '../lib/idbStore'
import { deriveKey, generateSalt } from '../lib/crypto'
import { uint8ArrayToBase64 } from '../lib/encoding'
import type { LockTimeout } from '../contexts/session'
import type { VaultStore } from '../lib/vaultStore'
import type { MonthData } from '../types'

const toast = vi.fn()

vi.mock('../hooks/useSession')
vi.mock('../hooks/useToast', () => ({ useToast: () => ({ toast }) }))
vi.mock('../lib/download')

const MONTH_KEY = '2026-10'
const PASSWORD = 'vault-password'

const october: MonthData = {
  key: MONTH_KEY,
  expenses: [{ id: 'e1', name: 'Rent', category: 'fixed', currency: 'BRL', debit: 1500, credit: 0 }],
  incomes: [],
  saving: 0,
  adjustment: 0,
  budget: 0,
}

async function makeVault(): Promise<{ db: VaultStore; key: CryptoKey }> {
  const db = await openIdbStore(new IDBFactory())
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
  const blob = await exportBackup(source.db, source.key)
  return new File([await blob.text()], 'backup.coffer', { type: 'application/octet-stream' })
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
    return render(<SettingsPage monthKey={MONTH_KEY} onImport={onImport} />)
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
    it('exports the current month as CSV', async () => {
      mockSession(db, key)
      await writeMonth(db, MONTH_KEY, october, key)
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Export Oct 2026' }))

      await waitFor(() => expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'Financas(2026-10).csv'))
    })

    it('says so when the current month has nothing to export', async () => {
      mockSession(db, key)
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Export Oct 2026' }))

      await waitFor(() => expect(toast).toHaveBeenCalledWith('No data found for this month', 'error'))
      expect(downloadBlob).not.toHaveBeenCalled()
    })

    it('opens the CSV import', async () => {
      mockSession(db, key)
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Import CSV' }))

      expect(onImport).toHaveBeenCalledOnce()
    })

    it('downloads an encrypted backup of the whole vault', async () => {
      mockSession(db, key)
      await writeMonth(db, MONTH_KEY, october, key)
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Download backup' }))

      await waitFor(() =>
        expect(downloadBlob).toHaveBeenCalledWith(
          expect.any(Blob),
          expect.stringMatching(/^coffer-backup-\d{4}-\d{2}-\d{2}\.coffer$/),
        ),
      )
      const blob = vi.mocked(downloadBlob).mock.calls[0][0]
      expect(await blob.text()).not.toContain('Rent')
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
