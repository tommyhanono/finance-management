import { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  collection, doc, setDoc, deleteDoc, getDocs,
  onSnapshot, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

const colRef = (userId) => collection(db, 'users', userId, 'entries')

const localLoad  = (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null } catch { return null } }
const localSave  = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)) } catch {} }

const fsWrite = async (userId, entry) => {
  const clean = Object.fromEntries(
    Object.entries(entry).map(([k, v]) => [k, v === undefined ? null : v])
  )
  await setDoc(doc(db, 'users', userId, 'entries', entry.id), clean)
}

const fsDelete = async (userId, id) => {
  await deleteDoc(doc(db, 'users', userId, 'entries', id))
}

const fsBatch = async (userId, entries) => {
  const batch = writeBatch(db)
  entries.forEach(e => {
    const clean = Object.fromEntries(
      Object.entries(e).map(([k, v]) => [k, v === undefined ? null : v])
    )
    batch.set(doc(db, 'users', userId, 'entries', e.id), clean)
  })
  await batch.commit()
}

export const useEntries = (localKey = 'spendledger-v1', userId = null) => {
  const [entries, setEntries] = useState(() => localLoad(localKey) || [])
  const [synced, setSynced]   = useState(false)
  const [loading, setLoading] = useState(true)
  const skipNextSnapshot = useRef(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    const unsub = onSnapshot(
      colRef(userId),
      (snap) => {
        if (skipNextSnapshot.current) { skipNextSnapshot.current = false; return }
        const docs = snap.docs.map(d => d.data())

        if (docs.length === 0 && !synced) {
          // Fresh start — empty
          setEntries([])
          localSave(localKey, [])
          setSynced(true)
          setLoading(false)
          return
        }

        const sorted = docs.sort((a, b) => a.date.localeCompare(b.date))
        setEntries(sorted)
        localSave(localKey, sorted)
        setSynced(true)
        setLoading(false)
      },
      (err) => {
        console.warn('Firestore offline, using local cache:', err.message)
        const cached = localLoad(localKey)
        if (cached) setEntries(cached)
        setLoading(false)
      }
    )

    return unsub
  }, [userId, localKey])

  const _set = useCallback((next, firestoreOp) => {
    setEntries((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      localSave(localKey, resolved)
      return resolved
    })
    if (userId && firestoreOp) {
      firestoreOp().catch(console.error)
    }
  }, [localKey, userId])

  const addEntry = useCallback((data) => {
    const entry = { id: uuidv4(), ...data }
    _set((prev) => [...prev, entry], () => fsWrite(userId, entry))
  }, [_set, userId])

  const editEntry = useCallback((id, data) => {
    skipNextSnapshot.current = true
    setEntries((prev) => {
      const resolved = prev.map((e) => (e.id === id ? { ...e, ...data } : e))
      localSave(localKey, resolved)
      if (userId) {
        const updated = resolved.find(e => e.id === id)
        if (updated) fsWrite(userId, updated).catch(console.error)
      }
      return resolved
    })
  }, [userId, localKey])

  const deleteEntry = useCallback((id) => {
    _set((prev) => prev.filter((e) => e.id !== id), () => fsDelete(userId, id))
  }, [_set, userId])

  const resetAll = useCallback(async () => {
    if (userId) {
      try {
        const snap = await getDocs(colRef(userId))
        const batch = writeBatch(db)
        snap.docs.forEach(d => batch.delete(d.ref))
        await batch.commit()
      } catch (e) { console.error(e) }
    }
    _set([])
  }, [_set, userId])

  const importEntries = useCallback(async (newEntries) => {
    if (userId) {
      try {
        const snap = await getDocs(colRef(userId))
        const batch = writeBatch(db)
        snap.docs.forEach(d => batch.delete(d.ref))
        await batch.commit()
        await fsBatch(userId, newEntries)
      } catch (e) { console.error(e) }
    }
    _set(newEntries)
  }, [_set, userId])

  // When a category is deleted, reassign or delete entries
  const reassignOrDeleteByCategory = useCallback(async (catId, newCatId) => {
    if (newCatId) {
      // Reassign
      setEntries(prev => {
        const next = prev.map(e => e.category === catId ? { ...e, category: newCatId } : e)
        localSave(localKey, next)
        if (userId) {
          const affected = next.filter(e => e.category === newCatId && prev.find(p => p.id === e.id && p.category === catId))
          affected.forEach(e => fsWrite(userId, e).catch(console.error))
        }
        return next
      })
    } else {
      // Delete entries with that category
      const toDelete = entries.filter(e => e.category === catId)
      _set(prev => prev.filter(e => e.category !== catId), async () => {
        if (userId) {
          const batch = writeBatch(db)
          toDelete.forEach(e => batch.delete(doc(db, 'users', userId, 'entries', e.id)))
          await batch.commit()
        }
      })
    }
  }, [_set, userId, localKey, entries])

  return { entries, loading, synced, addEntry, editEntry, deleteEntry, resetAll, importEntries, reassignOrDeleteByCategory }
}
