const PBKDF2_ITERATIONS = 200_000
const VERIFICATION_PLAINTEXT = 'coffer-v1-ok'

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12))
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToUint8Array(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
