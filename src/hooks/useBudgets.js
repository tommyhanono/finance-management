import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const localKey  = (userId) => `spendledger-budgets-${userId}`
const fsDocRef  = (userId) => doc(db, 'users', userId, 'settings', 'budgets')

const localLoad = (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : {} } catch { return {} } }
const localSave = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)) } catch {} }

// budgets shape: { [catId]: { monthly: number } }
export const useBudgets = (userId) => {
  const [budgets, setBudgets] = useState(() => localLoad(localKey(userId)))

  useEffect(() => {
    if (!userId) return
    const unsub = onSnapshot(fsDocRef(userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setBudgets(data)
        localSave(localKey(userId), data)
      }
    }, (err) => {
      console.warn('Budgets offline:', err.message)
      setBudgets(localLoad(localKey(userId)))
    })
    return unsub
  }, [userId])

  const setBudget = useCallback(async (catId, monthly) => {
    setBudgets(prev => {
      const next = { ...prev, [catId]: { monthly: Number(monthly) } }
      localSave(localKey(userId), next)
      if (userId) setDoc(fsDocRef(userId), next).catch(console.error)
      return next
    })
  }, [userId])

  const removeBudget = useCallback(async (catId) => {
    setBudgets(prev => {
      const next = { ...prev }
      delete next[catId]
      localSave(localKey(userId), next)
      if (userId) setDoc(fsDocRef(userId), next).catch(console.error)
      return next
    })
  }, [userId])

  return { budgets, setBudget, removeBudget }
}
