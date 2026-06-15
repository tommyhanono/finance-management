import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Modal from './components/Modal'
import LockScreen from './components/LockScreen'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import NetWorth from './pages/NetWorth'
import Recurring from './pages/Recurring'
import { useAuth } from './hooks/useAuth'
import { useEntries } from './hooks/useEntries'
import { useCategories } from './hooks/useCategories'
import { useBudgets } from './hooks/useBudgets'
import { useNetWorth } from './hooks/useNetWorth'
import { loadCurrencySettings, saveCurrencySettings } from './utils/currency'

function AppInner({ currentUser, onLogout, authHook }) {
  const [page, setPage]       = useState('dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [editEntry, setEditEntry] = useState(null)

  // Currency settings (localStorage only — lightweight preference)
  const [currencySettings, setCurrencySettings] = useState(() => loadCurrencySettings(currentUser.id))
  const currencyCode  = currencySettings.code
  const customRates   = currencySettings.customRates || {}
  const handleSetCurrency = (code) => {
    const next = { ...currencySettings, code }
    setCurrencySettings(next)
    saveCurrencySettings(currentUser.id, next)
  }
  const handleSetRate = (code, rate) => {
    const next = { ...currencySettings, customRates: { ...customRates, [code]: Number(rate) } }
    setCurrencySettings(next)
    saveCurrencySettings(currentUser.id, next)
  }

  const {
    entries, loading, addEntry, editEntry: updateEntry, deleteEntry,
    resetAll, importEntries, reassignOrDeleteByCategory,
  } = useEntries(currentUser.storageKey, currentUser.id)

  const { categories, addCategory, editCategory, deleteCategory } = useCategories(currentUser.id)
  const { budgets, setBudget, removeBudget }                       = useBudgets(currentUser.id)
  const {
    items: nwItems, addItem: addNwItem, editItem: editNwItem, deleteItem: deleteNwItem,
    totalAssets, totalLiabilities, netWorth,
  } = useNetWorth(currentUser.id)

  const openAdd  = () => { setEditEntry(null); setModalOpen(true) }
  const openEdit = (entry) => { setEditEntry(entry); setModalOpen(true) }
  const handleSave = (data) => {
    if (editEntry) updateEntry(editEntry.id, data)
    else addEntry(data)
  }

  return (
    <div className="flex w-full min-h-screen bg-[#0f1117]">
      <Sidebar page={page} setPage={setPage} />

      <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6 overflow-y-auto max-w-screen-xl">
        {page === 'dashboard' && (
          <Dashboard
            entries={entries}
            categories={categories}
            budgets={budgets}
            onAddEntry={openAdd}
            onEdit={openEdit}
          />
        )}
        {page === 'history' && (
          <History
            entries={entries}
            categories={categories}
            onEdit={openEdit}
            onDelete={deleteEntry}
          />
        )}
        {page === 'analytics' && (
          <Analytics entries={entries} categories={categories} />
        )}
        {page === 'recurring' && (
          <Recurring
            entries={entries}
            categories={categories}
            onAdd={addEntry}
            onEdit={openEdit}
            onDelete={deleteEntry}
          />
        )}
        {page === 'networth' && (
          <NetWorth
            items={nwItems}
            onAdd={addNwItem}
            onEdit={editNwItem}
            onDelete={deleteNwItem}
            totalAssets={totalAssets}
            totalLiabilities={totalLiabilities}
            netWorth={netWorth}
          />
        )}
        {page === 'settings' && (
          <Settings
            entries={entries}
            onImport={importEntries}
            onReset={resetAll}
            currentUser={currentUser}
            authHook={authHook}
            onLogout={onLogout}
            categories={categories}
            onAddCategory={addCategory}
            onEditCategory={editCategory}
            onDeleteCategory={deleteCategory}
            onReassignOrDeleteByCategory={reassignOrDeleteByCategory}
            budgets={budgets}
            onSetBudget={setBudget}
            onRemoveBudget={removeBudget}
            currencyCode={currencyCode}
            customRates={customRates}
            onSetCurrency={handleSetCurrency}
            onSetRate={handleSetRate}
          />
        )}
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={editEntry}
        categories={categories}
        userId={currentUser.id}
      />
    </div>
  )
}

function App() {
  const auth = useAuth()
  const { users, currentUser, login, logout } = auth

  if (!currentUser) {
    return <LockScreen users={users} onLogin={login} />
  }

  return <AppInner currentUser={currentUser} onLogout={logout} authHook={auth} />
}

export default App
