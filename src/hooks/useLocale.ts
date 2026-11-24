import { useContext } from 'react'
import { LocaleContext, type LocaleContextType } from '../contexts/locale'

export function useLocale(): LocaleContextType {
  return useContext(LocaleContext)
}
