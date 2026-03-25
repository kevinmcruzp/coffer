import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { SessionProvider } from './SessionContext'
import { useSession } from '../hooks/useSession'

function makeIdb() {
  return new IDBFactory()
}

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

function renderWithProvider(idb: IDBFactory) {
  return render(
    <SessionProvider idbFactory={idb}>
      <TestConsumer />
    </SessionProvider>,
  )
}

function statusIs(value: string) {
  return () => expect(screen.getByTestId('status').textContent).toBe(value)
}

describe('SessionProvider', () => {
  it('starts in loading state then transitions to setup on first access', async () => {
    renderWithProvider(makeIdb())
    expect(screen.getByTestId('status').textContent).toBe('loading')
    await waitFor(statusIs('setup'))
  })

  it('transitions to unlocked after setup', async () => {
    renderWithProvider(makeIdb())
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
  })

  it('transitions to locked after logout', async () => {
    renderWithProvider(makeIdb())
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
    act(() => screen.getByRole('button', { name: 'logout' }).click())
    await waitFor(statusIs('locked'))
  })

  it('shows locked state on second open (salt already stored)', async () => {
    const idb = makeIdb()
    const { unmount } = renderWithProvider(idb)
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
    unmount()

    renderWithProvider(idb)
    await waitFor(statusIs('locked'))
  })

  it('unlocks with correct password after re-open', async () => {
    const idb = makeIdb()
    const { unmount } = renderWithProvider(idb)
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
    unmount()

    renderWithProvider(idb)
    await waitFor(statusIs('locked'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'login-correct' })))
    await waitFor(statusIs('unlocked'))
  })

  it('stays locked with wrong password', async () => {
    const idb = makeIdb()
    const { unmount } = renderWithProvider(idb)
    await waitFor(statusIs('setup'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'do-setup' })))
    await waitFor(statusIs('unlocked'))
    unmount()

    renderWithProvider(idb)
    await waitFor(statusIs('locked'))
    await act(() => userEvent.click(screen.getByRole('button', { name: 'login-wrong' })))
    await waitFor(statusIs('locked'))
  })
})
