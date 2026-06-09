import { useState, useEffect } from 'react'
import { COLOR_PALETTE } from '../utils/defaultCategories'
import { todayISO, nowTime } from '../utils/formatters'

const EMPTY = {
  category: '',
  type: 'expense',
  description: '',
  amount: '',
  date: '',
  time: '',
  platform: '',
  notes: '',
  recurring: false,
}

const DESC_STORAGE_KEY = (userId) => `spendledger-desc-suggestions-${userId}`

const loadSuggestions = (userId) => {
  try { return JSON.parse(localStorage.getItem(DESC_STORAGE_KEY(userId)) || '{}') } catch { return {} }
}
const saveSuggestion = (userId, catId, desc) => {
  try {
    const all = loadSuggestions(userId)
    const prev = all[catId] || []
    const next = [desc, ...prev.filter(d => d !== desc)].slice(0, 5)
    all[catId] = next
    localStorage.setItem(DESC_STORAGE_KEY(userId), JSON.stringify(all))
  } catch {}
}

export default function Modal({ open, onClose, onSave, initial, categories, userId }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          ...EMPTY,
          ...initial,
          amount: String(Math.abs(initial.amount)),
          type: initial.amount >= 0 ? 'income' : 'expense',
          time: initial.time || nowTime(),
        })
      } else {
        setForm({ ...EMPTY, date: todayISO(), time: nowTime(), category: categories[0]?.id || '' })
      }
      setErrors({})
    }
  }, [open, initial, categories])

  useEffect(() => {
    if (form.category && userId) {
      const all = loadSuggestions(userId)
      setSuggestions(all[form.category] || [])
    }
  }, [form.category, userId])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const validate = () => {
    const e = {}
    if (!form.category) e.category = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = 'Enter a positive number'
    if (!form.date) e.date = 'Required'
    if (!form.time) e.time = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const amount = form.type === 'income' ? Number(form.amount) : -Number(form.amount)
    const desc = form.description.trim()
    if (userId && form.category) saveSuggestion(userId, form.category, desc)
    onSave({
      category: form.category,
      type: form.type,
      description: desc,
      amount,
      date: form.date,
      time: form.time,
      platform: form.platform.trim() || null,
      notes: form.notes.trim() || null,
      recurring: form.recurring,
    })
    onClose()
  }

  if (!open) return null

  const selectedCat = categories.find(c => c.id === form.category)
  const catColor = selectedCat ? (COLOR_PALETTE[selectedCat.color] || '#10b981') : '#10b981'

  const filteredSuggestions = suggestions.filter(
    s => !form.description || s.toLowerCase().includes(form.description.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1a1d27] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-heading text-lg font-semibold text-white">
            {initial ? 'Edit Entry' : 'Add Entry'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none transition-colors">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Category {errors.category && <span className="text-red-400 ml-1">{errors.category}</span>}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map(cat => {
                const color = COLOR_PALETTE[cat.color] || '#6b7280'
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => set('category', cat.id)}
                    className="py-2 px-3 rounded-lg border text-xs font-medium transition-all text-left flex items-center gap-1.5"
                    style={form.category === cat.id
                      ? { borderColor: color, color, background: `${color}18` }
                      : { borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
                  >
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Type: EXPENSE / INCOME */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set('type', 'expense')}
                className={`py-3 rounded-xl font-heading font-bold text-base transition-all border ${form.type === 'expense' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'border-white/10 text-slate-500 hover:border-red-500/30'}`}
              >
                EXPENSE
              </button>
              <button
                type="button"
                onClick={() => set('type', 'income')}
                className={`py-3 rounded-xl font-heading font-bold text-base transition-all border ${form.type === 'income' ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'border-white/10 text-slate-500 hover:border-green-500/30'}`}
              >
                INCOME
              </button>
            </div>
          </div>

          {/* Description with autocomplete */}
          <div className="relative">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Description {errors.description && <span className="text-red-400 ml-1">{errors.description}</span>}
            </label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. Grocery run, Netflix, Paycheck..."
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1d27] border border-white/10 rounded-lg overflow-hidden z-10 shadow-xl">
                {filteredSuggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => set('description', s)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Amount (USD) {errors.amount && <span className="text-red-400 ml-1">{errors.amount}</span>}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Date {errors.date && <span className="text-red-400 ml-1">{errors.date}</span>}
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Time {errors.time && <span className="text-red-400 ml-1">{errors.time}</span>}
              </label>
              <input
                type="time"
                value={form.time}
                onChange={e => set('time', e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Where / Who <span className="text-slate-600">(optional)</span>
            </label>
            <input
              value={form.platform}
              onChange={e => set('platform', e.target.value)}
              placeholder="e.g. Amazon, Employer, Whole Foods..."
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Notes <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          {/* Recurring */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => set('recurring', !form.recurring)}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                form.recurring ? 'bg-emerald-600 border-emerald-600' : 'border-white/20 bg-transparent'
              }`}
            >
              {form.recurring && <span className="text-white text-xs leading-none">✓</span>}
            </div>
            <span className="text-sm text-slate-400">Recurring entry</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl font-heading font-semibold text-sm text-white transition-all"
              style={{ background: `${catColor}cc`, boxShadow: `0 0 20px ${catColor}30` }}
            >
              {initial ? 'Save Changes' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
