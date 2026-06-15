import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadSuggestions,
  saveSuggestion,
  getSuggestionsForCategory,
  filterSuggestions,
} from '../utils/suggestions'

// jsdom provides localStorage — reset between tests
beforeEach(() => {
  localStorage.clear()
})

describe('loadSuggestions', () => {
  it('returns empty object when nothing stored', () => {
    expect(loadSuggestions('tommy')).toEqual({})
  })

  it('returns parsed object when data exists', () => {
    localStorage.setItem('spendledger-desc-suggestions-tommy', JSON.stringify({ food: ['Lunch'] }))
    expect(loadSuggestions('tommy')).toEqual({ food: ['Lunch'] })
  })

  it('returns empty object on corrupted JSON', () => {
    localStorage.setItem('spendledger-desc-suggestions-tommy', 'NOT JSON')
    expect(loadSuggestions('tommy')).toEqual({})
  })

  it('is scoped per userId', () => {
    localStorage.setItem('spendledger-desc-suggestions-alice', JSON.stringify({ food: ['Salad'] }))
    expect(loadSuggestions('tommy')).toEqual({})
  })
})

describe('saveSuggestion', () => {
  it('saves a description under a category', () => {
    saveSuggestion('tommy', 'food', 'Lunch')
    const result = loadSuggestions('tommy')
    expect(result['food']).toContain('Lunch')
  })

  it('prepends new suggestions (most recent first)', () => {
    saveSuggestion('tommy', 'food', 'Lunch')
    saveSuggestion('tommy', 'food', 'Dinner')
    const result = loadSuggestions('tommy')
    expect(result['food'][0]).toBe('Dinner')
  })

  it('deduplicates — moves repeated description to front', () => {
    saveSuggestion('tommy', 'food', 'Lunch')
    saveSuggestion('tommy', 'food', 'Dinner')
    saveSuggestion('tommy', 'food', 'Lunch')
    const result = loadSuggestions('tommy')
    expect(result['food'][0]).toBe('Lunch')
    expect(result['food'].filter(s => s === 'Lunch')).toHaveLength(1)
  })

  it('keeps at most 5 suggestions per category', () => {
    for (let i = 0; i < 8; i++) saveSuggestion('tommy', 'food', `Item ${i}`)
    const result = loadSuggestions('tommy')
    expect(result['food']).toHaveLength(5)
  })

  it('does nothing for empty userId', () => {
    saveSuggestion('', 'food', 'Lunch')
    expect(loadSuggestions('')).toEqual({})
  })

  it('does nothing for empty description', () => {
    saveSuggestion('tommy', 'food', '')
    expect(loadSuggestions('tommy')).toEqual({})
  })

  it('does nothing for empty catId', () => {
    saveSuggestion('tommy', '', 'Lunch')
    expect(loadSuggestions('tommy')).toEqual({})
  })

  it('is scoped per userId', () => {
    saveSuggestion('tommy', 'food', 'Lunch')
    expect(loadSuggestions('alice')).toEqual({})
  })

  it('keeps other categories intact when saving', () => {
    saveSuggestion('tommy', 'food', 'Lunch')
    saveSuggestion('tommy', 'transport', 'Gas')
    const result = loadSuggestions('tommy')
    expect(result['food']).toContain('Lunch')
    expect(result['transport']).toContain('Gas')
  })
})

describe('getSuggestionsForCategory', () => {
  it('returns suggestions for the given category', () => {
    saveSuggestion('tommy', 'food', 'Lunch')
    saveSuggestion('tommy', 'food', 'Dinner')
    const result = getSuggestionsForCategory('tommy', 'food')
    expect(result).toHaveLength(2)
  })

  it('returns empty array for unknown category', () => {
    expect(getSuggestionsForCategory('tommy', 'nonexistent')).toEqual([])
  })

  it('returns empty array for unknown user', () => {
    expect(getSuggestionsForCategory('nobody', 'food')).toEqual([])
  })
})

describe('filterSuggestions', () => {
  const suggestions = ['Lunch', 'Dinner', 'Late lunch', 'Groceries', 'McDonald\'s']

  it('returns all suggestions for empty query', () => {
    expect(filterSuggestions(suggestions, '')).toEqual(suggestions)
  })

  it('returns all suggestions for null query', () => {
    expect(filterSuggestions(suggestions, null)).toEqual(suggestions)
  })

  it('filters case-insensitively', () => {
    const result = filterSuggestions(suggestions, 'lunch')
    expect(result).toHaveLength(2) // 'Lunch', 'Late lunch'
  })

  it('returns empty array when no match', () => {
    expect(filterSuggestions(suggestions, 'xyz999')).toHaveLength(0)
  })

  it('matches substring in the middle', () => {
    const result = filterSuggestions(suggestions, 'rocerie')
    expect(result).toContain('Groceries')
  })

  it('handles empty suggestion list', () => {
    expect(filterSuggestions([], 'lunch')).toEqual([])
  })
})
