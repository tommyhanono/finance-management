import { useMemo, useState } from 'react'
import CategoryBadge from '../components/CategoryBadge'
import { formatCurrency, formatTime12, todayISO, nowTime } from '../utils/formatters'

export default function Recurring({ entries, categories, onAdd, onEdit, onDelete }) {
  const [logged, setLogged] = useState(new Set())

  const recurring = useMemo(() =>
    [...entries]
      .filter(e => e.recurring)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  )

  // Group by description+category to show unique recurring patterns
  const patterns = useMemo(() => {
    const map = {}
    for (const e of recurring) {
      const key = `${e.category}||${e.description}`
      if (!map[key]) {
        map[key] = { key, entries: [], latestEntry: e }
      }
      map[key].entries.push(e)
      if (e.date > map[key].latestEntry.date) map[key].latestEntry = e
    }
    return Object.values(map).sort((a, b) => b.latestEntry.date.localeCompare(a.latestEntry.date))
  }, [recurring])

  const logThisMonth = (pattern) => {
    const src = pattern.latestEntry
    onAdd({
      category:    src.category,
      type:        src.amount >= 0 ? 'income' : 'expense',
      description: src.description,
      amount:      src.amount,
      date:        todayISO(),
      time:        nowTime(),
      platform:    src.platform,
      notes:       src.notes,
      recurring:   true,
      tags:        src.tags || [],
    })
    setLogged(prev => new Set([...prev, pattern.key]))
  }

  if (recurring.length === 0) {
    return (
      <div className="fade-in space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Recurring</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your recurring income and expenses</p>
        </div>
        <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">🔁</p>
          <p className="text-slate-400 text-sm">No recurring entries yet.</p>
          <p className="text-slate-500 text-xs mt-1">When adding an entry, check "Recurring entry" to track it here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Recurring</h1>
        <p className="text-sm text-slate-500 mt-1">{patterns.length} recurring pattern{patterns.length !== 1 ? 's' : ''} · {recurring.length} total entries</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Monthly Income</p>
          <p className="font-heading text-xl font-bold text-emerald-400">
            {formatCurrency(patterns
              .filter(p => p.latestEntry.amount > 0)
              .reduce((s, p) => s + p.latestEntry.amount, 0))}
          </p>
          <p className="text-xs text-slate-500 mt-1">{patterns.filter(p => p.latestEntry.amount > 0).length} sources</p>
        </div>
        <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Monthly Expenses</p>
          <p className="font-heading text-xl font-bold text-red-400">
            {formatCurrency(Math.abs(patterns
              .filter(p => p.latestEntry.amount < 0)
              .reduce((s, p) => s + p.latestEntry.amount, 0)))}
          </p>
          <p className="text-xs text-slate-500 mt-1">{patterns.filter(p => p.latestEntry.amount < 0).length} expenses</p>
        </div>
      </div>

      {/* Recurring patterns */}
      <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5 space-y-3">
        <h3 className="font-heading font-semibold text-white mb-2">Patterns</h3>
        {patterns.map(pattern => {
          const cat = categories.find(c => c.id === pattern.latestEntry.category)
          const src = pattern.latestEntry
          const isLogged = logged.has(pattern.key)
          return (
            <div key={pattern.key} className="flex items-center justify-between p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-slate-600 text-lg flex-shrink-0">🔁</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {cat && <CategoryBadge category={cat} />}
                    <span className="text-sm font-medium text-white truncate">{src.description}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {src.platform && <span className="text-xs text-slate-500">{src.platform}</span>}
                    <span className="text-xs text-slate-600">{pattern.entries.length}× logged</span>
                    <span className="text-xs text-slate-600">Last: {src.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`font-heading font-semibold text-sm ${src.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {src.amount >= 0 ? '+' : ''}{formatCurrency(src.amount)}
                </span>
                <button
                  onClick={() => !isLogged && logThisMonth(pattern)}
                  disabled={isLogged}
                  title={isLogged ? 'Logged this session' : 'Log entry for today'}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    isLogged
                      ? 'border-emerald-500/30 text-emerald-500/50 bg-emerald-500/5 cursor-default'
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {isLogged ? '✓ Logged' : 'Log today'}
                </button>
                <button
                  onClick={() => onEdit(src)}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors text-sm"
                >✏️</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* All recurring entries table */}
      <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
        <h3 className="font-heading font-semibold text-white mb-4">All Recurring Entries</h3>
        <div className="space-y-1">
          {recurring.map(e => {
            const cat = categories.find(c => c.id === e.category)
            return (
              <div key={e.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-slate-600 w-24 flex-shrink-0">{e.date}</span>
                  {cat && <CategoryBadge category={cat} />}
                  <span className="text-sm text-slate-300 truncate">{e.description}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-heading font-semibold text-sm ${e.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {e.amount >= 0 ? '+' : ''}{formatCurrency(e.amount)}
                  </span>
                  <button onClick={() => onEdit(e)} className="p-1 rounded hover:bg-white/10 text-slate-600 hover:text-white transition-colors text-xs">✏️</button>
                  <button onClick={() => onDelete(e.id)} className="p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-colors text-xs">🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
