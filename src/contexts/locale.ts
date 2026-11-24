import { createContext } from 'react'
import {
  DEFAULT_LANGUAGE, localeOf, translate,
  type Language, type Message, type MessageKey, type MessageParams,
} from '../lib/i18n'
import { formatMoney } from '../lib/money'
import { monthAbbr, monthLabel, monthName, shortMonthLabel } from '../lib/months'
import type { Currency } from '../types'

// A UI preference of this computer, like the theme — never anything from the vault.
export const LANGUAGE_STORAGE_KEY = 'coffer-language'

export type LocaleContextType = {
  language: Language
  setLanguage: (language: Language) => void
  // Intl tag of the language, for formatting that has no helper here.
  locale: string
  t: (message: MessageKey | Message, params?: MessageParams) => string
  money: (value: number, currency: Currency, signed?: boolean) => string
  monthName: (index: number) => string
  monthAbbr: (index: number) => string
  // "2026-10" → "October 2026"
  monthLabel: (monthKey: string) => string
  // "2026-10" → "Oct 2026"
  shortMonthLabel: (monthKey: string) => string
  // ISO timestamp → the date in the language's usual order
  date: (iso: string) => string
}

export function createLocale(language: Language, setLanguage: (language: Language) => void): LocaleContextType {
  const locale = localeOf(language)
  return {
    language,
    setLanguage,
    locale,
    t: (message, params) =>
      typeof message === 'string'
        ? translate(language, message, params)
        : translate(language, message.key, message.params),
    money: (value, currency, signed) => formatMoney(value, currency, locale, signed),
    monthName: index => monthName(index, locale),
    monthAbbr: index => monthAbbr(index, locale),
    monthLabel: monthKey => monthLabel(monthKey, locale),
    shortMonthLabel: monthKey => shortMonthLabel(monthKey, locale),
    date: iso => new Date(iso).toLocaleDateString(locale),
  }
}

// Without a provider (components rendered on their own, as in tests) the interface is
// English and the language cannot be changed.
export const LocaleContext = createContext<LocaleContextType>(createLocale(DEFAULT_LANGUAGE, () => {}))
