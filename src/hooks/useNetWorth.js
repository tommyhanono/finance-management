import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

const colRef  = (userId) => collection(db, 'users', userId, 'networth')
const localKey = (userId) => `spendledger-nw-${userId}`

const localLoad = (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : [] } catch { return [] } }
const localSave = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)) } catch {} }

// item shape: { id, name, amount, type: 'asset'|'liability', category: string, notes: string|null }
export const useNetWorth = (userId) => {
  const [items, setItems] = useState(() => localLoad(localKey(userId)))

  useEffect(() => {
    if (!userId) return
    const unsub = onSnapshot(colRef(userId), (snap) => {
      const docs = snap.docs.map(d => d.data())
      setItems(docs)
      localSave(localKey(userId), docs)
    }, (err) => {
      console.warn('NetWorth offline:', err.message)
      setItems(localLoad(localKey(userId)))
    })
    return unsub
  }, [userId])

  const addItem = useCallback(async (data) => {
    const item = { id: uuidv4(), ...data }
    setItems(prev => {
      const next = [...prev, item]
      localSave(localKey(userId), next)
      return next
    })
    if (userId) await setDoc(doc(db, 'users', userId, 'networth', item.id), item).catch(console.error)
    return item
  }, [userId])

  const editItem = useCallback(async (id, data) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...data } : i)
      localSave(localKey(userId), next)
      if (userId) {
        const updated = next.find(i => i.id === id)
        if (updated) setDoc(doc(db, 'users', userId, 'networth', id), updated).catch(console.error)
      }
      return next
    })
  }, [userId])

  const deleteItem = useCallback(async (id) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      localSave(localKey(userId), next)
      return next
    })
    if (userId) await deleteDoc(doc(db, 'users', userId, 'networth', id)).catch(console.error)
  }, [userId])

  const totalAssets      = items.filter(i => i.type === 'asset').reduce((s, i) => s + i.amount, 0)
  const totalLiabilities = items.filter(i => i.type === 'liability').reduce((s, i) => s + i.amount, 0)
  const netWorth         = totalAssets - totalLiabilities

  return { items, addItem, editItem, deleteItem, totalAssets, totalLiabilities, netWorth }
}
