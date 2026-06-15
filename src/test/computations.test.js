import { describe, it, expect } from 'vitest'
import {
  computeTotalIncome,
  computeTotalExpenses,
  computeBalance,
  computeSavingsRate,
  computeRunningBalance,
  computeMonthlyIncomeExpenses,
  computeCategoryTotals,
  computeRecentEntries,
  filterEntries,
  sortEntries,
  computeNetTotal,
  paginateEntries,
  computeSpendingByCategory,
  computeMonthlyTrend,
  computeMonthlySummary,
  validateEntryForm,
  buildEntryPayload,
  mergeWithSeed,
  isSessionExpired,
  makeUserId,
} from '../utils/computations'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeEntry = (overrides = {}) => ({
  id: 'e1',
  category: 'food',
  description: 'Test',
  amount: -20,
  type: 'expense',
  date: '2024-01-15',
  time: '10:00',
  platform: null,
  notes: null,
  recurring: false,
  ...overrides,
})

const ENTRIES = [
  makeEntry({ id: 'e1', amount: 2000,  category: 'income', type: 'income',  date: '2024-01-01', time: '09:00', description: 'Salary',   platform: 'Employer' }),
  makeEntry({ id: 'e2', amount: -150,  category: 'food',   type: 'expense', date: '2024-01-05', time: '12:30', description: 'Groceries', platform: 'Whole Foods', notes: 'weekly shop' }),
  makeEntry({ id: 'e3', amount: -800,  category: 'housing',type: 'expense', date: '2024-01-01', time: '08:00', description: 'Rent',      platform: 'Landlord' }),
  makeEntry({ id: 'e4', amount: 500,   category: 'income', type: 'income',  date: '2024-02-01', time: '10:00', description: 'Freelance', platform: 'Client A' }),
  makeEntry({ id: 'e5', amount: -60,   category: 'food',   type: 'expense', date: '2024-02-10', time: '19:00', description: 'Restaurant', platform: 'Chipotle' }),
  makeEntry({ id: 'e6', amount: -40,   category: 'transport', type: 'expense', date: '2024-02-15', time: '08:00', description: 'Gas',    platform: 'Shell' }),
]

const CATEGORIES = [
  { id: 'income',    name: 'Income',    icon: '💼', color: 'emerald' },
  { id: 'food',      name: 'Food',      icon: '🍔', color: 'amber'   },
  { id: 'housing',   name: 'Housing',   icon: '🏠', color: 'blue'    },
  { id: 'transport', name: 'Transport', icon: '🚗', color: 'sky'     },
]

const COLOR_PALETTE = {
  emerald: '#10b981',
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  sky:     '#0ea5e9',
}

// ─── computeTotalIncome ──────────────────────────────────────────────────────

describe('computeTotalIncome', () => {
  it('sums all positive amounts', () => {
    expect(computeTotalIncome(ENTRIES)).toBe(2500)
  })

  it('returns 0 when no income entries', () => {
    const expenses = ENTRIES.filter(e => e.amount < 0)
    expect(computeTotalIncome(expenses)).toBe(0)
  })

  it('returns 0 on empty array', () => {
    expect(computeTotalIncome([])).toBe(0)
  })

  it('ignores negative amounts', () => {
    const mixed = [makeEntry({ amount: 100 }), makeEntry({ amount: -50 })]
    expect(computeTotalIncome(mixed)).toBe(100)
  })
})

// ─── computeTotalExpenses ────────────────────────────────────────────────────

describe('computeTotalExpenses', () => {
  it('sums all negative amounts (as negative)', () => {
    expect(computeTotalExpenses(ENTRIES)).toBe(-1050)
  })

  it('returns 0 on empty array', () => {
    expect(computeTotalExpenses([])).toBe(0)
  })

  it('ignores positive amounts', () => {
    const income = ENTRIES.filter(e => e.amount > 0)
    expect(computeTotalExpenses(income)).toBe(0)
  })
})

// ─── computeBalance ──────────────────────────────────────────────────────────

describe('computeBalance', () => {
  it('returns income + expenses (algebraic sum)', () => {
    expect(computeBalance(ENTRIES)).toBe(1450) // 2500 - 1050
  })

  it('returns 0 on empty array', () => {
    expect(computeBalance([])).toBe(0)
  })

  it('can be negative when expenses exceed income', () => {
    const entries = [makeEntry({ amount: 100 }), makeEntry({ amount: -300 })]
    expect(computeBalance(entries)).toBe(-200)
  })
})

