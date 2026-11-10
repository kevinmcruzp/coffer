import { useEffect, useState } from 'react'
import { openFileStore, type VaultFileIO } from '../lib/fileStore'
import { tauriFileIO } from '../lib/tauriFileIO'
import { chooseExistingVaultPath, chooseNewVaultPath } from '../lib/vaultDialogs'
import { userMessage } from '../lib/errorMessages'
import type { VaultStore } from '../lib/vaultStore'

// Only the location of the vault file is remembered here — never its contents or the key.
const LAST_VAULT_KEY = 'coffer-vault-path'

export type VaultDialogs = {
  chooseNewVaultPath: () => Promise<string | null>
  chooseExistingVaultPath: () => Promise<string | null>
}

export type VaultState =
  | { status: 'choosing'; error: string | null }
  | { status: 'opening' }
  | { status: 'open'; path: string; store: VaultStore }

export type UseVaultResult = {
  state: VaultState
  create: () => Promise<void>
  open: () => Promise<void>
  close: () => void
}

const DEFAULT_DIALOGS: VaultDialogs = { chooseNewVaultPath, chooseExistingVaultPath }

// Opens the vault at `path` and remembers it; a vault that cannot be opened is forgotten.
async function load(io: VaultFileIO, path: string, mustExist: boolean): Promise<VaultState> {
  try {
    if (mustExist && !(await io.exists(path))) {
      throw new Error(`The vault at ${path} was not found. It may have been moved or renamed.`)
    }
    const store = await openFileStore(io, path)
    localStorage.setItem(LAST_VAULT_KEY, path)
    return { status: 'open', path, store }
  } catch (err) {
    localStorage.removeItem(LAST_VAULT_KEY)
    return { status: 'choosing', error: userMessage(err, 'Could not open the vault. Please try again.') }
  }
}

// Which vault file the desktop app is working on: lets the user create or open one,
// and reopens the last one on the next launch.
export function useVault(io: VaultFileIO = tauriFileIO, dialogs: VaultDialogs = DEFAULT_DIALOGS): UseVaultResult {
  const [state, setState] = useState<VaultState>(() =>
    localStorage.getItem(LAST_VAULT_KEY) === null ? { status: 'choosing', error: null } : { status: 'opening' },
  )

  useEffect(() => {
    const remembered = localStorage.getItem(LAST_VAULT_KEY)
    if (remembered === null) return

    let cancelled = false
    load(io, remembered, true).then(next => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [io])

  async function openAt(path: string | null, mustExist: boolean) {
    if (path === null) return
    setState({ status: 'opening' })
    setState(await load(io, path, mustExist))
  }

  const create = async () => openAt(await dialogs.chooseNewVaultPath(), false)
  const open = async () => openAt(await dialogs.chooseExistingVaultPath(), true)

  function close() {
    localStorage.removeItem(LAST_VAULT_KEY)
    setState({ status: 'choosing', error: null })
  }

  return { state, create, open, close }
}
