import { open, save } from '@tauri-apps/plugin-dialog'

const VAULT_FILTERS = [{ name: 'Coffer vault', extensions: ['coffer'] }]

// Native "save as" dialog. Resolves to null when the user cancels.
export function chooseNewVaultPath(): Promise<string | null> {
  return save({ title: 'Create your vault', defaultPath: 'my-vault.coffer', filters: VAULT_FILTERS })
}

// Native "save as" dialog for a backup copy. Resolves to null when the user cancels.
export function chooseBackupPath(defaultName: string): Promise<string | null> {
  return save({ title: 'Save a backup', defaultPath: defaultName, filters: VAULT_FILTERS })
}

// Native "open file" dialog. Resolves to null when the user cancels.
export function chooseExistingVaultPath(): Promise<string | null> {
  return open({ title: 'Open your vault', multiple: false, directory: false, filters: VAULT_FILTERS })
}
