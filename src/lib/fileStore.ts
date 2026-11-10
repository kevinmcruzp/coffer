import { z } from 'zod'
import type { VaultStore } from './vaultStore'

// Filesystem primitives the file store needs. The desktop shell supplies the real ones;
// keeping them this small lets the save/rotation logic be tested without a disk.
// `rename` and `copy` must replace the destination if it already exists.
export type VaultFileIO = {
  exists(path: string): Promise<boolean>
  readText(path: string): Promise<string>
  writeText(path: string, text: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  copy(from: string, to: string): Promise<void>
}

// How many previous versions are kept next to the vault as <path>.bak1 … .bakN
// (bak1 is the most recent).
export const BACKUP_COPIES = 3

// Vault file: plain JSON whose month values are AES-GCM ciphertexts. Settings hold the
// salt and verification token, so the file alone (plus the password) opens the vault on
// any machine. `format` tells it apart from a backup export, which shares the extension.
const vaultFileSchema = z.object({
  format: z.literal('coffer-vault'),
  version: z.literal(1),
  settings: z.record(z.string(), z.string()),
  months: z.record(z.string(), z.string()),
})

type VaultFile = z.infer<typeof vaultFileSchema>

function ownValue(record: Record<string, string>, key: string): string | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}

function emptyVault(): VaultFile {
  return { format: 'coffer-vault', version: 1, settings: {}, months: {} }
}

async function loadVault(io: VaultFileIO, path: string): Promise<VaultFile> {
  try {
    return vaultFileSchema.parse(JSON.parse(await io.readText(path)))
  } catch {
    throw new Error('This file is not a valid Coffer vault or is corrupted')
  }
}

async function rotateBackups(io: VaultFileIO, path: string): Promise<void> {
  for (let n = BACKUP_COPIES - 1; n >= 1; n--) {
    const older = `${path}.bak${n}`
    if (await io.exists(older)) await io.rename(older, `${path}.bak${n + 1}`)
  }
  await io.copy(path, `${path}.bak1`)
}

// Vault kept in a single file chosen by the user. The whole vault is held in memory and
// rewritten on every change — it is a few KB per month of data.
export async function openFileStore(io: VaultFileIO, path: string): Promise<VaultStore> {
  const existed = await io.exists(path)
  let vault = existed ? await loadVault(io, path) : emptyVault()
  // The vault as found when it was opened is copied aside before the first change of the
  // session, so a bad session can be undone. A vault that did not exist has nothing to keep.
  let backupPending = existed
  let queue: Promise<void> = Promise.resolve()

  // Atomic save: the new content goes to a temporary file and only replaces the vault
  // once fully written, so a crash mid-write never leaves a truncated vault.
  async function save(next: VaultFile): Promise<void> {
    const temporary = `${path}.tmp`
    await io.writeText(temporary, JSON.stringify(next))
    if (backupPending) {
      await rotateBackups(io, path)
      backupPending = false
    }
    await io.rename(temporary, path)
  }

  // Writes run one at a time, and memory only reflects what reached the disk.
  function commit(change: (draft: VaultFile) => void): Promise<void> {
    const result = queue.then(async () => {
      const next: VaultFile = { ...vault, settings: { ...vault.settings }, months: { ...vault.months } }
      change(next)
      await save(next)
      vault = next
    })
    queue = result.catch(() => undefined)
    return result
  }

  return {
    readSetting: async key => ownValue(vault.settings, key),
    writeSetting: (key, value) =>
      commit(draft => {
        draft.settings[key] = value
      }),
    readMonthCiphertext: async monthKey => ownValue(vault.months, monthKey),
    writeMonthCiphertexts: entries =>
      commit(draft => {
        for (const [monthKey, ciphertext] of entries) draft.months[monthKey] = ciphertext
      }),
    listMonths: async () => Object.keys(vault.months),
  }
}
