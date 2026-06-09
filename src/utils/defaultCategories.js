import { v4 as uuidv4 } from 'uuid'

// Color palette (10 options) — maps to actual hex for charts/badges
export const COLOR_PALETTE = {
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  sky:     '#0ea5e9',
  green:   '#22c55e',
  purple:  '#8b5cf6',
  emerald: '#10b981',
  red:     '#ef4444',
  orange:  '#f97316',
  pink:    '#ec4899',
  slate:   '#64748b',
}

export const COLOR_KEYS = Object.keys(COLOR_PALETTE)

// Icon set (15 options)
export const ICON_SET = ['🍔','🏠','🚗','💊','🎮','💼','✈️','📚','🎵','🛒','💡','🐾','🏋️','🎁','💰']

// Default categories on first launch
export const makeDefaultCategories = () => [
  { id: 'food',          name: 'Food',          icon: '🍔', color: 'amber'   },
  { id: 'housing',       name: 'Housing',        icon: '🏠', color: 'blue'    },
  { id: 'transport',     name: 'Transport',      icon: '🚗', color: 'sky'     },
  { id: 'health',        name: 'Health',         icon: '💊', color: 'green'   },
  { id: 'entertainment', name: 'Entertainment',  icon: '🎮', color: 'purple'  },
  { id: 'income',        name: 'Income',         icon: '💼', color: 'emerald' },
]
