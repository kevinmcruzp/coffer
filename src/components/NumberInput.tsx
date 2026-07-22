import { forwardRef } from 'react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

// Number input that selects its contents on focus, so typing replaces the
// current value instead of appending to it — avoids the "0" → "013" trap.
export const NumberInput = forwardRef<HTMLInputElement, Props>(
  function NumberInput({ onFocus, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="number"
        onFocus={e => {
          e.currentTarget.select()
          onFocus?.(e)
        }}
        {...props}
      />
    )
  },
)