// ─── computeSavingsRate ──────────────────────────────────────────────────────

describe('computeSavingsRate', () => {
  it('calculates savings rate correctly', () => {
    // income=2500, expenses=-1050 → net=1450 → 1450/2500 * 100 = 58%
    const rate = computeSavingsRate(2500, -1050)
    expect(rate).toBeCloseTo(58, 0)
  })

  it('returns null when income is 0', () => {
    expect(computeSavingsRate(0, -200)).toBeNull()
  })

  it('returns null when income is negative', () => {
    expect(computeSavingsRate(-100, -200)).toBeNull()
  })

  it('returns 100% when there are no expenses', () => {
    expect(computeSavingsRate(1000, 0)).toBeCloseTo(100, 1)
  })

  it('returns negative rate when expenses exceed income', () => {
    const rate = computeSavingsRate(500, -1000)
    expect(rate).toBeLessThan(0)
  })
})

// ─── computeRunningBalance ───────────────────────────────────────────────────

describe('computeRunningBalance', () => {
  it('returns chronologically sorted running sum', () => {
    const entries = [
      makeEntry({ id: 'a', amount: 1000, date: '2024-01-01', time: '09:00' }),
      makeEntry({ id: 'b', amount: -200, date: '2024-01-02', time: '10:00' }),
      makeEntry({ id: 'c', amount:  300, date: '2024-01-03', time: '08:00' }),
    ]
    const result = computeRunningBalance(entries)
    expect(result).toHaveLength(3)
    expect(result[0].balance).toBe(1000)
    expect(result[1].balance).toBe(800)
    expect(result[2].balance).toBe(1100)
  })

  it('returns empty array for no entries', () => {
    expect(computeRunningBalance([])).toEqual([])
  })

  it('sorts by time within same date', () => {
    const entries = [
      makeEntry({ id: 'b', amount: -100, date: '2024-01-01', time: '15:00' }),
      makeEntry({ id: 'a', amount:  500, date: '2024-01-01', time: '08:00' }),
    ]
    const result = computeRunningBalance(entries)
    expect(result[0].balance).toBe(500)
    expect(result[1].balance).toBe(400)
  })

  it('does not mutate the original array', () => {
    const entries = [
      makeEntry({ id: 'a', amount: 100, date: '2024-01-02' }),
      makeEntry({ id: 'b', amount: 200, date: '2024-01-01' }),
    ]
    const original = entries.map(e => ({ ...e }))
    computeRunningBalance(entries)
    expect(entries[0].id).toBe(original[0].id)
    expect(entries[1].id).toBe(original[1].id)
  })
})

// ─── computeMonthlyIncomeExpenses ────────────────────────────────────────────

describe('computeMonthlyIncomeExpenses', () => {
  it('groups entries by month', () => {
    const result = computeMonthlyIncomeExpenses(ENTRIES)
    expect(result).toHaveLength(2)
    expect(result[0].month).toBe('2024-01')
    expect(result[1].month).toBe('2024-02')
  })

  it('separates income and expenses correctly', () => {
    const result = computeMonthlyIncomeExpenses(ENTRIES)
    const jan = result.find(r => r.month === '2024-01')
    expect(jan.income).toBe(2000)
    expect(jan.expenses).toBe(950) // 150 + 800
  })

  it('returns empty array for no entries', () => {
    expect(computeMonthlyIncomeExpenses([])).toEqual([])
  })

  it('returns sorted chronologically', () => {
    const entries = [
      makeEntry({ amount: 100, date: '2024-03-01' }),
      makeEntry({ amount: 200, date: '2024-01-01' }),
    ]
    const result = computeMonthlyIncomeExpenses(entries)
    expect(result[0].month).toBe('2024-01')
    expect(result[1].month).toBe('2024-03')
  })

  it('expenses field is always positive (absolute value)', () => {
    const result = computeMonthlyIncomeExpenses(ENTRIES)
    result.forEach(m => {
      expect(m.expenses).toBeGreaterThanOrEqual(0)
    })
  })
})

// ─── computeCategoryTotals ───────────────────────────────────────────────────

