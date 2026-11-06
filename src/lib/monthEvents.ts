// In-memory signal that a month was written to IndexedDB. Each data hook holds its own
// copy of the month, so without this a write made through one hook (or through closing,
// which also writes the next month) would leave the others showing stale data.
// Carries only the month key — never month contents.

const target = new EventTarget()
const EVENT = 'month-changed'

export function notifyMonthChanged(monthKey: string): void {
  target.dispatchEvent(new CustomEvent<string>(EVENT, { detail: monthKey }))
}

export function onMonthChanged(listener: (monthKey: string) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<string>).detail)
  target.addEventListener(EVENT, handler)
  return () => target.removeEventListener(EVENT, handler)
}
