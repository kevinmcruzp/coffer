import { describe, it, expect } from 'vitest'
import { nextMonthKey, shortMonthLabel } from './months'

describe('nextMonthKey', () => {
  it('advances within the year', () => {
    expect(nextMonthKey('2026-10')).toBe('2026-11')
  })

  it('rolls December over to January of the next year', () => {
    expect(nextMonthKey('2026-12')).toBe('2027-01')
  })
})

describe('shortMonthLabel', () => {
  it('formats a key as abbreviated month and year', () => {
    expect(shortMonthLabel('2026-10')).toBe('Oct 2026')
  })
})
