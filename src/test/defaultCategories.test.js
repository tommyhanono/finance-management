import { describe, it, expect } from 'vitest'
import {
  COLOR_PALETTE,
  COLOR_KEYS,
  ICON_SET,
  makeDefaultCategories,
} from '../utils/defaultCategories'

describe('COLOR_PALETTE', () => {
  it('contains 10 colors', () => {
    expect(Object.keys(COLOR_PALETTE)).toHaveLength(10)
  })

  it('all values are valid hex colors', () => {
    Object.values(COLOR_PALETTE).forEach((hex) => {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})

describe('COLOR_KEYS', () => {
  it('matches the keys of COLOR_PALETTE', () => {
    expect(COLOR_KEYS).toEqual(Object.keys(COLOR_PALETTE))
  })
})

describe('ICON_SET', () => {
  it('has 15 icons', () => {
    expect(ICON_SET).toHaveLength(15)
  })

  it('contains unique icons', () => {
    expect(new Set(ICON_SET).size).toBe(ICON_SET.length)
  })
})

describe('makeDefaultCategories', () => {
  it('returns 6 default categories', () => {
    const cats = makeDefaultCategories()
    expect(cats).toHaveLength(6)
  })

  it('each category has required fields', () => {
    const cats = makeDefaultCategories()
    cats.forEach((cat) => {
      expect(cat).toHaveProperty('id')
      expect(cat).toHaveProperty('name')
      expect(cat).toHaveProperty('icon')
      expect(cat).toHaveProperty('color')
    })
  })

  it('uses valid colors from COLOR_PALETTE', () => {
    const cats = makeDefaultCategories()
    cats.forEach((cat) => {
      expect(Object.keys(COLOR_PALETTE)).toContain(cat.color)
    })
  })

  it('includes an Income category', () => {
    const cats = makeDefaultCategories()
    const income = cats.find((c) => c.id === 'income')
    expect(income).toBeDefined()
    expect(income.name).toBe('Income')
  })

  it('ids are unique', () => {
    const cats = makeDefaultCategories()
    const ids = cats.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
