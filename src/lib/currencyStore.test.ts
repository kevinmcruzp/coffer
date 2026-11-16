import { describe, it, expect, beforeEach } from 'vitest'
import { monthStoreKey, parseCurrency, parseMonthStoreKey, scopeToCurrency } from './currencyStore'
import { openMemoryStore } from '../test/memoryFileIO'
import type { VaultStore } from './vaultStore'

describe('parseCurrency', () => {
  it('accepts every supported currency', () => {
    expect(parseCurrency('BRL')).toBe('BRL')
    expect(parseCurrency('USD')).toBe('USD')
    expect(parseCurrency('CLP')).toBe('CLP')
  })

  it('falls back to BRL for a missing or unknown value', () => {
    expect(parseCurrency(undefined)).toBe('BRL')
    expect(parseCurrency('EUR')).toBe('BRL')
    expect(parseCurrency('usd')).toBe('BRL')
  })
})

describe('month store keys', () => {
  it('prefixes the month with its currency', () => {
    expect(monthStoreKey('USD', '2026-11')).toBe('USD:2026-11')
  })

  it('parses a key back into currency and month', () => {
    expect(parseMonthStoreKey('CLP:2026-01')).toEqual({ currency: 'CLP', monthKey: '2026-01' })
  })

  it('rejects keys without a known currency or a valid month', () => {
    expect(parseMonthStoreKey('2026-01')).toBeNull()
    expect(parseMonthStoreKey('EUR:2026-01')).toBeNull()
    expect(parseMonthStoreKey('BRL:2026-13')).toBeNull()
    expect(parseMonthStoreKey('BRL:2026-01:extra')).toBeNull()
  })
})

describe('scopeToCurrency', () => {
  let vault: VaultStore
  let brl: VaultStore
  let usd: VaultStore

  beforeEach(async () => {
    vault = await openMemoryStore()
    brl = scopeToCurrency(vault, 'BRL')
    usd = scopeToCurrency(vault, 'USD')
  })

  it('keeps the same month apart in each currency', async () => {
    await brl.writeMonthCiphertexts([['2026-11', 'brl-nov']])
    await usd.writeMonthCiphertexts([['2026-11', 'usd-nov']])

    expect(await brl.readMonthCiphertext('2026-11')).toBe('brl-nov')
    expect(await usd.readMonthCiphertext('2026-11')).toBe('usd-nov')
  })

  it('does not see months of another currency', async () => {
    await brl.writeMonthCiphertexts([['2026-10', 'a'], ['2026-11', 'b']])
    await usd.writeMonthCiphertexts([['2026-12', 'c']])

    expect(await usd.readMonthCiphertext('2026-10')).toBeUndefined()
    expect((await brl.listMonths()).sort()).toEqual(['2026-10', '2026-11'])
    expect(await usd.listMonths()).toEqual(['2026-12'])
  })

  it('stores months in the vault under the currency-prefixed key', async () => {
    await usd.writeMonthCiphertexts([['2026-11', 'usd-nov']])

    expect(await vault.listMonths()).toEqual(['USD:2026-11'])
    expect(await vault.readMonthCiphertext('USD:2026-11')).toBe('usd-nov')
  })

  it('shares settings across currencies', async () => {
    await brl.writeSetting('lockTimeoutMinutes', '30')

    expect(await usd.readSetting('lockTimeoutMinutes')).toBe('30')
    expect(await vault.readSetting('lockTimeoutMinutes')).toBe('30')
  })
})
