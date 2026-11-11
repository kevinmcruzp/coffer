import { tauriFileIO } from './tauriFileIO'
import { chooseBackupPath } from './vaultDialogs'

// Windows paths are case-insensitive, so the comparison is too.
function isSameFile(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

// Asks the user where to keep a backup and writes it there. Resolves to false when the
// user cancels. `vaultPath` is the vault in use, which a backup must never replace.
export async function saveBackupFile(text: string, vaultPath: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10)
  const path = await chooseBackupPath(`coffer-backup-${today}.coffer`)
  if (path === null) return false
  if (isSameFile(path, vaultPath)) {
    throw new Error('That file is the vault you have open. Choose another name for the backup.')
  }
  await tauriFileIO.writeText(path, text)
  return true
}
