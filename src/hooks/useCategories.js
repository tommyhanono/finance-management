import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDocs,
} from 'firebase/firestore'
import { db } from '../firebase'
import { makeDefaultCategories } from '../utils/defaultCategories'

const colRef = (userId) => collection(db, 'users', userId, 'categories')
const localKey = (userId) => `spendledger-cats-${userId}`

const localLoad = (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null } catch { return null } }
const localSave = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)) } catch {} }

export const useCategories = (userId) => {
  const [categories, setCategories] = useState(() => localLoad(localKey(userId)) || [])
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    if (!userId) return
    const unsub = onSnapshot(colRef(userId), async (snap) => {
      const docs = snap.docs.map(d => d.data())
      if (docs.length === 0 && !synced) {
        // Seed default categories
        const defaults = makeDefaultCategories()
        const batch = writeBatch(db)
        defaults.forEach(cat => {
          batch.set(doc(db, 'users', userId, 'categories', cat.id), cat)
        })
        await batch.commit().catch(console.error)
        return
      }
      setCategories(docs)
      localSave(localKey(userId), docs)
      setSynced(true)
    }, (err) => {
      console.warn('Firestore categories offline:', err.message)
      const cached = localLoad(localKey(userId))
      if (cached && cached.length > 0) setCategories(cached)
      else setCategories(makeDefaultCategories())
    })
    return unsub
  }, [userId])

  const addCategory = useCallback(async (catData) => {
    const id = uuidv4()
    const cat = { id, ...catData }
    setCategories(prev => {
      const next = [...prev, cat]
      localSave(localKey(userId), next)
      return next
    })
    if (userId) {
      await setDoc(doc(db, 'users', userId, 'categories', id), cat).catch(console.error)
    }
    return cat
  }, [userId])

  const editCategory = useCallback(async (id, updates) => {
    setCategories(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c)
      localSave(localKey(userId), next)
      return next
    })
    if (userId) {
      const existing = categories.find(c => c.id === id)
      if (existing) {
        await setDoc(doc(db, 'users', userId, 'categories', id), { ...existing, ...updates }).catch(console.error)
      }
    }
  }, [userId, categories])

  const deleteCategory = useCallback(async (id) => {
    setCategories(prev => {
      const next = prev.filter(c => c.id !== id)
      localSave(localKey(userId), next)
      return next
    })
    if (userId) {
      await deleteDoc(doc(db, 'users', userId, 'categories', id)).catch(console.error)
    }
  }, [userId])

  return { categories, addCategory, editCategory, deleteCategory }
}
