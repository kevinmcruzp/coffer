import { base64ToUint8Array, uint8ArrayToBase64 } from './encoding'

// 200k iterations per OWASP recommendation for PBKDF2-SHA256 (as of 2023).
const PBKDF2_ITERATIONS = 200_000

// Fixed canary string encrypted with the derived key and stored in the DB.
// On login, decrypting this token back to the same string proves the password is correct
// without exposing any real data.
const VERIFICATION_PLAINTEXT = 'coffer-v1-ok'

export function generateSalt(): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  return buf
}

export function generateIV(): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(12)
  crypto.getRandomValues(buf)
  return buf
}

export async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Output format: base64(IV[12 bytes] + AES-GCM ciphertext).
// The IV is prepended so decrypt() can split it off without out-of-band storage.
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = generateIV()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )

  const result = new Uint8Array(iv.length + ciphertext.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(ciphertext), iv.length)

  return uint8ArrayToBase64(result)
}

export async function decrypt(ciphertextB64: string, key: CryptoKey): Promise<string> {
  const data = base64ToUint8Array(ciphertextB64)
  const iv = data.slice(0, 12)
  const ciphertext = data.slice(12)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )

  return new TextDecoder().decode(plaintext)
}

export async function generateVerificationToken(key: CryptoKey): Promise<string> {
  return encrypt(VERIFICATION_PLAINTEXT, key)
}

export async function verifyKey(key: CryptoKey, token: string): Promise<boolean> {
  try {
    const plaintext = await decrypt(token, key)
    return plaintext === VERIFICATION_PLAINTEXT
  } catch {
    return false
  }
}
