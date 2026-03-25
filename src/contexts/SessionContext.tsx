import { useEffect, useRef, useState, type ReactNode } from 'react'
import { deriveKey, generateSalt, generateVerificationToken, verifyKey } from '../lib/crypto'
import { openDB, readSetting, writeSetting } from '../lib/db'
import { base64ToUint8Array, uint8ArrayToBase64 } from '../lib/encoding'
import { SessionContext, type SessionState } from './session'

type Props = {
  children: ReactNode
  idbFactory?: IDBFactory
}

export function SessionProvider({ children, idbFactory }: Props) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const dbRef = useRef<IDBDatabase | null>(null)

  useEffect(() => {
    openDB(idbFactory ?? indexedDB).then(async (db) => {
      dbRef.current = db
      const salt = await readSetting(db, 'salt')
      setState(salt === undefined ? { status: 'setup' } : { status: 'locked' })
    })
  }, [idbFactory])

  async function setup(password: string) {
    const db = dbRef.current!
    const salt = generateSalt()
    const key = await deriveKey(password, salt)
    const token = await generateVerificationToken(key)
    await writeSetting(db, 'salt', uint8ArrayToBase64(salt))
    await writeSetting(db, 'verificationToken', token)
    setState({ status: 'unlocked', key })
  }

  async function login(password: string) {
    const db = dbRef.current!
    const saltB64 = await readSetting(db, 'salt')
    const token = await readSetting(db, 'verificationToken')
    if (!saltB64 || !token) throw new Error('App not initialized')

    const key = await deriveKey(password, base64ToUint8Array(saltB64))
    const valid = await verifyKey(key, token)
    if (!valid) throw new Error('Incorrect password')

    setState({ status: 'unlocked', key })
  }

  function logout() {
    setState({ status: 'locked' })
  }

  return (
    <SessionContext.Provider value={{ state, setup, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}
