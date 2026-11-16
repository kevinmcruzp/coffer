import { useEffect } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider } from './SessionContext'
import { createMemoryFileIO, openMemoryStore, type MemoryFileIO } from '../test/memoryFileIO'
import { useSession } from '../hooks/useSession'
import type { SessionContextType } from './session'

function TestConsumer() {
  const { state, setup, login, logout } = useSession()
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <button onClick={() => setup('password123')}>do-setup</button>
      <button onClick={() => login('password123')}>login-correct</button>
      <button onClick={() => login('wrongpass').catch(() => {})}>login-wrong</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

function renderWithProvider(disk: MemoryFileIO) {
  const openStore = () => openMemoryStore(disk)
  return render(
    <SessionProvider openStore={openStore}>
      <TestConsumer />
    </SessionProvider>,
  )
}

function statusIs(value: string) {
  return () => expect(screen.getByTestId('status').textContent).toBe(value)
}

describe('SessionProvider', () => {
  it('starts in loading state then transitions to setup on first access', async () => {
    renderWithProvider(createMemoryFileIO())
    expect(screen.getByTestId('status').textContent).toBe('loading')
    await waitFor(statusIs('setup'))
  })

  it('transitions to unlocked after setup', async () => {
    renderWithProvider(createMemoryFileIO())
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
  })

  it('transitions to locked after logout', async () => {
    renderWithProvider(createMemoryFileIO())
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
    act(() => screen.getByRole('button', { name: 'logout' }).click())
    await waitFor(statusIs('locked'))
  })

  it('shows locked state on second open (salt already stored)', async () => {
    const disk = createMemoryFileIO()
    const { unmount } = renderWithProvider(disk)
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
    unmount()

    renderWithProvider(disk)
    await waitFor(statusIs('locked'))
  })

  it('unlocks with correct password after re-open', async () => {
    const disk = createMemoryFileIO()
    const { unmount } = renderWithProvider(disk)
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
    unmount()

    renderWithProvider(disk)
    await waitFor(statusIs('locked'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'login-correct' })))
    await waitFor(statusIs('unlocked'))
  })

  it('stays locked with wrong password', async () => {
    const disk = createMemoryFileIO()
    const { unmount } = renderWithProvider(disk)
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
    unmount()

    renderWithProvider(disk)
    await waitFor(statusIs('locked'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'login-wrong' })))
    await waitFor(statusIs('locked'))
  })
})

describe('SessionProvider — active currency', () => {
  // Hands the live context to the test, so it can call the session like a hook would.
  function renderSession(disk: MemoryFileIO) {
    const session: { current: SessionContextType | null } = { current: null }
    function Capture() {
      const value = useSession()
      useEffect(() => { session.current = value })
      return <span data-testid="currency">{value.state.status}:{value.currency}</span>
    }
    const openStore = () => openMemoryStore(disk)
    const view = render(<SessionProvider openStore={openStore}><Capture /></SessionProvider>)
    const ready = () => waitFor(() => expect(screen.getByTestId('currency').textContent).not.toMatch(/^loading/))
    return { session, ready, unmount: view.unmount }
  }

  it('starts in BRL on a new vault', async () => {
    const { ready } = renderSession(createMemoryFileIO())
    await ready()
    expect(screen.getByTestId('currency').textContent).toBe('setup:BRL')
  })

  it('remembers the chosen currency when the vault is reopened', async () => {
    const disk = createMemoryFileIO()
    const first = renderSession(disk)
    await first.ready()
    await act(() => first.session.current!.setCurrency('USD'))
    expect(screen.getByTestId('currency').textContent).toBe('setup:USD')
    first.unmount()

    const second = renderSession(disk)
    await second.ready()
    expect(screen.getByTestId('currency').textContent).toBe('setup:USD')
  })

  it('scopes month storage to the active currency while the vault keeps every currency', async () => {
    const { session, ready } = renderSession(createMemoryFileIO())
    await ready()

    await act(() => session.current!.db!.writeMonthCiphertexts([['2026-11', 'brl-nov']]))
    await act(() => session.current!.setCurrency('USD'))
    expect(await session.current!.db!.listMonths()).toEqual([])
    await act(() => session.current!.db!.writeMonthCiphertexts([['2026-11', 'usd-nov']]))

    expect((await session.current!.vault!.listMonths()).sort()).toEqual(['BRL:2026-11', 'USD:2026-11'])
    await act(() => session.current!.setCurrency('BRL'))
    expect(await session.current!.db!.readMonthCiphertext('2026-11')).toBe('brl-nov')
  })
})
