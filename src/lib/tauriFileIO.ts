import { invoke } from '@tauri-apps/api/core'
import type { VaultFileIO } from './fileStore'

// The desktop shell rejects with a plain string; the rest of the app expects Errors.
async function call<T>(command: string, args: Record<string, string>): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch (err) {
    throw new Error(String(err))
  }
}

// Disk access for the vault file, served by the commands in src-tauri/src/lib.rs.
// Those commands only ever touch *.coffer files and their .tmp / .bakN siblings.
export const tauriFileIO: VaultFileIO = {
  exists: path => call<boolean>('vault_exists', { path }),
  readText: path => call<string>('vault_read', { path }),
  writeText: (path, text) => call<void>('vault_write', { path, text }),
  rename: (from, to) => call<void>('vault_rename', { from, to }),
  copy: (from, to) => call<void>('vault_copy', { from, to }),
}
