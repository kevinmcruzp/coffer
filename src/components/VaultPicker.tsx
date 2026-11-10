type Props = {
  error: string | null
  busy: boolean
  onCreate: () => void
  onOpen: () => void
}

// First screen of the desktop app: where should the vault file live?
export function VaultPicker({ error, busy, onCreate, onOpen }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-semibold text-fg">Welcome to Coffer</h1>
          <p className="text-sm text-dim">
            Your finances live in a single encrypted file that you keep wherever you like — your
            Documents folder, a synced folder, a USB drive.
          </p>
        </div>

        {error && <p role="alert" className="text-sm text-neg">{error}</p>}

        <div className="space-y-3">
          <button
            onClick={onCreate}
            disabled={busy}
            className="w-full rounded-lg bg-brass px-4 py-2 font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create a new vault
          </button>
          <button
            onClick={onOpen}
            disabled={busy}
            className="w-full rounded-lg border border-line px-4 py-2 text-sm text-dim transition-colors hover:border-brass hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            Open an existing vault
          </button>
        </div>
      </div>
    </main>
  )
}
