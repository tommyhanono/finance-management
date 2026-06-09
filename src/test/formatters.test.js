import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatMonth,
  formatPercent,
  formatDateTime,
  formatTime12,
  todayISO,
  nowTime,
} from '../utils/formatters'

describe('formatCurrency', () => {
  it('formats a positive number as USD', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats negative values', () => {
    expect(formatCurrency(-50)).toBe('-$50.00')
  })

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(9.999)).toBe('$10.00')
  })
})

describe('formatDate', () => {
  it('parses an ISO date string', () => {
    expect(formatDate('2024-03-15')).toBe('Mar 15, 2024')
  })

  it('returns original string on invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDateShort', () => {
  it('returns short format', () => {
    expect(formatDateShort('2024-01-05')).toBe('Jan 5')
  })

  it('returns original string on invalid date', () => {
    expect(formatDateShort('bad')).toBe('bad')
  })
})

describe('formatMonth', () => {
  it('formats year-month string', () => {
    expect(formatMonth('2024-07')).toBe('Jul 2024')
  })

  it('returns original string on invalid input', () => {
    expect(formatMonth('invalid')).toBe('invalid')
  })
})

describe('formatPercent', () => {
  it('adds + sign for positive values', () => {
    expect(formatPercent(5.5)).toBe('+5.5%')
  })

  it('keeps - sign for negative values', () => {
    expect(formatPercent(-3.2)).toBe('-3.2%')
  })

  it('respects custom decimal places', () => {
    expect(formatPercent(1.234, 2)).toBe('+1.23%')
  })

  it('formats zero with + sign', () => {
    expect(formatPercent(0)).toBe('+0.0%')
  })
})

describe('formatTime12', () => {
  it('converts 24h to 12h AM', () => {
    expect(formatTime12('09:05')).toBe('9:05 AM')
  })

  it('converts 24h to 12h PM', () => {
    expect(formatTime12('14:30')).toBe('2:30 PM')
  })

  it('handles midnight (00:00)', () => {
    expect(formatTime12('00:00')).toBe('12:00 AM')
  })

  it('handles noon (12:00)', () => {
    expect(formatTime12('12:00')).toBe('12:00 PM')
  })

  it('returns empty string for empty input', () => {
    expect(formatTime12('')).toBe('')
  })
})

describe('formatDateTime', () => {
  it('returns just the date when no time given', () => {
    expect(formatDateTime('2024-06-01', '')).toBe('Jun 1, 2024')
  })

  it('combines date and time in 12h format', () => {
    expect(formatDateTime('2024-06-01', '13:00')).toBe('Jun 1, 2024 · 1:00 PM')
  })
})

describe('todayISO', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = todayISO()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('nowTime', () => {
  it('returns a string in HH:MM format', () => {
    const result = nowTime()
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })
})