describe('computeCategoryTotals', () => {
  it('builds a map of totals and counts per category', () => {
    const result = computeCategoryTotals(ENTRIES)
    expect(result['food'].count).toBe(2)
    expect(result['food'].total).toBeCloseTo(-210, 1)   // -150 + -60
    expect(result['income'].count).toBe(2)
    expect(result['income'].total).toBeCloseTo(2500, 1) // 2000 + 500
  })

  it('returns empty object for no entries', () => {
    expect(computeCategoryTotals([])).toEqual({})
  })

  it('handles a single entry', () => {
    const result = computeCategoryTotals([makeEntry({ category: 'food', amount: -50 })])
    expect(result['food']).toEqual({ total: -50, count: 1 })
  })
})

// ─── computeRecentEntries ────────────────────────────────────────────────────

describe('computeRecentEntries', () => {
  it('returns latest N entries, newest first', () => {
    const result = computeRecentEntries(ENTRIES, 3)
    expect(result).toHaveLength(3)
    expect(result[0].date >= result[1].date).toBe(true)
    expect(result[1].date >= result[2].date).toBe(true)
  })

  it('returns all entries when n >= entries.length', () => {
    expect(computeRecentEntries(ENTRIES, 100)).toHaveLength(ENTRIES.length)
  })

  it('returns empty array for no entries', () => {
    expect(computeRecentEntries([], 5)).toEqual([])
  })

  it('defaults to 8 entries', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeEntry({ id: `e${i}`, date: `2024-01-${String(i + 1).padStart(2, '0')}` })
    )
    expect(computeRecentEntries(many)).toHaveLength(8)
  })
})

// ─── filterEntries ───────────────────────────────────────────────────────────

describe('filterEntries', () => {
  const emptyFilter = { cats: [], type: 'all', search: '', dateFrom: '', dateTo: '' }

  it('returns all entries with empty filter', () => {
    expect(filterEntries(ENTRIES, emptyFilter)).toHaveLength(ENTRIES.length)
  })

  it('filters by category', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, cats: ['food'] })
    expect(result).toHaveLength(2)
    result.forEach(e => expect(e.category).toBe('food'))
  })

  it('filters by multiple categories', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, cats: ['food', 'transport'] })
    expect(result).toHaveLength(3)
  })

  it('filters income only', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, type: 'income' })
    expect(result).toHaveLength(2)
    result.forEach(e => expect(e.amount).toBeGreaterThan(0))
  })

  it('filters expense only', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, type: 'expense' })
    expect(result).toHaveLength(4)
    result.forEach(e => expect(e.amount).toBeLessThan(0))
  })

  it('filters by search in description', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, search: 'grocer' })
    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('Groceries')
  })

  it('search is case-insensitive', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, search: 'SALARY' })
    expect(result).toHaveLength(1)
  })

  it('searches in notes', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, search: 'weekly shop' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('e2')
  })

  it('searches in platform', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, search: 'chipotle' })
    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('Restaurant')
  })

  it('filters by dateFrom', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, dateFrom: '2024-02-01' })
    expect(result).toHaveLength(3)
    result.forEach(e => expect(e.date >= '2024-02-01').toBe(true))
  })

  it('filters by dateTo', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, dateTo: '2024-01-31' })
    expect(result).toHaveLength(3)
    result.forEach(e => expect(e.date <= '2024-01-31').toBe(true))
  })

  it('filters by date range', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, dateFrom: '2024-01-05', dateTo: '2024-02-10' })
    expect(result).toHaveLength(3) // e2 (Jan 5), e4 (Feb 1), e5 (Feb 10)
  })

  it('combines category and type filters', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, cats: ['food'], type: 'expense' })
    expect(result).toHaveLength(2)
  })

  it('returns empty when no match', () => {
    const result = filterEntries(ENTRIES, { ...emptyFilter, search: 'xyznotfound' })
    expect(result).toHaveLength(0)
  })

  it('does not mutate original array', () => {
    const len = ENTRIES.length
    filterEntries(ENTRIES, { ...emptyFilter, cats: ['food'] })
    expect(ENTRIES).toHaveLength(len)
  })
})

// ─── sortEntries ─────────────────────────────────────────────────────────────

