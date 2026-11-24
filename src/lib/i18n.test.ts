import { describe, it, expect } from 'vitest'
import { en } from '../locales/en'
import { ptBR } from '../locales/pt-BR'
import { es } from '../locales/es'
import { detectLanguage, isMessageKey, parseLanguage, translate, type Dictionary } from './i18n'

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()
}

describe('dictionaries', () => {
  it.each([['pt-BR', ptBR], ['es', es]] as [string, Dictionary][])(
    '%s uses the same placeholders as English in every message',
    (_, dictionary) => {
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(placeholders(dictionary[key]), key).toEqual(placeholders(en[key]))
      }
    },
  )

  it.each([['pt-BR', ptBR], ['es', es]] as [string, Dictionary][])(
    '%s has no message left empty',
    (_, dictionary) => {
      for (const [key, text] of Object.entries(dictionary)) {
        expect(text.trim(), key).not.toBe('')
      }
    },
  )
})

describe('detectLanguage', () => {
  it('picks the first supported language among the preferences', () => {
    expect(detectLanguage(['fr-FR', 'es-CL', 'en-US'])).toBe('es')
  })

  it('matches on the primary subtag', () => {
    expect(detectLanguage(['pt-PT'])).toBe('pt-BR')
    expect(detectLanguage(['pt'])).toBe('pt-BR')
    expect(detectLanguage(['EN-gb'])).toBe('en')
  })

  it('falls back to English when nothing is supported', () => {
    expect(detectLanguage(['fr-FR', 'de'])).toBe('en')
    expect(detectLanguage([])).toBe('en')
  })
})

describe('parseLanguage', () => {
  it('accepts only supported languages', () => {
    expect(parseLanguage('pt-BR')).toBe('pt-BR')
    expect(parseLanguage('es')).toBe('es')
    expect(parseLanguage('pt')).toBeNull()
    expect(parseLanguage(null)).toBeNull()
  })
})

describe('isMessageKey', () => {
  it('recognizes dictionary keys only', () => {
    expect(isMessageKey('common.save')).toBe(true)
    expect(isMessageKey('Name cannot be empty')).toBe(false)
    expect(isMessageKey('toString')).toBe(false)
  })
})

describe('translate', () => {
  it('returns the message in the requested language', () => {
    expect(translate('en', 'common.save')).toBe('Save')
    expect(translate('pt-BR', 'common.save')).toBe('Salvar')
    expect(translate('es', 'common.save')).toBe('Guardar')
  })

  it('fills every occurrence of a placeholder', () => {
    expect(translate('en', 'copy.submit', { count: 3 })).toBe('Copy selected (3)')
    expect(translate('en', 'error.nextMonthClosed', { month: 'Nov 2026' })).toBe('Nov 2026 is closed. Reopen Nov 2026 first.')
  })

  it('renders a month param as a short label in the target language', () => {
    expect(translate('en', 'income.carrySource', { month: { month: '2026-10' } })).toBe('Balance from Oct 2026')
    expect(translate('pt-BR', 'income.carrySource', { month: { month: '2026-10' } })).toBe('Saldo de Out 2026')
  })

  it('leaves placeholders without a param untouched', () => {
    expect(translate('en', 'closing.carriedTo', { month: 'Nov 2026' })).toBe('{amount} carried to Nov 2026')
  })

  it('does not treat param values as placeholders', () => {
    expect(translate('en', 'common.deleteItem', { name: '{count}' })).toBe('Delete {count}')
  })
})
