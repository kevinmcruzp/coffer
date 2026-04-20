export function userMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = err instanceof Error ? err.message : String(err)

  if (raw.includes('Session not active') || raw.includes('Session not initialized')) {
    return 'Your session has expired. Please log in again.'
  }
  if (raw.includes('Month not loaded')) {
    return 'Could not load month data. Try refreshing the page.'
  }
  if (raw.includes('Database not ready') || raw.includes('App not initialized')) {
    return 'The app is still loading. Please try again in a moment.'
  }
  if (/^(Expense|Income) ".+" not found$/.test(raw)) {
    return 'The item was not found. Try refreshing the page.'
  }
  if (err instanceof DOMException) {
    return fallback
  }

  return raw || fallback
}