describe('sortEntries', () => {
  it('sorts by date ascending', () => {
    const result = sortEntries(ENTRIES, { key: 'date', dir: 1 })
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].date <= result[i + 1].date).toBe(true)
    }
  })

  it('sorts by date descending', () => {
    const result = sortEntries(ENTRIES, { key: 'date', dir: -1 })
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].date >= result[i + 1].date).toBe(true)
    }
  })

  it('sorts by amount ascending', () => {
    const result = sortEntries(ENTRIES, { key: 'amount', dir: 1 })
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].amount <= result[i + 1].amount).toBe(true)
    }
  })

  it('sorts by description alphabetically', () => {
    const result = sortEntries(ENTRIES, { key: 'description', dir: 1 })
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].description <= result[i + 1].description).toBe(true)
    }
  })

  it('uses time as tiebreaker for same date', () => {
    const entries = [
      makeEntry({ id: 'b', date: '2024-01-01', time: '15:00', amount: -50 }),
      makeEntry({ id: 'a', date: '2024-01-01', time: '08:00', amount: 100 }),
    ]
    const result = sortEntries(entries, { key: 'date', dir: 1 })
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
  })

  it('does not mutate original array', () => {
    const copy = [...ENTRIES]
    sortEntries(ENTRIES, { key: 'amount', dir: 1 })
    expect(ENTRIES[0].id).toBe(copy[0].id)
  })
})

// ─── computeNetTotal ─────────────────────────────────────────────────────────

describe('computeNetTotal', () => {
  it('returns algebraic sum', () => {
    expect(computeNetTotal(ENTRIES)).toBeCloseTo(1450, 1)
  })

  it('returns 0 for empty array', () => {
    expect(computeNetTotal([])).toBe(0)
  })

  it('negative when expenses dominate', () => {
    expect(computeNetTotal([makeEntry({ amount: -500 }), makeEntry({ amount: 100 })])).toBe(-400)
  })
})

// ─── paginateEntries ─────────────────────────────────────────────────────────

describe('paginateEntries', () => {
  const items = Array.from({ length: 55 }, (_, i) => makeEntry({ id: `e${i}` }))

  it('returns first page correctly', () => {
    const result = paginateEntries(items, 1, 25)
    expect(result.data).toHaveLength(25)
    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(3)
    expect(result.totalCount).toBe(55)
  })

  it('returns last page with remaining items', () => {
    const result = paginateEntries(items, 3, 25)
    expect(result.data).toHaveLength(5) // 55 - 50 = 5 remaining
  })

  it('returns at least 1 page for empty array', () => {
    const result = paginateEntries([], 1, 25)
    expect(result.totalPages).toBe(1)
    expect(result.data).toHaveLength(0)
  })

  it('clamps page to totalPages', () => {
    const result = paginateEntries(items, 999, 25)
    expect(result.page).toBe(3)
  })

  it('handles single page exactly', () => {
    const result = paginateEntries(items.slice(0, 25), 1, 25)
    expect(result.totalPages).toBe(1)
    expect(result.data).toHaveLength(25)
  })
})

// ─── computeSpendingByCategory ───────────────────────────────────────────────

describe('computeSpendingByCategory', () => {
  it('sums expenses per category', () => {
    const result = computeSpendingByCategory(ENTRIES, CATEGORIES, COLOR_PALETTE)
    const food = result.find(d => d.id === 'food')
    expect(food).toBeDefined()
    expect(food.value).toBeCloseTo(210, 1) // 150 + 60
  })

  it('excludes categories with no expenses', () => {
    const result = computeSpendingByCategory(ENTRIES, CATEGORIES, COLOR_PALETTE)
    const income = result.find(d => d.id === 'income')
    expect(income).toBeUndefined()
  })

  it('sorts descending by spend', () => {
    const result = computeSpendingByCategory(ENTRIES, CATEGORIES, COLOR_PALETTE)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].value).toBeGreaterThanOrEqual(result[i + 1].value)
    }
  })

  it('uses fallback color for unknown palette key', () => {
    const catsWithBadColor = [{ id: 'x', name: 'X', icon: '❓', color: 'nonexistent' }]
    const entries = [makeEntry({ category: 'x', amount: -10 })]
    const result = computeSpendingByCategory(entries, catsWithBadColor, COLOR_PALETTE)
    expect(result[0].color).toBe('#6b7280')
  })

  it('returns empty when no expense entries', () => {
    const incomeOnly = ENTRIES.filter(e => e.amount > 0)
    const result = computeSpendingByCategory(incomeOnly, CATEGORIES, COLOR_PALETTE)
    expect(result).toHaveLength(0)
  })

  it('uses absolute value for expense amounts', () => {
    const result = computeSpendingByCategory(ENTRIES, CATEGORIES, COLOR_PALETTE)
    result.forEach(d => expect(d.value).toBeGreaterThan(0))
  })
})

// ─── computeMonthlyTrend ─────────────────────────────────────────────────────

