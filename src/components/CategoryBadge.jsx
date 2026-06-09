import { COLOR_PALETTE } from '../utils/defaultCategories'

export default function CategoryBadge({ category, size = 'sm' }) {
  if (!category) return null
  const color = category.color ? (COLOR_PALETTE[category.color] || category.color) : '#6b7280'
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${px}`}
      style={{ color, background: `${color}20` }}
    >
      {category.icon && <span>{category.icon}</span>}
      {category.name}
    </span>
  )
}
