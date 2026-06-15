import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { COLOR_PALETTE } from '../utils/defaultCategories'

const NW_CATEGORIES = {
  asset:     ['Cash & Savings', 'Investments', 'Real Estate', 'Vehicle', 'Other Asset'],
  liability: ['Credit Card', 'Mortgage', 'Student Loan', 'Car Loan', 'Other Debt'],
}

const TYPE_COLORS = { asset: '#10b981', liability: '#ef4444' }

const chartTooltip = {
  contentStyle: { background: '#1a1d27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: '#94a3b8' },
}

const EMPTY_ITEM = { name: '', amount: '', type: 'asset', category: 'Cash & Savings', notes: '' }

const StatCard = ({ label, value, valueClass = '', sub }) => (
  <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</p>
    <p className={`font-heading text-2xl font-bold ${valueClass}`}>{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
)

const fmt = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function NetWorth({ items, onAdd, onEdit, onDelete, totalAssets, totalLiabilities, netWorth }) {
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(EMPTY_ITEM)
  const [errors, setErrors]       = useState({})
  const [filter, setFilter]       = useState('all') // 'all' | 'asset' | 'liability'

  const assets      = items.filter(i => i.type === 'asset')
  const liabilities = items.filter(i => i.type === 'liability')

  const pieData = useMemo(() => {
    const catMap = {}
    for (const item of items) {
      const k = `${item.type}:${item.category}`
      if (!catMap[k]) catMap[k] = { name: item.category, value: 0, type: item.type }
      catMap[k].value += item.amount
    }
    return Object.values(catMap).filter(d => d.value > 0)
  }, [items])

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_ITEM)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({ name: item.name, amount: String(item.amount), type: item.type, category: item.category, notes: item.notes || '' })
    setErrors({})
    setShowForm(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())                                        e.name   = 'Required'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = 'Enter a positive number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const data = {
      name:     form.name.trim(),
      amount:   Number(form.amount),
      type:     form.type,
      category: form.category,
      notes:    form.notes.trim() || null,
    }
    if (editingId) onEdit(editingId, data)
    else           onAdd(data)
    setShowForm(false)
  }

  const set = (k, v) => setForm(p => ({
    ...p,
    [k]: v,
    ...(k === 'type' ? { category: NW_CATEGORIES[v][0] } : {}),
  }))

  const displayed = filter === 'all' ? items : items.filter(i => i.type === filter)

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Net Worth</h1>
          <p className="text-sm text-slate-500 mt-1">Track assets and liabilities over time</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30"
        >
          + Add Item
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Net Worth"
          value={fmt(netWorth)}
          valueClass={netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}
          sub="Assets minus liabilities"
        />
        <StatCard
          label="Total Assets"
          value={fmt(totalAssets)}
          valueClass="text-emerald-400"
          sub={`${assets.length} items`}
        />
        <StatCard
          label="Total Liabilities"
          value={fmt(totalLiabilities)}
          valueClass="text-red-400"
          sub={`${liabilities.length} items`}
        />
      </div>

      {/* Charts + list */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
          <h3 className="font-heading font-semibold text-white mb-4">Breakdown</h3>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.type === 'asset' ? `hsl(${160 - i * 15}, 60%, 45%)` : `hsl(${0 + i * 15}, 70%, 55%)`} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} formatter={v => [fmt(v)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 text-xs">
                {pieData.map((d, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: d.type === 'asset' ? `hsl(${160 - i * 15}, 60%, 45%)` : `hsl(${i * 15}, 70%, 55%)` }} />
                      <span className="text-slate-300">{d.name}</span>
                    </span>
                    <span className={d.type === 'asset' ? 'text-emerald-400' : 'text-red-400'}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
              Add assets and liabilities to see the breakdown
            </div>
          )}
        </div>

        {/* Asset vs Liability bars */}
        <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
          <h3 className="font-heading font-semibold text-white mb-4">Assets vs Liabilities</h3>
          {(totalAssets > 0 || totalLiabilities > 0) ? (
            <div className="space-y-4 mt-2">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-emerald-400 font-medium">Assets</span>
                  <span className="text-emerald-400">{fmt(totalAssets)}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${totalAssets > 0 ? Math.min(100, (totalAssets / (totalAssets + totalLiabilities)) * 100) : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-red-400 font-medium">Liabilities</span>
                  <span className="text-red-400">{fmt(totalLiabilities)}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-700"
                    style={{ width: `${totalLiabilities > 0 ? Math.min(100, (totalLiabilities / (totalAssets + totalLiabilities)) * 100) : 0}%` }} />
                </div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Net Worth</span>
                  <span className={`font-heading font-bold ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(netWorth)}</span>
                </div>
                {totalAssets > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Debt ratio: {((totalLiabilities / totalAssets) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
              No items yet
            </div>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-white">Items</h3>
          <div className="flex gap-1">
            {['all', 'asset', 'liability'].map(v => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`text-xs px-3 py-1 rounded-full border transition-all capitalize ${
                  filter === v ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-slate-500 hover:border-white/20'
                }`}
              >
                {v === 'all' ? 'All' : v === 'asset' ? 'Assets' : 'Liabilities'}
              </button>
            ))}
          </div>
        </div>

        {displayed.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm mb-3">No items yet</p>
            <button onClick={openAdd} className="text-emerald-400 hover:text-emerald-300 text-sm underline">Add your first item</button>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${item.type === 'asset' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`font-heading font-semibold text-sm ${item.type === 'asset' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.type === 'liability' ? '-' : '+'}{fmt(item.amount)}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors text-sm">✏️</button>
                    <button onClick={() => onDelete(item.id)} className="p-1.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors text-sm">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md bg-[#1a1d27] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-white">{editingId ? 'Edit Item' : 'Add Item'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              {['asset', 'liability'].map(t => (
                <button
                  key={t}
                  onClick={() => set('type', t)}
                  className={`py-2.5 rounded-xl font-heading font-bold text-sm transition-all border capitalize ${
                    form.type === t
                      ? t === 'asset' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {t === 'asset' ? '📈 Asset' : '📉 Liability'}
                </button>
              ))}
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Name {errors.name && <span className="text-red-400 ml-1">{errors.name}</span>}
              </label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Emergency Fund, Credit Card..."
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Amount {errors.amount && <span className="text-red-400 ml-1">{errors.amount}</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Category</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                {NW_CATEGORIES[form.type].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Notes <span className="text-slate-600">(optional)</span></label>
              <input
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="e.g. Chase savings account..."
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors text-sm">Cancel</button>
              <button
                onClick={handleSave}
                className={`flex-1 py-2.5 rounded-xl font-heading font-semibold text-sm text-white transition-all ${
                  form.type === 'asset' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {editingId ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
