type IconProps = { className?: string }

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function ExpensesIcon(p: IconProps) {
  return <Svg {...p}><path d="M4 5h16M4 12h16M4 19h10" /></Svg>
}

export function IncomeIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 3v18M8 7h6a3 3 0 0 1 0 6H8m0 0h8" /></Svg>
}

export function SummaryIcon(p: IconProps) {
  return <Svg {...p}><path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-8" /></Svg>
}

export function AnnualIcon(p: IconProps) {
  return <Svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></Svg>
}

export function ImportExportIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></Svg>
}

export function BackupIcon(p: IconProps) {
  return <Svg {...p}><path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" /></Svg>
}

export function LockIcon(p: IconProps) {
  return <Svg {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Svg>
}

export function SettingsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2M12 19.5v2M4.5 4.5l1.4 1.4M18.1 18.1l1.4 1.4M2.5 12h2M19.5 12h2M4.5 19.5l1.4-1.4M18.1 5.9l1.4-1.4" />
    </Svg>
  )
}

export function PlusIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
}

export function ChevronLeftIcon(p: IconProps) {
  return <Svg {...p}><path d="M15 18l-6-6 6-6" /></Svg>
}

export function ChevronRightIcon(p: IconProps) {
  return <Svg {...p}><path d="M9 18l6-6-6-6" /></Svg>
}
