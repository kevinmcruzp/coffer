import { Popover } from './Popover'

type Props = {
  /** Name of the field being explained — used for the accessible names. */
  label: string
  align?: 'center' | 'end'
  children: React.ReactNode
}

export function InfoTip({ label, align, children }: Props) {
  const name = `About ${label}`
  return (
    <Popover
      label={name}
      align={align}
      trigger={
        <>
          <span aria-hidden="true">?</span>
          <span className="sr-only">{name}</span>
        </>
      }
      triggerClassName="inline-flex items-center justify-center w-4 h-4 rounded-full border border-line text-[10px] leading-none text-faint hover:text-brass hover:border-brass focus:outline-none focus-visible:border-brass"
      panelClassName="w-56 text-left text-xs text-dim normal-case tracking-normal font-normal leading-relaxed"
    >
      {() => children}
    </Popover>
  )
}
