import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const SESSION_KEY  = 'spendledger-session'
const SESSION_DAYS = 30
const FS_DOC       = doc(db, 'config', 'accounts')

const SEED_USERS = [
  {
    id: 'tommy',
    name: 'Tommy',
    password: 'tommyhanono987',
    storageKey: 'spendledger-v1-tommy',
    createdAt: '2024-01-01T00:00:00.000Z',
    freshStart: true,
    isAdmin: true,
  },
]

const localLoadUsers = () => {
  try { const r = localStorage.getItem('spendledger-auth'); return r ? JSON.parse(r).users : null } catch { return null }
}
const localSaveUsers = (users) => {
  try { localStorage.setItem('spendledger-auth', JSON.stringify({ users })) } catch {}
}

const loadSession = () => {
  try {
    const r = localStorage.getItem(SESSION_KEY)
    if (!r) return null
    const s = JSON.parse(r)
    if (s.expiresAt && Date.now() > s.expiresAt) { localStorage.removeItem(SESSION_KEY); return null }
    return s
  } catch { return null }
}
const saveSession = (userId) => {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, expiresAt: Date.now() + SESSION_DAYS * 864e5 })) } catch {}
}
const clearSession = () => { try { localStorage.removeItem(SESSION_KEY) } catch {} }

const mergeWithSeed = (users) => {
  let merged = [...users]
  for (const seed of SEED_USERS) {
    const idx = merged.findIndex(u => u.id === seed.id)
    if (idx === -1) merged.push(seed)
    else merged[idx] = { ...merged[idx], isAdmin: seed.isAdmin, freshStart: seed.freshStart }
  }
  return merged
}

export const useAuth = () => {
  const [users, setUsers] = useState(() => {
    const cached = localLoadUsers()
    return cached ? mergeWithSeed(cached) : SEED_USERS
  })

  const [currentUserId, setCurrentUserId] = useState(() => {
    const s = loadSession()
    if (!s) return null
    const cached = localLoadUsers()
    return cached?.find(u => u.id === s.userId) ? s.userId : null
  })

  useEffect(() => {
    const unsub = onSnapshot(FS_DOC, (snap) => {
      if (snap.exists()) {
        const fsUsers = snap.data().users || []
        const merged = mergeWithSeed(fsUsers)
        setUsers(merged)
        localSaveUsers(merged)
      } else {
        setDoc(FS_DOC, { users: SEED_USERS }).catch(console.error)
      }
    }, (err) => {
      console.warn('Firestore users offline, using cache:', err.message)
    })
    return unsub
  }, [])

  const _saveUsers = (newUsers) => {
    setUsers(newUsers)
    localSaveUsers(newUsers)
    setDoc(FS_DOC, { users: newUsers }).catch(console.error)
  }

  const currentUser = users.find(u => u.id === currentUserId) || null

  const login = (userId, password, remember) => {
    const user = users.find(u => u.id === userId)
    if (!user || user.password !== password) return false
    setCurrentUserId(userId)
    if (remember) saveSession(userId)
    else clearSession()
    return true
  }

  const logout = () => { setCurrentUserId(null); clearSession() }

  const addUser = (name, password) => {
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now()
    const newUser = {
      id,
      name,
      password,
      storageKey: `spendledger-v1-${id}`,
      createdAt: new Date().toISOString(),
      freshStart: true,
      isAdmin: false,
    }
    _saveUsers([...users, newUser])
    return newUser
  }

  const updateUserPassword = (userId, newPassword) => {
    _saveUsers(users.map(u => u.id === userId ? { ...u, password: newPassword } : u))
  }

  const deleteUser = (userId) => {
    if (userId === 'tommy') return
    _saveUsers(users.filter(u => u.id !== userId))
  }

  return { users, currentUser, currentUserId, login, logout, addUser, updateUserPassword, deleteUser }
}
