import { useState } from 'react'
import { useSession } from '../hooks/useSession'
import { userMessage } from '../lib/errorMessages'
import { LOCK_TIMEOUT_OPTIONS, type LockTimeout } from '../contexts/session'

type Props = {
  onClose: () => void
}

const OPTION_LABELS: Record<string, string> = {
  '5': '5 minutes',
  '15': '15 minutes',
  '30': '30 minutes',
  '60': '1 hour',
  never: 'Never',
}

export function SettingsModal({ onClose }: Props) {
  const { lockTimeout, setLockTimeout } = useSession()
  const [value, setValue] = useState<LockTimeout>(lockTimeout)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await setLockTimeout(value)
      onClose()
    } catch (err) {
      setError(userMessage(err, 'Failed to save settings'))
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full sm:max-w-sm bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs text-gray-400 uppercase tracking-wider" htmlFor="lock-timeout">
              Auto-lock after inactivity
            </label>
            <select
              id="lock-timeout"
              value={String(value)}
              onChange={(e) => {
                const v = e.target.value
                setValue(v === 'never' ? 'never' : (Number(v) as LockTimeout))
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
            >
              {LOCK_TIMEOUT_OPTIONS.map((opt) => (
                <option key={String(opt)} value={String(opt)}>
                  {OPTION_LABELS[String(opt)]}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 pt-1">
              The vault locks automatically after this much inactivity. You can also lock it manually any time.
            </p>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-white text-gray-950 font-semibold rounded-lg py-2 text-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}
