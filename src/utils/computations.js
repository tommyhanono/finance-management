/**
 * Pure computation functions extracted from page components.
 * All functions are side-effect free — safe to unit test in isolation.
 */

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const computeTotalIncome = (entries) =>
  entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0)

export const computeTotalExpenses = (entries) =>
  entries.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0)

export const computeBalance = (entries) =>
  entries.reduce((s, e) => s + e.amount, 0)

export const computeSavingsRate = (totalIncome, totalExpenses) => {
  if (totalIncome <= 0) return null
  return ((totalIncome + totalExpenses) / totalIncome) * 100
}

/**
 * Returns [{date, balance}] sorted chronologically, each point is the
 * cumulative sum up to and including that entry.
 */
export const computeRunningBalance = (entries) => {
  const sorted = [...entries].sort((a, b) =>
    a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')
  )
  let running = 0
  return sorted.map(e => {
    running += e.amount
    return { date: e.date, balance: running }
  })
}

/**
 * Returns [{month, income, expenses}] sorted chronologically.
 * month format: 'YYYY-MM'
 */
export const computeMonthlyIncomeExpenses = (entries) => {
  const map = {}
  for (const e of entries) {
    const month = e.date.slice(0, 7)
    if (!map[month]) map[month] = { month, income: 0, expenses: 0 }
    if (e.amount > 0) map[month].income += e.amount
    else map[month].expenses += Math.abs(e.amount)
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Returns a map { [categoryId]: { total, count } }
 */
export const computeCategoryTotals = (entries) => {
  const map = {}
  for (const e of entries) {
    if (!map[e.category]) map[e.category] = { total: 0, count: 0 }
    map[e.category].total += e.amount
    map[e.category].count++
  }
  return map
}

/**
 * Returns the last N entries sorted newest-first.
 */
export const computeRecentEntries = (entries, n = 8) =>
  [...entries]
    .sort((a, b) => {
      const d = b.date.localeCompare(a.date)
      return d !== 0 ? d : (b.time || '').localeCompare(a.time || '')
    })
    .slice(0, n)

// ─── History ─────────────────────────────────────────────────────────────────

/**
 * filter: { cats: string[], type: 'all'|'income'|'expense', search: string,
 *           dateFrom: string, dateTo: string }
 */
export const filterEntries = (entries, filter) => {
  let r = [...entries]
  if (filter.cats && filter.cats.length)
    r = r.filter(e => filter.cats.includes(e.category))
  if (filter.type === 'income')  r = r.filter(e => e.amount > 0)
  if (filter.type === 'expense') r = r.filter(e => e.amount < 0)
  if (filter.search) {
    const q = filter.search.toLowerCase()
    r = r.filter(e =>
      (e.description || '').toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q) ||
      (e.platform || '').toLowerCase().includes(q)
    )
  }
  if (filter.dateFrom) r = r.filter(e => e.date >= filter.dateFrom)
  if (filter.dateTo)   r = r.filter(e => e.date <= filter.dateTo)
  return r
}

/**
 * sort: { key: string, dir: 1|-1 }
 * dir=1 → ascending, dir=-1 → descending
 */
export const sortEntries = (entries, sort) =>
  [...entries].sort((a, b) => {
    const av = a[sort.key] ?? ''
    const bv = b[sort.key] ?? ''
    if (av < bv) return -sort.dir
    if (av > bv) return sort.dir
    if (sort.key === 'date') {
      const at = a.time ?? '00:00'
      const bt = b.time ?? '00:00'
      if (at < bt) return -sort.dir
      if (at > bt) return sort.dir
    }
    return 0
  })

export const computeNetTotal = (entries) =>
  entries.reduce((s, e) => s + e.amount, 0)

export const paginateEntries = (entries, page, pageSize) => {
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  return {
    page:       safePage,
    totalPages,
    data:       entries.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalCount: entries.length,
  }
}

// ─── Analytics ───────────────────────────────────────────────────────────────

/**
 * Returns [{name, value, color, id}] sorted descending by spend,
 * filtering out categories with 0 expenses.
 */
export const computeSpendingByCategory = (entries, categories, colorPalette) => {
  const expenses = entries.filter(e => e.amount < 0)
  return categories
    .map(cat => {
      const total = expenses
        .filter(e => e.category === cat.id)
        .reduce((s, e) => s + Math.abs(e.amount), 0)
      return {
        name:  `${cat.icon} ${cat.name}`,
        value: total,
        color: colorPalette[cat.color] || '#6b7280',
        id:    cat.id,
      }
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
}

/**
 * Returns [{month, [catId]: amount}] — one row per month with a key per category.
 */
export const computeMonthlyTrend = (entries, categories) => {
  const map = {}
  for (const e of entries) {
    const month = e.date.slice(0, 7)
    if (!map[month]) map[month] = { month }
    const cat = categories.find(c => c.id === e.category)
    if (cat) map[month][cat.id] = (map[month][cat.id] || 0) + e.amount
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Returns [{month, entries, income, expenses, net}] sorted newest-first.
 */
export const computeMonthlySummary = (entries) => {
  const map = {}
  for (const e of entries) {
    const month = e.date.slice(0, 7)
    if (!map[month]) map[month] = { month, entries: 0, income: 0, expenses: 0, net: 0 }
    map[month].entries++
    if (e.amount > 0) map[month].income += e.amount
    else map[month].expenses += Math.abs(e.amount)
    map[month].net += e.amount
  }
  return Object.values(map).sort((a, b) => b.month.localeCompare(a.month))
}

// ─── Modal / Validation ──────────────────────────────────────────────────────

export const validateEntryForm = (form) => {
  const errors = {}
  if (!form.category)                                                   errors.category    = 'Required'
  if (!form.description || !form.description.trim())                    errors.description = 'Required'
  if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
                                                                        errors.amount      = 'Enter a positive number'
  if (!form.date)                                                       errors.date        = 'Required'
  if (!form.time)                                                       errors.time        = 'Required'
  return errors
}

export const buildEntryPayload = (form) => ({
  category:    form.category,
  type:        form.type,
  description: form.description.trim(),
  amount:      form.type === 'income' ? Number(form.amount) : -Number(form.amount),
  date:        form.date,
  time:        form.time,
  platform:    form.platform?.trim() || null,
  notes:       form.notes?.trim() || null,
  recurring:   Boolean(form.recurring),
})

// ─── Auth ────────────────────────────────────────────────────────────────────

export const mergeWithSeed = (users, seedUsers) => {
  const merged = [...users]
  for (const seed of seedUsers) {
    const idx = merged.findIndex(u => u.id === seed.id)
    if (idx === -1) merged.push(seed)
    else merged[idx] = { ...merged[idx], isAdmin: seed.isAdmin, freshStart: seed.freshStart }
  }
  return merged
}

export const isSessionExpired = (session) => {
  if (!session || !session.expiresAt) return true
  return Date.now() > session.expiresAt
}

export const makeUserId = (name) =>
  name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + 'test'
