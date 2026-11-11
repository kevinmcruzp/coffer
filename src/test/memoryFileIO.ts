import { openFileStore, type VaultFileIO } from '../lib/fileStore'
import type { VaultStore } from '../lib/vaultStore'

type Operation = keyof VaultFileIO

export type MemoryFileIO = VaultFileIO & {
  files: Map<string, string>
  // Makes the next call to `operation` fail. A failing writeText leaves a truncated
  // file behind, like a crash or power loss in the middle of a write.
  failNext(operation: Operation): void
}

export function createMemoryFileIO(): MemoryFileIO {
  const files = new Map<string, string>()
  const failing = new Set<Operation>()

  function crashIfArmed(operation: Operation): void {
    if (failing.delete(operation)) throw new Error(`Simulated ${operation} failure`)
  }

  function mustRead(path: string): string {
    const text = files.get(path)
    if (text === undefined) throw new Error(`No such file: ${path}`)
    return text
  }

  return {
    files,
    failNext: operation => {
      failing.add(operation)
    },
    exists: async path => {
      crashIfArmed('exists')
      return files.has(path)
    },
    readText: async path => {
      crashIfArmed('readText')
      return mustRead(path)
    },
    writeText: async (path, text) => {
      if (failing.has('writeText')) files.set(path, text.slice(0, Math.floor(text.length / 2)))
      crashIfArmed('writeText')
      files.set(path, text)
    },
    rename: async (from, to) => {
      crashIfArmed('rename')
      files.set(to, mustRead(from))
      files.delete(from)
    },
    copy: async (from, to) => {
      crashIfArmed('copy')
      files.set(to, mustRead(from))
    },
  }
}

// A vault store on a disk that only exists in memory. Pass the same `io` again to
// reopen the same vault.
export function openMemoryStore(io: VaultFileIO = createMemoryFileIO()): Promise<VaultStore> {
  return openFileStore(io, 'vault.coffer')
}
