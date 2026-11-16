// Where the vault physically lives. Implementations only move opaque strings around:
// settings are plain key/value pairs (salt, verificationToken, lockTimeoutMinutes, currency)
// and months are already-encrypted ciphertexts. In the vault itself months are keyed by
// currency and month ("BRL:2026-11"); the per-currency view the hooks use (currencyStore.ts)
// takes the plain YYYY-MM. Encryption, validation and change notifications are layered on
// top in db.ts, so every implementation gets them.
export type VaultStore = {
  readSetting(key: string): Promise<string | undefined>
  writeSetting(key: string, value: string): Promise<void>
  readMonthCiphertext(monthKey: string): Promise<string | undefined>
  // All-or-nothing: either every entry is saved or none is.
  writeMonthCiphertexts(entries: [monthKey: string, ciphertext: string][]): Promise<void>
  listMonths(): Promise<string[]>
}
