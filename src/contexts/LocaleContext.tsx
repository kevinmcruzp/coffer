import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LANGUAGE_STORAGE_KEY, LocaleContext, createLocale } from './locale'
import { detectLanguage, parseLanguage, type Language } from '../lib/i18n'

function initialLanguage(): Language {
  return parseLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY)) ?? detectLanguage(navigator.languages)
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(
    () => createLocale(language, next => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
      setLanguage(next)
    }),
    [language],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