describe('computeMonthlyTrend', () => {
  it('groups amounts by month and category', () => {
    const result = computeMonthlyTrend(ENTRIES, CATEGORIES)
    const jan = result.find(r => r.month === '2024-01')
    expect(jan).toBeDefined()
    expect(jan['food']).toBeCloseTo(-150, 1)
    expect(jan['income']).toBeCloseTo(2000, 1)
  })

  it('sorts chronologically', () => {
    const result = computeMonthlyTrend(ENTRIES, CATEGORIES)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].month < result[i + 1].month).toBe(true)
    }
  })

  it('returns empty for no entries', () => {
    expect(computeMonthlyTrend([], CATEGORIES)).toEqual([])
  })

  it('skips entries with unknown category', () => {
    const entries = [makeEntry({ category: 'unknown_cat', amount: -99, date: '2024-03-01' })]
    const result = computeMonthlyTrend(entries, CATEGORIES)
    // Month is created but no cat key should be added
    expect(result[0]['unknown_cat']).toBeUndefined()
  })
})

// ─── computeMonthlySummary ───────────────────────────────────────────────────

describe('computeMonthlySummary', () => {
  it('produces a summary row per month', () => {
    const result = computeMonthlySummary(ENTRIES)
    expect(result).toHaveLength(2)
  })

  it('sorts newest-first', () => {
    const result = computeMonthlySummary(ENTRIES)
    expect(result[0].month).toBe('2024-02')
    expect(result[1].month).toBe('2024-01')
  })

  it('computes net correctly', () => {
    const result = computeMonthlySummary(ENTRIES)
    const jan = result.find(r => r.month === '2024-01')
    // income=2000, expenses=950 → net=1050
    expect(jan.net).toBeCloseTo(1050, 1)
  })

  it('counts entries per month', () => {
    const result = computeMonthlySummary(ENTRIES)
    const jan = result.find(r => r.month === '2024-01')
    expect(jan.entries).toBe(3)
  })

  it('expenses field is always positive', () => {
    const result = computeMonthlySummary(ENTRIES)
    result.forEach(m => expect(m.expenses).toBeGreaterThanOrEqual(0))
  })

  it('returns empty for no entries', () => {
    expect(computeMonthlySummary([])).toEqual([])
  })
})

// ─── validateEntryForm ───────────────────────────────────────────────────────

describe('validateEntryForm', () => {
  const validForm = {
    category: 'food',
    description: 'Lunch',
    amount: '25',
    date: '2024-01-15',
    time: '12:00',
    type: 'expense',
    platform: '',
    notes: '',
    recurring: false,
  }

  it('returns no errors for a valid form', () => {
    expect(validateEntryForm(validForm)).toEqual({})
  })

  it('requires category', () => {
    const errors = validateEntryForm({ ...validForm, category: '' })
    expect(errors.category).toBeDefined()
  })

  it('requires description', () => {
    const errors = validateEntryForm({ ...validForm, description: '' })
    expect(errors.description).toBeDefined()
  })

  it('rejects whitespace-only description', () => {
    const errors = validateEntryForm({ ...validForm, description: '   ' })
    expect(errors.description).toBeDefined()
  })

  it('requires amount > 0', () => {
    const errors = validateEntryForm({ ...validForm, amount: '0' })
    expect(errors.amount).toBeDefined()
  })

  it('rejects negative amount', () => {
    const errors = validateEntryForm({ ...validForm, amount: '-10' })
    expect(errors.amount).toBeDefined()
  })

  it('rejects non-numeric amount', () => {
    const errors = validateEntryForm({ ...validForm, amount: 'abc' })
    expect(errors.amount).toBeDefined()
  })

  it('requires date', () => {
    const errors = validateEntryForm({ ...validForm, date: '' })
    expect(errors.date).toBeDefined()
  })

  it('requires time', () => {
    const errors = validateEntryForm({ ...validForm, time: '' })
    expect(errors.time).toBeDefined()
  })

  it('returns multiple errors at once', () => {
    const errors = validateEntryForm({ ...validForm, category: '', description: '', amount: '' })
    expect(Object.keys(errors).length).toBeGreaterThanOrEqual(3)
  })

  it('accepts decimal amounts', () => {
    const errors = validateEntryForm({ ...validForm, amount: '9.99' })
    expect(errors.amount).toBeUndefined()
  })
})

// ─── buildEntryPayload ───────────────────────────────────────────────────────

