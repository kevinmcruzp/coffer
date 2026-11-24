import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { LocaleProvider } from './LocaleContext'
import { LANGUAGE_STORAGE_KEY } from './locale'
import { useLocale } from '../hooks/useLocale'

function renderLocale() {
  return renderHook(() => useLocale(), { wrapper: LocaleProvider }).result
}

function preferLanguages(languages: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('LocaleProvider — choosing the language', () => {
  it('follows the system language on first use', () => {
    preferLanguages(['pt-BR', 'en-US'])
    const locale = renderLocale()
    expect(locale.current.t('common.save')).toBe('Salvar')
    expect(document.documentElement.lang).toBe('pt-BR')
  })

  it('falls back to English when the system language is not supported', () => {
    preferLanguages(['fr-FR'])
    expect(renderLocale().current.t('common.save')).toBe('Save')
  })

  it('prefers the language chosen before over the system one', () => {
    preferLanguages(['pt-BR'])
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'es')
    expect(renderLocale().current.t('common.save')).toBe('Guardar')
  })

  it('ignores a stored value that is not a supported language', () => {
    preferLanguages(['es-CL'])
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'klingon')
    expect(renderLocale().current.t('common.save')).toBe('Guardar')
  })

  it('switches immediately and remembers the choice', () => {
    preferLanguages(['en-US'])
    const locale = renderLocale()

    act(() => locale.current.setLanguage('pt-BR'))

    expect(locale.current.language).toBe('pt-BR')
    expect(locale.current.t('common.save')).toBe('Salvar')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt-BR')
    expect(document.documentElement.lang).toBe('pt-BR')
  })
})

describe('LocaleProvider — formatting', () => {
  it('formats amounts, months and dates for the language', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'pt-BR')
    const { current } = renderLocale()

    expect(current.money(1234.5, 'BRL')).toBe('R$ 1.234,50')
    expect(current.money(3200, 'USD', true)).toBe('+US$ 3.200,00')
    expect(current.monthLabel('2026-11')).toBe('Novembro 2026')
    expect(current.shortMonthLabel('2026-02')).toBe('Fev 2026')
    expect(current.date('2026-11-06T12:00:00.000Z')).toBe('06/11/2026')
  })

  it('formats in English by default', () => {
    preferLanguages(['en-US'])
    const { current } = renderLocale()

    expect(current.money(1234.5, 'BRL')).toBe('R$1,234.50')
    expect(current.monthLabel('2026-11')).toBe('November 2026')
    expect(current.date('2026-11-06T12:00:00.000Z')).toBe('11/6/2026')
  })

  it('translates a message carried by an error', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'es')
    const { current } = renderLocale()
    expect(current.t({ key: 'error.nextMonthClosed', params: { month: { month: '2026-11' } } }))
      .toBe('Nov 2026 está cerrado. Reabre Nov 2026 primero.')
  })
})

describe('without a provider', () => {
  it('speaks English', () => {
    const { result } = renderHook(() => useLocale())
    expect(result.current.language).toBe('en')
    expect(result.current.t('common.cancel')).toBe('Cancel')
  })
})
