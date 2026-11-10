import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useVault, type VaultDialogs } from './useVault'
import { openFileStore } from '../lib/fileStore'
import { createMemoryFileIO, type MemoryFileIO } from '../test/memoryFileIO'

const PATH = 'C:\\Users\\me\\Documents\\my-vault.coffer'

async function seedVault(io: MemoryFileIO, path: string): Promise<void> {
  const store = await openFileStore(io, path)
  await store.writeSetting('salt', 'the-salt')
}

describe('useVault', () => {
  let io: MemoryFileIO
  let dialogs: { [K in keyof VaultDialogs]: ReturnType<typeof vi.fn<VaultDialogs[K]>> }

  beforeEach(() => {
    localStorage.clear()
    io = createMemoryFileIO()
    dialogs = {
      chooseNewVaultPath: vi.fn<VaultDialogs['chooseNewVaultPath']>().mockResolvedValue(null),
      chooseExistingVaultPath: vi.fn<VaultDialogs['chooseExistingVaultPath']>().mockResolvedValue(null),
    }
  })

  function renderVault() {
    return renderHook(() => useVault(io, dialogs))
  }

  it('asks which vault to use on first launch', () => {
    const { result } = renderVault()
    expect(result.current.state).toEqual({ status: 'choosing', error: null })
  })

  describe('create', () => {
    it('opens a new vault at the chosen location', async () => {
      dialogs.chooseNewVaultPath.mockResolvedValue(PATH)
      const { result } = renderVault()

      await act(() => result.current.create())

      expect(result.current.state).toMatchObject({ status: 'open', path: PATH })
    })

    it('writes nothing until the vault is actually set up', async () => {
      dialogs.chooseNewVaultPath.mockResolvedValue(PATH)
      const { result } = renderVault()

      await act(() => result.current.create())

      expect(io.files.size).toBe(0)
    })

    it('stays on the choice when the dialog is cancelled', async () => {
      const { result } = renderVault()

      await act(() => result.current.create())

      expect(result.current.state).toEqual({ status: 'choosing', error: null })
    })

    it('opens an existing vault instead of overwriting it', async () => {
      await seedVault(io, PATH)
      dialogs.chooseNewVaultPath.mockResolvedValue(PATH)
      const { result } = renderVault()

      await act(() => result.current.create())

      const { state } = result.current
      if (state.status !== 'open') throw new Error('vault did not open')
      expect(await state.store.readSetting('salt')).toBe('the-salt')
    })
  })

  describe('open', () => {
    it('opens the chosen vault file', async () => {
      await seedVault(io, PATH)
      dialogs.chooseExistingVaultPath.mockResolvedValue(PATH)
      const { result } = renderVault()

      await act(() => result.current.open())

      const { state } = result.current
      if (state.status !== 'open') throw new Error('vault did not open')
      expect(state.path).toBe(PATH)
      expect(await state.store.readSetting('salt')).toBe('the-salt')
    })

    it('refuses a file that is not a vault and leaves it untouched', async () => {
      io.files.set(PATH, 'something else entirely')
      dialogs.chooseExistingVaultPath.mockResolvedValue(PATH)
      const { result } = renderVault()

      await act(() => result.current.open())

      expect(result.current.state).toEqual({
        status: 'choosing',
        error: expect.stringContaining('not a valid Coffer vault'),
      })
      expect(io.files.get(PATH)).toBe('something else entirely')
    })
  })

  describe('remembering the vault', () => {
    it('reopens the last vault on the next launch', async () => {
      await seedVault(io, PATH)
      dialogs.chooseExistingVaultPath.mockResolvedValue(PATH)
      const first = renderVault()
      await act(() => first.result.current.open())
      first.unmount()

      const { result } = renderVault()

      expect(result.current.state).toEqual({ status: 'opening' })
      await waitFor(() => expect(result.current.state).toMatchObject({ status: 'open', path: PATH }))
    })

    it('does not remember a file it could not open', async () => {
      io.files.set(PATH, 'something else entirely')
      dialogs.chooseExistingVaultPath.mockResolvedValue(PATH)
      const first = renderVault()
      await act(() => first.result.current.open())
      first.unmount()

      const { result } = renderVault()

      expect(result.current.state).toEqual({ status: 'choosing', error: null })
    })

    it('asks again, without creating anything, when the last vault is gone', async () => {
      await seedVault(io, PATH)
      dialogs.chooseExistingVaultPath.mockResolvedValue(PATH)
      const first = renderVault()
      await act(() => first.result.current.open())
      first.unmount()
      io.files.clear()

      const { result } = renderVault()

      await waitFor(() =>
        expect(result.current.state).toEqual({
          status: 'choosing',
          error: expect.stringContaining('was not found'),
        }),
      )
      expect(io.files.size).toBe(0)
    })

    it('forgets the vault when it is closed', async () => {
      await seedVault(io, PATH)
      dialogs.chooseExistingVaultPath.mockResolvedValue(PATH)
      const first = renderVault()
      await act(() => first.result.current.open())

      act(() => first.result.current.close())
      expect(first.result.current.state).toEqual({ status: 'choosing', error: null })
      first.unmount()

      const { result } = renderVault()
      expect(result.current.state).toEqual({ status: 'choosing', error: null })
    })
  })
})
