import { open, save } from '@tauri-apps/plugin-dialog'

const VAULT_FILTERS = [{ name: 'Coffer vault', extensions: ['coffer'] }]

// Native "save as" dialog. Resolves to null when the user cancels.
export function chooseNewVaultPath(title: string): Promise<string | null> {
  return save({ title, defaultPath: 'my-vault.coffer', filters: VAULT_FILTERS })
}

// Native "save as" dialog for a backup copy. Resolves to null when the user cancels.
export function chooseBackupPath(defaultName: string, title: string): Promise<string | null> {
  return save({ title, defaultPath: defaultName, filters: VAULT_FILTERS })
}

// Native "open file" dialog. Resolves to null when the user cancels.
export function chooseExistingVaultPath(title: string): Promise<string | null> {
  return open({ title, multiple: false, directory: false, filters: VAULT_FILTERS })
}
