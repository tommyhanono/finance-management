import { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import CategoryBadge from '../components/CategoryBadge'
import { formatCurrency, formatDateShort, formatTime12 } from '../utils/formatters'
import { COLOR_PALETTE } from '../utils/defaultCategories'

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

export default function Dashboard({ entries, onAddEntry, onEdit, categories }) {
  const totalIncome   = useMemo(() => entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0), [entries])
  const totalExpenses = useMemo(() => entries.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0), [entries])
  const balance       = totalIncome + totalExpenses
  const savingsRate   = totalIncome > 0 ? ((totalIncome + totalExpenses) / totalIncome) * 100 : 0

  // Running balance over time
  const runningData = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    let running = 0
    return sorted.map(e => {
      running += e.amount
      return { date: e.date, balance: running }
    })
  }, [entries])

  // Monthly income vs expenses
  const monthlyData = useMemo(() => {
    const map = {}
    for (const e of entries) {
      const month = e.date.slice(0, 7)
      if (!map[month]) map[month] = { month, income: 0, expenses: 0 }
      if (e.amount > 0) map[month].income += e.amount
      else map[month].expenses += Math.abs(e.amount)
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
  }, [entries])

  // Recent 8 entries
  const recent = useMemo(() =>
    [...entries].sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date)
      if (dateCmp !== 0) return dateCmp
      return (b.time || '').localeCompare(a.time || '')
    }).slice(0, 8),
    [entries]
  )

  // Category totals
  const catTotals = useMemo(() => {
    const map = {}
    for (const e of entries) {
      if (!map[e.category]) map[e.category] = { total: 0, count: 0 }
      map[e.category].total += e.amount
      map[e.category].count++
    }
    return map
  }, [entries])

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Your finances at a glance</p>
        </div>
        <button
          onClick={onAddEntry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30"
        >
          + Add Entry
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Balance"
          value={formatCurrency(balance)}
          valueClass={balance >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub="Income minus expenses"
        />
        <StatCard
          label="Total Income"
          value={formatCurrency(totalIncome)}
          valueClass="text-emerald-400"
          sub={`${entries.filter(e => e.amount > 0).length} entries`}
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(Math.abs(totalExpenses))}
          valueClass="text-red-400"
          sub={`${entries.filter(e => e.amount < 0).length} entries`}
        />
        <StatCard
          label="Savings Rate"
          value={totalIncome > 0 ? `${savingsRate.toFixed(1)}%` : '—'}
          valueClass={savingsRate >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub={totalIncome > 0 ? (savingsRate >= 20 ? 'On track!' : 'Keep saving') : 'No income yet'}
        />
      </div>

      {/* Category cards */}
      {categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map(cat => {
            const data = catTotals[cat.id] || { total: 0, count: 0 }
            const color = COLOR_PALETTE[cat.color] || '#6b7280'
            return (
              <div key={cat.id} className="bg-[#1a1d27] border border-white/8 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <CategoryBadge category={cat} size="md" />
                  <span className={`font-heading font-bold text-lg ${data.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.total >= 0 ? '+' : ''}{formatCurrency(data.total)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{data.count} {data.count === 1 ? 'entry' : 'entries'}</p>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, data.count > 0 ? 100 : 0)}%`, background: color, opacity: data.count > 0 ? 1 : 0.2 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
          <h3 className="font-heading font-semibold text-white mb-4">Running Balance Over Time</h3>
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
          <h3 className="font-heading font-semibold text-white mb-4">Monthly Income vs Expenses</h3>
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
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
              No data yet
            </div>
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
