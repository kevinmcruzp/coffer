import { describe, it, expect } from 'vitest'
import {
  generateSalt,
  generateIV,
  deriveKey,
  encrypt,
  decrypt,
  generateVerificationToken,
  verifyKey,
} from './crypto'
import { uint8ArrayToBase64, base64ToUint8Array } from './encoding'

describe('generateSalt', () => {
  it('returns 16 bytes', () => {
    expect(generateSalt()).toHaveLength(16)
  })

  it('generates distinct values on each call', () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(uint8ArrayToBase64(a)).not.toBe(uint8ArrayToBase64(b))
  })
})

describe('generateIV', () => {
  it('returns 12 bytes', () => {
    expect(generateIV()).toHaveLength(12)
  })

  it('generates distinct values on each call', () => {
    const a = generateIV()
    const b = generateIV()
    expect(uint8ArrayToBase64(a)).not.toBe(uint8ArrayToBase64(b))
  })
})

describe('uint8ArrayToBase64 / base64ToUint8Array', () => {
  it('round-trip preserves all bytes', () => {
    const original = new Uint8Array([1, 2, 3, 128, 255])
    const b64 = uint8ArrayToBase64(original)
    const restored = base64ToUint8Array(b64)
    expect(Array.from(restored)).toEqual(Array.from(original))
  })
})

describe('deriveKey', () => {
  it('returns a CryptoKey', async () => {
    const salt = generateSalt()
    const key = await deriveKey('test-password', salt)
    expect(key).toBeInstanceOf(CryptoKey)
  })

  it('produces a non-extractable key', async () => {
    const key = await deriveKey('test-password', generateSalt())
    expect(key.extractable).toBe(false)
  })
})

describe('encrypt / decrypt', () => {
  it('round-trip returns the original plaintext', async () => {
    const key = await deriveKey('my-password', generateSalt())
    const plaintext = 'secret financial data'
    const ciphertext = await encrypt(plaintext, key)
    expect(await decrypt(ciphertext, key)).toBe(plaintext)
  })

  it('encrypts empty strings', async () => {
    const key = await deriveKey('password', generateSalt())
    const ciphertext = await encrypt('', key)
    expect(await decrypt(ciphertext, key)).toBe('')
  })

  it('produces distinct outputs for the same input (random IV)', async () => {
    const key = await deriveKey('password', generateSalt())
    const a = await encrypt('same text', key)
    const b = await encrypt('same text', key)
    expect(a).not.toBe(b)
  })

  it('throws when decrypting with the wrong key', async () => {
    const salt = generateSalt()
    const keyA = await deriveKey('correct-password', salt)
    const keyB = await deriveKey('wrong-password', salt)
    const ciphertext = await encrypt('secret', keyA)
    await expect(decrypt(ciphertext, keyB)).rejects.toThrow()
  })

  it('throws when ciphertext is tampered', async () => {
    const key = await deriveKey('password', generateSalt())
    const ciphertext = await encrypt('data', key)
    const tampered = ciphertext.slice(0, -4) + 'AAAA'
    await expect(decrypt(tampered, key)).rejects.toThrow()
  })
})

describe('generateVerificationToken / verifyKey', () => {
  it('returns true for the correct key', async () => {
    const key = await deriveKey('master-password', generateSalt())
    const token = await generateVerificationToken(key)
    expect(await verifyKey(key, token)).toBe(true)
  })

  it('returns false for a wrong key', async () => {
    const salt = generateSalt()
    const correctKey = await deriveKey('correct-password', salt)
    const wrongKey = await deriveKey('wrong-password', salt)
    const token = await generateVerificationToken(correctKey)
    expect(await verifyKey(wrongKey, token)).toBe(false)
  })

  it('returns false for a corrupted token', async () => {
    const key = await deriveKey('password', generateSalt())
    expect(await verifyKey(key, 'invalid-token')).toBe(false)
  })
})
