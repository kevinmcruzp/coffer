import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { useMonthMeta } from './useMonthMeta'
import { useSession } from './useSession'
import { openDB, writeMonth, readMonth } from '../lib/db'
import { deriveKey, generateSalt } from '../lib/crypto'

vi.mock('./useSession')

const MONTH_KEY = '2025-06'

async function makeContext() {
  const db = await openDB(new IDBFactory())
  const key = await deriveKey('test-pass', generateSalt())
  return { db, key }
}

function mockSession(db: IDBDatabase, key: CryptoKey) {
  vi.mocked(useSession).mockReturnValue({
    state: { status: 'unlocked', key },
    db,
    setup: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  })
}

describe('useMonthMeta — empty month', () => {
  it('returns saving=0 and adjustment=0 when month does not exist', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useMonthMeta(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.saving).toBe(0)
    expect(result.current.adjustment).toBe(0)
    expect(result.current.error).toBeNull()
  })
})

describe('useMonthMeta — loading existing month', () => {
  it('loads saving and adjustment from DB', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [],
      incomes: [],
      saving: 500,
      adjustment: -100,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useMonthMeta(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.saving).toBe(500)
    expect(result.current.adjustment).toBe(-100)
  })
})

describe('useMonthMeta — setSaving', () => {
  it('updates saving and persists it', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useMonthMeta(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setSaving(1200)
    })

    expect(result.current.saving).toBe(1200)

    const persisted = await readMonth(db, MONTH_KEY, key)
    expect(persisted.saving).toBe(1200)
  })

  it('rejects negative saving', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useMonthMeta(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.setSaving(-50)
      }),
    ).rejects.toThrow()
  })
})

describe('useMonthMeta — setAdjustment', () => {
  it('updates adjustment and persists it', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useMonthMeta(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setAdjustment(300)
    })

    expect(result.current.adjustment).toBe(300)

    const persisted = await readMonth(db, MONTH_KEY, key)
    expect(persisted.adjustment).toBe(300)
  })

  it('accepts negative adjustment', async () => {
    const { db, key } = await makeContext()
    mockSession(db, key)

    const { result } = renderHook(() => useMonthMeta(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setAdjustment(-200)
    })

    expect(result.current.adjustment).toBe(-200)
  })

  it('preserves existing expenses and incomes when setting adjustment', async () => {
    const { db, key } = await makeContext()
    await writeMonth(db, MONTH_KEY, {
      key: MONTH_KEY,
      expenses: [],
      incomes: [{ id: 'i1', source: 'Salary', currency: 'BRL', amount: 5000 }],
      saving: 300,
      adjustment: 0,
    }, key)
    mockSession(db, key)

    const { result } = renderHook(() => useMonthMeta(MONTH_KEY))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setAdjustment(50)
    })

    const persisted = await readMonth(db, MONTH_KEY, key)
    expect(persisted.incomes).toHaveLength(1)
    expect(persisted.saving).toBe(300)
    expect(persisted.adjustment).toBe(50)
  })
})
