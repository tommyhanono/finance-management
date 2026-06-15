import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import CategoryBadge from '../components/CategoryBadge'
import { formatCurrency, formatDateShort, formatTime12, todayISO } from '../utils/formatters'
import { COLOR_PALETTE } from '../utils/defaultCategories'
import {
  computeTotalIncome, computeTotalExpenses, computeBalance, computeSavingsRate,
  computeRunningBalance, computeMonthlyIncomeExpenses, computeCategoryTotals, computeRecentEntries,
} from '../utils/computations'

const StatCard = ({ label, value, sub, valueClass = '' }) => (
  <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</p>
    <p className={`font-heading text-2xl font-bold ${valueClass}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
)

const chartTooltipStyle = {
  contentStyle: { background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#94a3b8' },
}

const PERIODS = [
  { id: 'week',  label: 'Week'  },
  { id: 'month', label: 'Month' },
  { id: 'year',  label: 'Year'  },
  { id: 'all',   label: 'All'   },
]

const getPeriodBounds = (period) => {
  const today = todayISO()
  const d = new Date()
  if (period === 'week') {
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((day + 6) % 7))
    return { from: monday.toISOString().split('T')[0], to: today }
  }
  if (period === 'month') {
    return { from: `${today.slice(0, 7)}-01`, to: today }
  }
  if (period === 'year') {
    return { from: `${today.slice(0, 4)}-01-01`, to: today }
  }
  return { from: null, to: null }
}

export default function Dashboard({ entries, onAddEntry, onEdit, categories, budgets }) {
  const [period, setPeriod] = useState('month')

  const { from, to } = useMemo(() => getPeriodBounds(period), [period])

  const filtered = useMemo(() => {
    if (!from) return entries
    return entries.filter(e => e.date >= from && e.date <= to)
  }, [entries, from, to])

  const totalIncome   = useMemo(() => computeTotalIncome(filtered),   [filtered])
  const totalExpenses = useMemo(() => computeTotalExpenses(filtered), [filtered])
  const balance       = useMemo(() => computeBalance(filtered),       [filtered])
  const savingsRate   = useMemo(() => computeSavingsRate(totalIncome, totalExpenses), [totalIncome, totalExpenses])
  const runningData   = useMemo(() => computeRunningBalance(filtered),          [filtered])
  const monthlyData   = useMemo(() => computeMonthlyIncomeExpenses(filtered),   [filtered])
  const recent        = useMemo(() => computeRecentEntries(entries, 8),         [entries])
  const catTotals     = useMemo(() => computeCategoryTotals(filtered),          [filtered])

  // Budget alerts: categories over budget this month
  const currentMonth = todayISO().slice(0, 7)
  const monthEntries = useMemo(() => entries.filter(e => e.date.startsWith(currentMonth)), [entries, currentMonth])
  const monthCatTotals = useMemo(() => computeCategoryTotals(monthEntries), [monthEntries])

  const overBudget = useMemo(() => {
    if (!budgets) return []
    return categories.filter(cat => {
      const b = budgets[cat.id]?.monthly
      if (!b) return false
      const spent = Math.abs(monthCatTotals[cat.id]?.total || 0)
      return spent > b
    })
  }, [budgets, categories, monthCatTotals])

  const nearBudget = useMemo(() => {
    if (!budgets) return []
    return categories.filter(cat => {
      const b = budgets[cat.id]?.monthly
      if (!b) return false
      const spent = Math.abs(monthCatTotals[cat.id]?.total || 0)
      const pct = spent / b
      return pct >= 0.8 && pct <= 1
    })
  }, [budgets, categories, monthCatTotals])

  return (
    <div className="fade-in space-y-6">

      {/* Budget Alerts */}
      {overBudget.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-1.5">
          <p className="text-sm font-heading font-semibold text-red-400">🚨 Over budget this month</p>
          {overBudget.map(cat => {
            const b = budgets[cat.id].monthly
            const spent = Math.abs(monthCatTotals[cat.id]?.total || 0)
            return (
              <p key={cat.id} className="text-xs text-red-300">
                {cat.icon} {cat.name}: {formatCurrency(spent)} spent / {formatCurrency(b)} budget ({((spent/b)*100).toFixed(0)}%)
              </p>
            )
          })}
        </div>
      )}
      {overBudget.length === 0 && nearBudget.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-1.5">
          <p className="text-sm font-heading font-semibold text-amber-400">⚠️ Approaching budget limit</p>
          {nearBudget.map(cat => {
            const b = budgets[cat.id].monthly
            const spent = Math.abs(monthCatTotals[cat.id]?.total || 0)
            return (
              <p key={cat.id} className="text-xs text-amber-300">
                {cat.icon} {cat.name}: {formatCurrency(spent)} / {formatCurrency(b)} ({((spent/b)*100).toFixed(0)}%)
              </p>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Your finances at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period toggle */}
          <div className="flex bg-[#1a1d27] border border-white/8 rounded-lg p-1 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                  period === p.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={onAddEntry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30"
          >
            + Add Entry
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Balance"
          value={formatCurrency(balance)}
          valueClass={balance >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub={period === 'all' ? 'All time' : `This ${period}`}
        />
        <StatCard
          label="Income"
          value={formatCurrency(totalIncome)}
          valueClass="text-emerald-400"
          sub={`${filtered.filter(e => e.amount > 0).length} entries`}
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(Math.abs(totalExpenses))}
          valueClass="text-red-400"
          sub={`${filtered.filter(e => e.amount < 0).length} entries`}
        />
        <StatCard
          label="Savings Rate"
          value={savingsRate !== null ? `${savingsRate.toFixed(1)}%` : '—'}
          valueClass={savingsRate === null || savingsRate >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub={savingsRate !== null ? (savingsRate >= 20 ? 'On track!' : 'Keep saving') : 'No income yet'}
        />
      </div>

      {/* Category cards */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map(cat => {
            const data  = catTotals[cat.id] || { total: 0, count: 0 }
            const color = COLOR_PALETTE[cat.color] || '#6b7280'
            const budget = budgets?.[cat.id]?.monthly
            const spent  = Math.abs(data.total < 0 ? data.total : 0)
            const budgetPct = budget ? Math.min(100, (spent / budget) * 100) : null

            return (
              <div key={cat.id} className="bg-[#1a1d27] border border-white/8 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <CategoryBadge category={cat} size="md" />
                  <span className={`font-heading font-bold text-lg ${data.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.total >= 0 ? '+' : ''}{formatCurrency(data.total)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{data.count} {data.count === 1 ? 'entry' : 'entries'}</p>

                {/* Budget bar */}
                {budget ? (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Budget</span>
                      <span className={budgetPct > 100 ? 'text-red-400' : budgetPct > 80 ? 'text-amber-400' : 'text-slate-500'}>
                        {formatCurrency(spent)} / {formatCurrency(budget)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${budgetPct}%`,
                          background: budgetPct > 100 ? '#ef4444' : budgetPct > 80 ? '#f59e0b' : color,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${data.count > 0 ? 100 : 0}%`, background: color, opacity: data.count > 0 ? 1 : 0.2 }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
          <h3 className="font-heading font-semibold text-white mb-4">Running Balance</h3>
          {runningData.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={runningData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatDateShort} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [formatCurrency(v), 'Balance']} />
                <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} dot={false} name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
              Add more entries to see the chart
            </div>
          )}
        </div>

        <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
          <h3 className="font-heading font-semibold text-white mb-4">Income vs Expenses</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip {...chartTooltipStyle} formatter={v => [formatCurrency(v)]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" fill="#10b981" name="Income" radius={[2,2,0,0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-white">Recent Activity</h3>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm mb-3">No entries yet</p>
            <button onClick={onAddEntry} className="text-emerald-400 hover:text-emerald-300 text-sm underline">Add your first entry</button>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(e => {
              const cat = categories.find(c => c.id === e.category)
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors cursor-pointer"
                  onClick={() => onEdit(e)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-slate-600 flex-shrink-0 w-28">
                      {e.date}
                      {e.time && <span className="block text-slate-700">{formatTime12(e.time)}</span>}
                    </span>
                    {cat && <CategoryBadge category={cat} />}
                    <span className="text-sm text-slate-300 truncate">{e.description}</span>
                    {e.recurring && <span className="text-xs text-slate-600 border border-slate-700 rounded px-1">↺</span>}
                    {e.tags && e.tags.length > 0 && (
                      <div className="flex gap-1">
                        {e.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs bg-white/5 text-slate-500 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`font-heading font-semibold flex-shrink-0 ${e.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {e.amount >= 0 ? '+' : ''}{formatCurrency(e.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
