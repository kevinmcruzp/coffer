// Where the vault physically lives. Implementations only move opaque strings around:
// settings are plain key/value pairs (salt, verificationToken, lockTimeoutMinutes) and
// months are already-encrypted ciphertexts keyed by YYYY-MM. Encryption, validation and
// change notifications are layered on top in db.ts, so every implementation gets them.
export type VaultStore = {
  readSetting(key: string): Promise<string | undefined>
  writeSetting(key: string, value: string): Promise<void>
  readMonthCiphertext(monthKey: string): Promise<string | undefined>
  // All-or-nothing: either every entry is saved or none is.
  writeMonthCiphertexts(entries: [monthKey: string, ciphertext: string][]): Promise<void>
  listMonths(): Promise<string[]>
}
