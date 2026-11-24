import { AppError } from './appError'
import type { Message, MessageKey } from './i18n'

// What to tell the user about `err`, as a message translated when shown.
export function userMessage(err: unknown, fallback: MessageKey = 'error.generic'): Message {
  if (err instanceof AppError) return err.userMessage

  const raw = err instanceof Error ? err.message : String(err)

  if (raw.includes('Session not active') || raw.includes('Session not initialized')) {
    return { key: 'error.sessionExpired' }
  }
  if (raw.includes('Month not loaded')) {
    return { key: 'error.monthNotLoaded' }
  }
  if (raw.includes('Database not ready') || raw.includes('App not initialized')) {
    return { key: 'error.stillLoading' }
  }
  if (/^(Expense|Income) ".+" not found$/.test(raw)) {
    return { key: 'error.itemNotFound' }
  }
  if (err instanceof DOMException || raw === '') {
    return { key: fallback }
  }

  // Anything else (a disk error from the desktop shell, say) is shown as it came.
  return { key: 'error.detail', params: { detail: raw } }
}
