import { describe, it, expect } from 'vitest'
import { AppError } from './appError'
import { userMessage } from './errorMessages'

describe('AppError', () => {
  it('keeps the English text as its message and the key for translation', () => {
    const err = new AppError('error.vaultNotFound', { path: 'C:\\a.coffer' })
    expect(err.message).toBe('The vault at C:\\a.coffer was not found. It may have been moved or renamed.')
    expect(err.userMessage).toEqual({ key: 'error.vaultNotFound', params: { path: 'C:\\a.coffer' } })
  })
})

describe('userMessage', () => {
  it('passes on the message of an AppError', () => {
    expect(userMessage(new AppError('error.backupCorrupted'))).toEqual({ key: 'error.backupCorrupted' })
  })

  it('explains internal session errors', () => {
    expect(userMessage(new Error('Session not active'))).toEqual({ key: 'error.sessionExpired' })
    expect(userMessage(new Error('Month not loaded'))).toEqual({ key: 'error.monthNotLoaded' })
    expect(userMessage(new Error('Database not ready'))).toEqual({ key: 'error.stillLoading' })
    expect(userMessage(new Error('Expense "x" not found'))).toEqual({ key: 'error.itemNotFound' })
  })

  it('uses the fallback for browser errors and empty messages', () => {
    expect(userMessage(new DOMException('decrypt'), 'error.loadMonth')).toEqual({ key: 'error.loadMonth' })
    expect(userMessage(new Error(''), 'error.loadMonth')).toEqual({ key: 'error.loadMonth' })
    expect(userMessage(new Error(''))).toEqual({ key: 'error.generic' })
  })

  it('shows any other error as it came', () => {
    expect(userMessage(new Error('Access is denied. (os error 5)'))).toEqual({
      key: 'error.detail',
      params: { detail: 'Access is denied. (os error 5)' },
    })
  })
})
