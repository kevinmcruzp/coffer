// Binary values (salt, IV, ciphertext) are base64-encoded so they can be stored
// as strings in IndexedDB settings and serialized inside JSON backup files.

export function uint8ArrayToBase64(bytes: Uint8Array<ArrayBufferLike>): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToUint8Array(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}
