import { useEffect, useState } from 'react'
import { onMonthChanged } from '../lib/monthEvents'

// Counter that bumps whenever `monthKey` is written anywhere in the app.
// Data hooks add it to their fetch effect's deps so they re-read the month.
export function useMonthRevision(monthKey: string): number {
  const [revision, setRevision] = useState(0)

  useEffect(
    () => onMonthChanged(key => { if (key === monthKey) setRevision(r => r + 1) }),
    [monthKey],
  )

  return revision
}
