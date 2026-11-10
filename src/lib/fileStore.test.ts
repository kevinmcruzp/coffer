import { describe, it, expect, beforeEach } from 'vitest'
import { BACKUP_COPIES, openFileStore } from './fileStore'
import { createMemoryFileIO, type MemoryFileIO } from '../test/memoryFileIO'

const PATH = 'vault.coffer'

describe('openFileStore', () => {
  let io: MemoryFileIO

  beforeEach(() => {
    io = createMemoryFileIO()
  })

  it('does not create the file until something is written', async () => {
    await openFileStore(io, PATH)
    expect(io.files.has(PATH)).toBe(false)
  })

  it('persists settings and months across reopen', async () => {
    const store = await openFileStore(io, PATH)
    await store.writeSetting('salt', 'abc')
    await store.writeMonthCiphertexts([['2026-01', 'cipher-jan'], ['2026-02', 'cipher-feb']])

    const reopened = await openFileStore(io, PATH)

    expect(await reopened.readSetting('salt')).toBe('abc')
    expect(await reopened.readMonthCiphertext('2026-01')).toBe('cipher-jan')
    expect((await reopened.listMonths()).sort()).toEqual(['2026-01', '2026-02'])
  })

  it('is self-contained: salt and verification token live in the vault file', async () => {
    const store = await openFileStore(io, PATH)
    await store.writeSetting('salt', 'the-salt')
    await store.writeSetting('verificationToken', 'the-token')

    const copied = createMemoryFileIO()
    copied.files.set('elsewhere.coffer', io.files.get(PATH)!)
    const moved = await openFileStore(copied, 'elsewhere.coffer')

    expect(await moved.readSetting('salt')).toBe('the-salt')
    expect(await moved.readSetting('verificationToken')).toBe('the-token')
  })

  it('leaves no temporary file behind after a write', async () => {
    const store = await openFileStore(io, PATH)
    await store.writeSetting('salt', 'abc')
    expect(io.files.has(`${PATH}.tmp`)).toBe(false)
  })

  it('keeps concurrent writes consistent', async () => {
    const store = await openFileStore(io, PATH)
    await Promise.all([
      store.writeSetting('a', '1'),
      store.writeSetting('b', '2'),
      store.writeMonthCiphertexts([['2026-01', 'c']]),
    ])

    const reopened = await openFileStore(io, PATH)
    expect(await reopened.readSetting('a')).toBe('1')
    expect(await reopened.readSetting('b')).toBe('2')
    expect(await reopened.readMonthCiphertext('2026-01')).toBe('c')
  })

  describe('interrupted writes', () => {
    it('keeps the previous vault intact when the write is cut short', async () => {
      const store = await openFileStore(io, PATH)
      await store.writeMonthCiphertexts([['2026-01', 'old']])
      const before = io.files.get(PATH)

      io.failNext('writeText')
      await expect(store.writeMonthCiphertexts([['2026-01', 'new']])).rejects.toThrow()

      expect(io.files.get(PATH)).toBe(before)
      const reopened = await openFileStore(io, PATH)
      expect(await reopened.readMonthCiphertext('2026-01')).toBe('old')
    })

    it('keeps the previous vault intact when the final swap fails', async () => {
      const store = await openFileStore(io, PATH)
      await store.writeMonthCiphertexts([['2026-01', 'old']])

      io.failNext('rename')
      await expect(store.writeMonthCiphertexts([['2026-01', 'new']])).rejects.toThrow()

      const reopened = await openFileStore(io, PATH)
      expect(await reopened.readMonthCiphertext('2026-01')).toBe('old')
    })

    it('does not report unsaved data as saved', async () => {
      const store = await openFileStore(io, PATH)
      await store.writeMonthCiphertexts([['2026-01', 'old']])

      io.failNext('writeText')
      await expect(store.writeMonthCiphertexts([['2026-01', 'new'], ['2026-02', 'x']])).rejects.toThrow()

      expect(await store.readMonthCiphertext('2026-01')).toBe('old')
      expect(await store.listMonths()).toEqual(['2026-01'])
    })

    it('keeps working after a failed write', async () => {
      const store = await openFileStore(io, PATH)
      io.failNext('writeText')
      await expect(store.writeSetting('a', '1')).rejects.toThrow()

      await store.writeSetting('a', '2')

      const reopened = await openFileStore(io, PATH)
      expect(await reopened.readSetting('a')).toBe('2')
    })
  })

  describe('corrupted or foreign files', () => {
    it('rejects a file that is not JSON', async () => {
      io.files.set(PATH, 'not json at all')
      await expect(openFileStore(io, PATH)).rejects.toThrow('not a valid Coffer vault')
    })

    it('rejects JSON that is not a vault', async () => {
      io.files.set(PATH, JSON.stringify({ version: 1, salt: 's', ciphertext: 'c' }))
      await expect(openFileStore(io, PATH)).rejects.toThrow('not a valid Coffer vault')
    })

    it('never overwrites a file it could not read', async () => {
      io.files.set(PATH, 'not json at all')
      await expect(openFileStore(io, PATH)).rejects.toThrow()
      expect(io.files.get(PATH)).toBe('not json at all')
    })
  })

  describe('previous versions', () => {
    async function session(write: string): Promise<void> {
      const store = await openFileStore(io, PATH)
      await store.writeSetting('value', write)
    }

    async function valueIn(path: string): Promise<string | undefined> {
      return (await openFileStore(io, path)).readSetting('value')
    }

    it('keeps no copy for a brand-new vault', async () => {
      await session('first')
      expect(io.files.has(`${PATH}.bak1`)).toBe(false)
    })

    it('copies the vault as it was when the session started', async () => {
      await session('first')
      await session('second')

      expect(await valueIn(PATH)).toBe('second')
      expect(await valueIn(`${PATH}.bak1`)).toBe('first')
    })

    it('makes one copy per session, not one per write', async () => {
      await session('first')
      const store = await openFileStore(io, PATH)
      await store.writeSetting('value', 'second')
      await store.writeSetting('value', 'third')

      expect(await valueIn(`${PATH}.bak1`)).toBe('first')
      expect(io.files.has(`${PATH}.bak2`)).toBe(false)
    })

    it('keeps only the most recent copies', async () => {
      const sessions = BACKUP_COPIES + 3
      for (let i = 1; i <= sessions; i++) await session(`v${i}`)

      expect(await valueIn(PATH)).toBe(`v${sessions}`)
      for (let n = 1; n <= BACKUP_COPIES; n++) {
        expect(await valueIn(`${PATH}.bak${n}`)).toBe(`v${sessions - n}`)
      }
      expect(io.files.has(`${PATH}.bak${BACKUP_COPIES + 1}`)).toBe(false)
    })

    it('does not open a session just by reading', async () => {
      await session('first')
      const store = await openFileStore(io, PATH)
      await store.readSetting('value')
      expect(io.files.has(`${PATH}.bak1`)).toBe(false)
    })
  })
})
