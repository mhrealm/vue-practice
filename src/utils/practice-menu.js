import { categoryColors } from '@/constants/category-colors'

const FALLBACK_CATEGORY_KEY = 'other'
const MIN_DIFFICULTY = 1
const MAX_DIFFICULTY = 5

// 约定 views 下的一级目录就是菜单分类，比如 /javascript/map-usage -> javascript。
export const getPathCategoryKey = path => {
  const firstSegment = path.split('/').filter(Boolean)[0]
  return firstSegment || FALLBACK_CATEGORY_KEY
}

// 未显式配置 meta.category 时，用目录名生成可读分类名。
export const formatCategoryName = categoryKey => {
  if (categoryKey === FALLBACK_CATEGORY_KEY) return '其它'
  return categoryKey
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// 难度固定在 1-5 星，未配置时默认 1 星。
export const normalizeDifficulty = difficulty => {
  const value = Number(difficulty)

  if (!Number.isFinite(value)) {
    return MIN_DIFFICULTY
  }

  return Math.min(Math.max(Math.round(value), MIN_DIFFICULTY), MAX_DIFFICULTY)
}

// 把 vue-router 的 route 规范化成菜单项，组件层只消费这个轻量结构。
export const routeToMenuItem = route => {
  const categoryKey = getPathCategoryKey(route.path)
  return {
    path: route.path,
    title: route.meta.title,
    category: route.meta.category || formatCategoryName(categoryKey),
    categoryKey,
    tag: route.meta.tag,
    difficulty: normalizeDifficulty(route.meta.difficulty)
  }
}

// 按分类分组并顺序分配颜色；分类超过颜色数量后循环使用色板。
export const groupMenuItems = menuItems => {
  const groups = new Map()
  menuItems.forEach(item => {
    if (!groups.has(item.categoryKey)) {
      groups.set(item.categoryKey, {
        category: item.category,
        categoryKey: item.categoryKey,
        items: []
      })
    }
    groups.get(item.categoryKey).items.push(item)
  })

  return Array.from(groups.values())
    .sort((a, b) => a.category.localeCompare(b.category, 'zh-Hans'))
    .map((group, index) => ({
      ...group,
      categoryColor: categoryColors[index % categoryColors.length]
    }))
}