describe('buildEntryPayload', () => {
  const baseForm = {
    category: 'food',
    type: 'expense',
    description: '  Lunch  ',
    amount: '25',
    date: '2024-01-15',
    time: '12:00',
    platform: ' Chipotle ',
    notes: ' tasty  ',
    recurring: false,
  }

  it('negates amount for expenses', () => {
    const payload = buildEntryPayload(baseForm)
    expect(payload.amount).toBe(-25)
  })

  it('keeps amount positive for income', () => {
    const payload = buildEntryPayload({ ...baseForm, type: 'income' })
    expect(payload.amount).toBe(25)
  })

  it('trims description', () => {
    const payload = buildEntryPayload(baseForm)
    expect(payload.description).toBe('Lunch')
  })

  it('trims and returns platform', () => {
    const payload = buildEntryPayload(baseForm)
    expect(payload.platform).toBe('Chipotle')
  })

  it('returns null for empty platform', () => {
    const payload = buildEntryPayload({ ...baseForm, platform: '  ' })
    expect(payload.platform).toBeNull()
  })

  it('returns null for empty notes', () => {
    const payload = buildEntryPayload({ ...baseForm, notes: '' })
    expect(payload.notes).toBeNull()
  })

  it('trims notes', () => {
    const payload = buildEntryPayload(baseForm)
    expect(payload.notes).toBe('tasty')
  })

  it('preserves recurring flag', () => {
    expect(buildEntryPayload({ ...baseForm, recurring: true }).recurring).toBe(true)
    expect(buildEntryPayload({ ...baseForm, recurring: false }).recurring).toBe(false)
  })

  it('converts amount string to number', () => {
    const payload = buildEntryPayload(baseForm)
    expect(typeof payload.amount).toBe('number')
  })
})

// ─── mergeWithSeed ───────────────────────────────────────────────────────────

describe('mergeWithSeed', () => {
  const SEED = [
    { id: 'tommy', name: 'Tommy', password: 'pass', isAdmin: true, freshStart: true },
  ]

  it('adds seed user if not present', () => {
    const result = mergeWithSeed([], SEED)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('tommy')
  })

  it('preserves existing users', () => {
    const existing = [{ id: 'alice', name: 'Alice', password: 'pw', isAdmin: false, freshStart: false }]
    const result = mergeWithSeed(existing, SEED)
    expect(result).toHaveLength(2)
    expect(result.find(u => u.id === 'alice')).toBeDefined()
  })

  it('updates isAdmin and freshStart from seed for existing user', () => {
    const existing = [{ id: 'tommy', name: 'Tommy', password: 'pass', isAdmin: false, freshStart: false }]
    const result = mergeWithSeed(existing, SEED)
    const tommy = result.find(u => u.id === 'tommy')
    expect(tommy.isAdmin).toBe(true)
    expect(tommy.freshStart).toBe(true)
  })

  it('preserves other fields of existing user when merging', () => {
    const existing = [{ id: 'tommy', name: 'Tommy', password: 'custompass', isAdmin: false, freshStart: false, customField: 'x' }]
    const result = mergeWithSeed(existing, SEED)
    const tommy = result.find(u => u.id === 'tommy')
    expect(tommy.password).toBe('custompass')
    expect(tommy.customField).toBe('x')
  })

  it('does not mutate original array', () => {
    const original = []
    mergeWithSeed(original, SEED)
    expect(original).toHaveLength(0)
  })
})

// ─── isSessionExpired ────────────────────────────────────────────────────────

describe('isSessionExpired', () => {
  it('returns true for null session', () => {
    expect(isSessionExpired(null)).toBe(true)
  })

  it('returns true for session without expiresAt', () => {
    expect(isSessionExpired({ userId: 'tommy' })).toBe(true)
  })

  it('returns true for past expiry', () => {
    expect(isSessionExpired({ expiresAt: Date.now() - 1000 })).toBe(true)
  })

  it('returns false for future expiry', () => {
    expect(isSessionExpired({ expiresAt: Date.now() + 100000 })).toBe(false)
  })
})

// ─── makeUserId ──────────────────────────────────────────────────────────────

describe('makeUserId', () => {
  it('lowercases the name', () => {
    expect(makeUserId('Tommy')).toContain('tommy')
  })

  it('replaces spaces with underscores', () => {
    expect(makeUserId('John Doe')).toContain('john_doe')
  })

  it('removes special characters', () => {
    expect(makeUserId('Test@User!')).toMatch(/^[a-z0-9_]+$/)
  })
})
