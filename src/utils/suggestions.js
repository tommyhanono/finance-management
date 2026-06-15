const storageKey = (userId) => `spendledger-desc-suggestions-${userId}`

export const loadSuggestions = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) || '{}')
  } catch {
    return {}
  }
}

export const saveSuggestion = (userId, catId, desc) => {
  if (!userId || !catId || !desc) return
  try {
    const all = loadSuggestions(userId)
    const prev = all[catId] || []
    const next = [desc, ...prev.filter(d => d !== desc)].slice(0, 5)
    all[catId] = next
    localStorage.setItem(storageKey(userId), JSON.stringify(all))
  } catch {}
}

export const getSuggestionsForCategory = (userId, catId) => {
  const all = loadSuggestions(userId)
  return all[catId] || []
}

export const filterSuggestions = (suggestions, query) => {
  if (!query) return suggestions
  const q = query.toLowerCase()
  return suggestions.filter(s => s.toLowerCase().includes(q))
}
