import { useEffect, useRef, useState } from 'react'

type Props = {
  /** Accessible name of the panel. */
  label: string
  trigger: React.ReactNode
  triggerClassName?: string
  panelClassName?: string
  /** Panel content. Receives a `close` callback; only rendered while open, so
   *  any state the content holds resets on every open. */
  children: (close: () => void) => React.ReactNode
}

export function Popover({ label, trigger, triggerClassName = '', panelClassName = '', children }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute z-30 top-full left-1/2 -translate-x-1/2 mt-2 rounded-xl border border-line bg-panel p-3 shadow-xl ${panelClassName}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
