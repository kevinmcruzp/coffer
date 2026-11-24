import { describe, it, expect } from 'vitest'
import { monthAbbr, monthLabel, monthName, nextMonthKey, shortMonthLabel } from './months'

describe('nextMonthKey', () => {
  it('advances within the year', () => {
    expect(nextMonthKey('2026-10')).toBe('2026-11')
  })

  it('rolls December over to January of the next year', () => {
    expect(nextMonthKey('2026-12')).toBe('2027-01')
  })
})

describe('month labels', () => {
  it('names months in the given locale, capitalized', () => {
    expect(monthName(2, 'en-US')).toBe('March')
    expect(monthName(2, 'pt-BR')).toBe('Março')
    expect(monthName(2, 'es')).toBe('Marzo')
  })

  it('abbreviates without the trailing dot some locales add', () => {
    expect(monthAbbr(10, 'en-US')).toBe('Nov')
    expect(monthAbbr(10, 'pt-BR')).toBe('Nov')
    expect(monthAbbr(10, 'es')).toBe('Nov')
  })

  it('covers every month of the year', () => {
    const names = Array.from({ length: 12 }, (_, i) => monthName(i, 'en-US'))
    expect(names[0]).toBe('January')
    expect(names[11]).toBe('December')
    expect(new Set(names).size).toBe(12)
  })

  it('formats a key as abbreviated month and year', () => {
    expect(shortMonthLabel('2026-10', 'en-US')).toBe('Oct 2026')
    expect(shortMonthLabel('2026-10', 'pt-BR')).toBe('Out 2026')
  })

  it('formats a key as full month and year', () => {
    expect(monthLabel('2026-01', 'en-US')).toBe('January 2026')
    expect(monthLabel('2026-01', 'es')).toBe('Enero 2026')
  })
})
