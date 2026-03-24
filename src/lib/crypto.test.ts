import { describe, it, expect } from 'vitest'
import {
  generateSalt,
  generateIV,
  uint8ArrayToBase64,
  base64ToUint8Array,
  deriveKey,
  encrypt,
  decrypt,
  generateVerificationToken,
  verifyKey,
} from './crypto'

describe('generateSalt', () => {
  it('retorna 16 bytes', () => {
    expect(generateSalt()).toHaveLength(16)
  })

  it('gera valores distintos a cada chamada', () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(uint8ArrayToBase64(a)).not.toBe(uint8ArrayToBase64(b))
  })
})

describe('generateIV', () => {
  it('retorna 12 bytes', () => {
    expect(generateIV()).toHaveLength(12)
  })

  it('gera valores distintos a cada chamada', () => {
    const a = generateIV()
    const b = generateIV()
    expect(uint8ArrayToBase64(a)).not.toBe(uint8ArrayToBase64(b))
  })
})

describe('uint8ArrayToBase64 / base64ToUint8Array', () => {
  it('round-trip preserva os bytes', () => {
    const original = new Uint8Array([1, 2, 3, 128, 255])
    const b64 = uint8ArrayToBase64(original)
    const restored = base64ToUint8Array(b64)
    expect(Array.from(restored)).toEqual(Array.from(original))
  })
})

describe('deriveKey', () => {
  it('retorna um CryptoKey', async () => {
    const salt = generateSalt()
    const key = await deriveKey('senha-teste', salt)
    expect(key).toBeInstanceOf(CryptoKey)
  })

  it('produz chave não-exportável', async () => {
    const key = await deriveKey('senha-teste', generateSalt())
    expect(key.extractable).toBe(false)
  })
})

describe('encrypt / decrypt', () => {
  it('round-trip retorna o texto original', async () => {
    const key = await deriveKey('minha-senha', generateSalt())
    const plaintext = 'dados financeiros secretos'
    const ciphertext = await encrypt(plaintext, key)
    const result = await decrypt(ciphertext, key)
    expect(result).toBe(plaintext)
  })

  it('criptografa strings vazias', async () => {
    const key = await deriveKey('senha', generateSalt())
    const ciphertext = await encrypt('', key)
    expect(await decrypt(ciphertext, key)).toBe('')
  })

  it('produz outputs distintos para a mesma entrada (IV aleatório)', async () => {
    const key = await deriveKey('senha', generateSalt())
    const a = await encrypt('mesmo texto', key)
    const b = await encrypt('mesmo texto', key)
    expect(a).not.toBe(b)
  })

  it('lança erro ao descriptografar com chave errada', async () => {
    const salt = generateSalt()
    const keyA = await deriveKey('senha-correta', salt)
    const keyB = await deriveKey('senha-errada', salt)
    const ciphertext = await encrypt('segredo', keyA)
    await expect(decrypt(ciphertext, keyB)).rejects.toThrow()
  })

  it('lança erro com ciphertext adulterado', async () => {
    const key = await deriveKey('senha', generateSalt())
    const ciphertext = await encrypt('dados', key)
    const tampered = ciphertext.slice(0, -4) + 'AAAA'
    await expect(decrypt(tampered, key)).rejects.toThrow()
  })
})

describe('generateVerificationToken / verifyKey', () => {
  it('verifica chave correta como true', async () => {
    const key = await deriveKey('senha-mestra', generateSalt())
    const token = await generateVerificationToken(key)
    expect(await verifyKey(key, token)).toBe(true)
  })

  it('verifica chave errada como false', async () => {
    const salt = generateSalt()
    const correctKey = await deriveKey('senha-correta', salt)
    const wrongKey = await deriveKey('senha-errada', salt)
    const token = await generateVerificationToken(correctKey)
    expect(await verifyKey(wrongKey, token)).toBe(false)
  })

  it('retorna false para token corrompido', async () => {
    const key = await deriveKey('senha', generateSalt())
    expect(await verifyKey(key, 'token-invalido')).toBe(false)
  })
})
