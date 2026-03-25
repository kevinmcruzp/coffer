import { useContext } from 'react'
import { SessionContext, type SessionContextType } from '../contexts/session'

export function useSession(): SessionContextType {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}
