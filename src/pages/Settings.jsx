import { useState, useRef } from 'react'
import { COLOR_PALETTE, COLOR_KEYS, ICON_SET } from '../utils/defaultCategories'

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6']
const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const avatarColor = (users, id) => AVATAR_COLORS[users.findIndex(u => u.id === id) % AVATAR_COLORS.length]

export default function Settings({
  entries, onImport, onReset, currentUser, authHook, onLogout,
  categories, onAddCategory, onEditCategory, onDeleteCategory,
  onReassignOrDeleteByCategory,
}) {
  const [resetText, setResetText] = useState('')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const fileRef = useRef()

  // Account management
  const [showAddUser, setShowAddUser]       = useState(false)
  const [newName, setNewName]               = useState('')
  const [newPw, setNewPw]                   = useState('')
  const [newPwConfirm, setNewPwConfirm]     = useState('')
  const [addError, setAddError]             = useState('')
  const [changePwMode, setChangePwMode]     = useState(null)
  const [newPwChange, setNewPwChange]       = useState('')
  const [pwChangeError, setPwChangeError]   = useState('')
  const [showPwFor, setShowPwFor]           = useState(null)

  // Category manager
  const [showAddCat, setShowAddCat]         = useState(false)
  const [editingCat, setEditingCat]         = useState(null)
  const [catName, setCatName]               = useState('')
  const [catColor, setCatColor]             = useState('emerald')
  const [catIcon, setCatIcon]               = useState('💰')
  const [catError, setCatError]             = useState('')
  // Delete modal
  const [deleteCatId, setDeleteCatId]       = useState(null)
  const [deleteReassignTo, setDeleteReassignTo] = useState('')
  const [deleteMode, setDeleteMode]         = useState('delete') // 'reassign' | 'delete'

  const { users, addUser, updateUserPassword, deleteUser } = authHook || {}
  const isAdmin = currentUser?.isAdmin === true

  // ── Export / Import ──────────────────────────────────────────────────────
  const exportJSON = () => {
    const data = { entries, categories, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spendledger-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.entries) {
          onImport(data.entries)
          alert(`Imported ${data.entries.length} entries successfully`)
        } else {
          alert('Invalid file format')
        }
      } catch {
        alert('Failed to parse JSON. Please use a SpendLedger export file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    if (resetText !== 'RESET') return
    onReset()
    setShowResetDialog(false)
    setResetText('')
  }

  // ── Account management ───────────────────────────────────────────────────
  const handleAddUser = () => {
    setAddError('')
    if (!newName.trim()) return setAddError('Name is required')
    if (newPw.length < 4) return setAddError('Password must be at least 4 characters')
    if (newPw !== newPwConfirm) return setAddError('Passwords do not match')
    addUser(newName.trim(), newPw)
    setNewName(''); setNewPw(''); setNewPwConfirm(''); setShowAddUser(false)
  }

  const handleChangePassword = (userId) => {
    setPwChangeError('')
    if (newPwChange.length < 4) return setPwChangeError('Min. 4 characters')
    updateUserPassword(userId, newPwChange)
    setChangePwMode(null); setNewPwChange('')
  }

  // ── Category management ──────────────────────────────────────────────────
  const openAddCat = () => {
    setEditingCat(null)
    setCatName(''); setCatColor('emerald'); setCatIcon('💰'); setCatError('')
    setShowAddCat(true)
  }
  const openEditCat = (cat) => {
    setEditingCat(cat)
    setCatName(cat.name); setCatColor(cat.color); setCatIcon(cat.icon); setCatError('')
    setShowAddCat(true)
  }
  const saveCat = () => {
    if (!catName.trim()) return setCatError('Name is required')
    if (editingCat) {
      onEditCategory(editingCat.id, { name: catName.trim(), color: catColor, icon: catIcon })
    } else {
      onAddCategory({ name: catName.trim(), color: catColor, icon: catIcon })
    }
    setShowAddCat(false)
  }

  const confirmDeleteCat = (catId) => {
    const count = entries.filter(e => e.category === catId).length
    if (count === 0) {
      onDeleteCategory(catId)
    } else {
      setDeleteCatId(catId)
      setDeleteReassignTo('')
      setDeleteMode('delete')
    }
  }

  const executeDeleteCat = () => {
    if (deleteMode === 'reassign' && deleteReassignTo) {
      onReassignOrDeleteByCategory(deleteCatId, deleteReassignTo)
    } else {
      onReassignOrDeleteByCategory(deleteCatId, null)
    }
    onDeleteCategory(deleteCatId)
    setDeleteCatId(null)
  }

  const deletingCat = categories.find(c => c.id === deleteCatId)
  const affectedCount = deleteCatId ? entries.filter(e => e.category === deleteCatId).length : 0

  return (
    <div className="fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isAdmin ? 'Admin panel — full account control' : 'Manage your data and preferences'}
        </p>
      </div>

      {/* ── Category Manager ──────────────────────────────────────────── */}
      <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-semibold text-white">Category Manager</h3>
            <p className="text-xs text-slate-500 mt-0.5">{categories.length} categories</p>
          </div>
          {!showAddCat && (
            <button
              onClick={openAddCat}
              className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all font-medium"
            >
              + New Category
            </button>
          )}
        </div>

        <div className="space-y-2">
          {categories.map(cat => {
            const color = COLOR_PALETTE[cat.color] || '#6b7280'
            const catEntries = entries.filter(e => e.category === cat.id).length
            return (
              <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl" style={{ background: `${color}20` }}>
                    {cat.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{cat.name}</p>
                    <p className="text-xs text-slate-500">{catEntries} entries</p>
                  </div>
                  <div className="w-3 h-3 rounded-full ml-1" style={{ background: color }} />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditCat(cat)}
                    className="p-1.5 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors text-sm"
                  >✏️</button>
                  <button
                    onClick={() => confirmDeleteCat(cat.id)}
                    className="p-1.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors text-sm"
                  >🗑️</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add/Edit category form */}
        {showAddCat && (
          <div className="mt-4 p-4 bg-[#0f1117] rounded-xl border border-white/8 space-y-3">
            <p className="text-sm font-medium text-white">{editingCat ? 'Edit Category' : 'New Category'}</p>
            <input
              value={catName}
              onChange={e => { setCatName(e.target.value); setCatError('') }}
              placeholder="Category name"
              className="w-full bg-[#1a1d27] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
            />
            {/* Icon picker */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Icon</p>
              <div className="flex flex-wrap gap-2">
                {ICON_SET.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setCatIcon(icon)}
                    className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                      catIcon === icon ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            {/* Color picker */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_KEYS.map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCatColor(key)}
                    className={`w-7 h-7 rounded-full transition-all ${catColor === key ? 'ring-2 ring-white/50 scale-110' : 'hover:scale-105'}`}
                    style={{ background: COLOR_PALETTE[key] }}
                    title={key}
                  />
                ))}
              </div>
            </div>
            {catError && <p className="text-xs text-red-400">{catError}</p>}
            <div className="flex gap-2">
              <button onClick={saveCat} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all">
                {editingCat ? 'Save' : 'Create'}
              </button>
              <button onClick={() => setShowAddCat(false)} className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete category modal */}
      {deleteCatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[#1a1d27] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-heading font-semibold text-white">Delete "{deletingCat?.icon} {deletingCat?.name}"?</h3>
            <p className="text-sm text-slate-400">
              This category has <span className="text-white font-medium">{affectedCount} {affectedCount === 1 ? 'entry' : 'entries'}</span>. What should happen to them?
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-white/8 cursor-pointer hover:border-white/15 transition-all">
                <input type="radio" value="delete" checked={deleteMode === 'delete'} onChange={() => setDeleteMode('delete')} className="accent-red-500" />
                <div>
                  <p className="text-sm text-white">Delete those entries too</p>
                  <p className="text-xs text-slate-500">Permanently removes {affectedCount} entries</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-white/8 cursor-pointer hover:border-white/15 transition-all">
                <input type="radio" value="reassign" checked={deleteMode === 'reassign'} onChange={() => setDeleteMode('reassign')} className="accent-emerald-500" />
                <div className="flex-1">
                  <p className="text-sm text-white">Reassign to another category</p>
                  {deleteMode === 'reassign' && (
                    <select
                      value={deleteReassignTo}
                      onChange={e => setDeleteReassignTo(e.target.value)}
                      className="mt-2 w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                    >
                      <option value="">Select category...</option>
                      {categories.filter(c => c.id !== deleteCatId).map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={executeDeleteCat}
                disabled={deleteMode === 'reassign' && !deleteReassignTo}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-heading font-semibold transition-all"
              >
                Confirm Delete
              </button>
              <button onClick={() => setDeleteCatId(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin: Account Management ─────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-[#1a1d27] border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-white">Account Management</h3>
                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">Admin</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{users?.length} accounts</p>
            </div>
            {!showAddUser && (
              <button
                onClick={() => setShowAddUser(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all font-medium"
              >
                + New Account
              </button>
            )}
          </div>

          <div className="space-y-3">
            {users && users.map(u => (
              <div key={u.id} className={`p-3 rounded-xl border transition-all ${u.id === currentUser?.id ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5'}`}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-heading font-bold text-white flex-shrink-0"
                    style={{ background: avatarColor(users, u.id) }}
                  >
                    {initials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{u.name}</p>
                      {u.id === currentUser?.id && <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">You</span>}
                      {u.isAdmin && <span className="text-xs text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full">Admin</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-600">Password:</span>
                      <span className="text-xs font-mono text-slate-400">
                        {showPwFor === u.id ? u.password : '••••••••'}
                      </span>
                      <button onClick={() => setShowPwFor(showPwFor === u.id ? null : u.id)} className="text-xs text-slate-600 hover:text-slate-300 transition-colors">
                        {showPwFor === u.id ? 'hide' : 'show'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setChangePwMode(changePwMode === u.id ? null : u.id); setNewPwChange(''); setPwChangeError('') }}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                    >🔑</button>
                    {u.id !== 'tommy' && (
                      <button
                        onClick={() => { if (window.confirm(`Delete "${u.name}"?`)) deleteUser(u.id) }}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"
                      >🗑️</button>
                    )}
                  </div>
                </div>
                {changePwMode === u.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={newPwChange}
                      onChange={e => { setNewPwChange(e.target.value); setPwChangeError('') }}
                      placeholder="New password"
                      className="flex-1 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
                    />
                    <button onClick={() => handleChangePassword(u.id)} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all">Save</button>
                    <button onClick={() => { setChangePwMode(null); setNewPwChange('') }} className="text-xs px-2 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-all">✕</button>
                  </div>
                )}
                {pwChangeError && changePwMode === u.id && <p className="text-xs text-red-400 mt-1">{pwChangeError}</p>}
              </div>
            ))}
          </div>

          {showAddUser && (
            <div className="mt-4 p-4 bg-[#0f1117] rounded-xl border border-white/8 space-y-3">
              <p className="text-sm font-medium text-white">Create New Account</p>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="w-full bg-[#1a1d27] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40" />
              <input type="text" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Password" className="w-full bg-[#1a1d27] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40" />
              <input type="text" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)} placeholder="Confirm password" className="w-full bg-[#1a1d27] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40" />
              {addError && <p className="text-xs text-red-400">{addError}</p>}
              <div className="flex gap-2">
                <button onClick={handleAddUser} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-all">Create Account</button>
                <button onClick={() => { setShowAddUser(false); setNewName(''); setNewPw(''); setNewPwConfirm(''); setAddError('') }} className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm transition-all">Cancel</button>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/5">
            <button onClick={onLogout} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
              <span>🚪</span> Sign out of {currentUser?.name}
            </button>
          </div>
        </div>
      )}

      {/* ── Regular user account ──────────────────────────────────────── */}
      {!isAdmin && (
        <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
          <h3 className="font-heading font-semibold text-white mb-4">My Account</h3>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-base font-heading font-bold text-white"
              style={{ background: users ? avatarColor(users, currentUser?.id) : '#3b82f6' }}
            >
              {initials(currentUser?.name || '?')}
            </div>
            <div>
              <p className="font-medium text-white">{currentUser?.name}</p>
              <p className="text-xs text-slate-500">Personal account</p>
            </div>
          </div>
          {changePwMode === currentUser?.id ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">New password:</p>
              <div className="flex gap-2">
                <input type="text" value={newPwChange} onChange={e => { setNewPwChange(e.target.value); setPwChangeError('') }} placeholder="New password"
                  className="flex-1 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40" />
                <button onClick={() => handleChangePassword(currentUser.id)} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition-all">Save</button>
                <button onClick={() => { setChangePwMode(null); setNewPwChange('') }} className="px-2 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm transition-all">✕</button>
              </div>
              {pwChangeError && <p className="text-xs text-red-400">{pwChangeError}</p>}
            </div>
          ) : (
            <button onClick={() => setChangePwMode(currentUser?.id)} className="text-sm px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all">
              🔑 Change my password
            </button>
          )}
          <div className="mt-5 pt-4 border-t border-white/5">
            <button onClick={onLogout} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
              <span>🚪</span> Sign out of {currentUser?.name}
            </button>
          </div>
        </div>
      )}

      {/* ── Export ────────────────────────────────────────────────────── */}
      <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
        <h3 className="font-heading font-semibold text-white mb-1">Export Data</h3>
        <p className="text-sm text-slate-500 mb-4">Download all {entries.length} entries as JSON.</p>
        <button onClick={exportJSON} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-heading font-semibold transition-all">
          Download JSON
        </button>
      </div>

      {/* ── Import ────────────────────────────────────────────────────── */}
      <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
        <h3 className="font-heading font-semibold text-white mb-1">Import Data</h3>
        <p className="text-sm text-slate-500 mb-4">Import entries from a SpendLedger JSON export. This will replace all current entries.</p>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm font-heading font-medium transition-all">
          Choose JSON File
        </button>
      </div>

      {/* ── Reset ─────────────────────────────────────────────────────── */}
      <div className="bg-[#1a1d27] border border-red-500/20 rounded-xl p-5">
        <h3 className="font-heading font-semibold text-white mb-1">Reset All Data</h3>
        <p className="text-sm text-slate-500 mb-4">Permanently delete all entries. This cannot be undone.</p>
        {!showResetDialog ? (
          <button onClick={() => setShowResetDialog(true)} className="px-5 py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-heading font-medium transition-all">
            Reset All Data
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-400 font-medium">Type <strong>RESET</strong> to confirm:</p>
            <input value={resetText} onChange={e => setResetText(e.target.value)} placeholder="RESET"
              className="w-full bg-[#0f1117] border border-red-500/30 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={handleReset} disabled={resetText !== 'RESET'} className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-heading font-semibold transition-all">
                Confirm Reset
              </button>
              <button onClick={() => { setShowResetDialog(false); setResetText('') }} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── About ─────────────────────────────────────────────────────── */}
      <div className="bg-[#1a1d27] border border-white/8 rounded-xl p-5">
        <h3 className="font-heading font-semibold text-white mb-3">About SpendLedger</h3>
        <div className="space-y-2 text-sm text-slate-500">
          <p>Version 1.0.0</p>
          <p>{entries.length} entries synced to Firebase.</p>
          <p>
            <a href="https://github.com/tommyhanono/spend-ledger" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              View on GitHub →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
