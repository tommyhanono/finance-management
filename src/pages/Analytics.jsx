import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import CategoryBadge from '../components/CategoryBadge'
import { formatCurrency } from '../utils/formatters'
import { COLOR_PALETTE } from '../utils/defaultCategories'
import {
  computeSpendingByCategory, computeMonthlyTrend,
  computeMonthlyIncomeExpenses, computeMonthlySummary,
} from '../utils/computations'

const chartTooltip = {
  contentStyle: { background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#94a3b8' },
}

const Section = ({ title, children }) => (
  <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
    <h3 className="font-heading font-semibold text-white mb-4 text-base">{title}</h3>
    {children}
  </div>
)

export default function Analytics({ entries, categories }) {
  const spendingByCat  = useMemo(() => computeSpendingByCategory(entries, categories, COLOR_PALETTE), [entries, categories])
  const monthlyTrend   = useMemo(() => computeMonthlyTrend(entries, categories),          [entries, categories])
  const monthlyIE      = useMemo(() => computeMonthlyIncomeExpenses(entries),              [entries])
  const monthlySummary = useMemo(() => computeMonthlySummary(entries),                    [entries])

  if (!entries.length) {
    return (
      <div className="fade-in flex items-center justify-center h-64 text-slate-500">
        <p>Add some entries to see analytics</p>
      </div>
    )
  }

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Deep dive into your spending patterns</p>
      </div>

      {/* Row 1: Spending pie + Top categories */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Spending by Category">
          {spendingByCat.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={spendingByCat}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {spendingByCat.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} formatter={v => [formatCurrency(v)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {spendingByCat.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-slate-300">{d.name}</span>
                    </span>
                    <span className="font-heading text-red-400">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No expenses recorded</p>
          )}
        </Section>

        <Section title="Top Spending Categories">
          <div className="space-y-3">
            {spendingByCat.slice(0, 6).map((d, i) => {
              const maxVal = spendingByCat[0]?.value || 1
              return (
                <div key={d.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 flex items-center gap-1">
                      <span className="text-slate-600">#{i+1}</span>
                      <span className="ml-1">{d.name}</span>
                    </span>
                    <span className="font-heading text-red-400">{formatCurrency(d.value)}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(d.value / maxVal) * 100}%`, background: d.color }}
                    />
                  </div>
                </div>
              )
            })}
            {spendingByCat.length === 0 && <p className="text-slate-500 text-sm">No expenses yet</p>}
          </div>
        </Section>
      </div>

      {/* Row 2: Monthly trend + IE chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Monthly Trend by Category">
          {monthlyTrend.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip {...chartTooltip} formatter={v => [formatCurrency(v)]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {categories.map(cat => (
                  <Line
                    key={cat.id}
                    type="monotone"
                    dataKey={cat.id}
                    stroke={COLOR_PALETTE[cat.color] || '#6b7280'}
                    strokeWidth={1.5}
                    dot={false}
                    name={`${cat.icon} ${cat.name}`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
              Need more months of data
            </div>
          )}
        </Section>

        <Section title="Income vs Expenses by Month">
          {monthlyIE.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyIE}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip {...chartTooltip} formatter={v => [formatCurrency(v)]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" fill="#10b981" name="Income" radius={[2,2,0,0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          )}
        </Section>
      </div>

      {/* Monthly Summary Table */}
      <Section title="Monthly Summary">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Month','Entries','Income','Expenses','Net'].map(h => (
                  <th key={h} className="text-left py-2 px-2 text-xs text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlySummary.map(m => (
                <tr key={m.month} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                  <td className="py-2 px-2 text-slate-400 text-xs">{m.month}</td>
                  <td className="py-2 px-2 text-slate-300">{m.entries}</td>
                  <td className="py-2 px-2 text-emerald-400">{formatCurrency(m.income)}</td>
                  <td className="py-2 px-2 text-red-400">{formatCurrency(m.expenses)}</td>
                  <td className={`py-2 px-2 font-heading font-semibold ${m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                  </td>
                </tr>
              ))}
              {monthlySummary.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-slate-500 text-xs">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
