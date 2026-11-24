// Interface language: typed dictionaries, detection and message formatting.
// `en` is the source of truth — the other dictionaries must define every key it has.

import { en } from '../locales/en'
import { ptBR } from '../locales/pt-BR'
import { es } from '../locales/es'
import { shortMonthLabel } from './months'

export type Language = 'en' | 'pt-BR' | 'es'

export const LANGUAGES: Language[] = ['en', 'pt-BR', 'es']

// Each language is listed in its own name, so it can be found from any of them.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
}

export const DEFAULT_LANGUAGE: Language = 'en'

export type MessageKey = keyof typeof en

export type Dictionary = Record<MessageKey, string>

// A month param is rendered as a short month label ("Nov 2026") in the target language.
export type MessageParam = string | number | { month: string }

export type MessageParams = Record<string, MessageParam>

// A message that is translated only when shown — what errors and hook states carry.
export type Message = { key: MessageKey; params?: MessageParams }

const DICTIONARIES: Record<Language, Dictionary> = { en, 'pt-BR': ptBR, es }

// Tag handed to Intl for numbers, amounts, months and dates.
const LOCALE_TAGS: Record<Language, string> = { en: 'en-US', 'pt-BR': 'pt-BR', es: 'es' }

export function localeOf(language: Language): string {
  return LOCALE_TAGS[language]
}

export function parseLanguage(raw: string | null): Language | null {
  return LANGUAGES.find(language => language === raw) ?? null
}

// First supported language among the system's preferences, matched on the primary
// subtag ("pt-PT" → pt-BR, "es-CL" → es); English when none is supported.
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split('-')[0]
    const match = LANGUAGES.find(language => language.toLowerCase().split('-')[0] === primary)
    if (match) return match
  }
  return DEFAULT_LANGUAGE
}

export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(en, value)
}

function renderParam(value: MessageParam, language: Language): string {
  return typeof value === 'object' ? shortMonthLabel(value.month, localeOf(language)) : String(value)
}

// Fills `{name}` placeholders. A placeholder without a matching param is left as is,
// so a caller can split the text around it to wrap that part in markup.
export function translate(language: Language, key: MessageKey, params: MessageParams = {}): string {
  return DICTIONARIES[language][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(params, name) ? renderParam(params[name], language) : placeholder,
  )
}
