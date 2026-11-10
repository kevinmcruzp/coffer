import { isTauri } from '@tauri-apps/api/core'

// True inside the desktop app, where the vault is a file on disk.
// False in a plain browser tab (development), where it falls back to IndexedDB.
export function isDesktop(): boolean {
  return isTauri()
}
