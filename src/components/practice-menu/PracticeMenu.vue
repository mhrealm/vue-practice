<template>
  <div class="practice-menu">
    <div class="practice-menu__toolbar">
      <div class="practice-menu__filters">
        <section class="practice-menu__filter-group" aria-label="按分类筛选">
          <span class="practice-menu__filter-label">分类</span>
          <div class="practice-menu__chips">
            <button v-for="option in categoryOptions" :key="option.label" type="button" class="practice-menu__chip" :class="{ 'practice-menu__chip--active': selectedCategory === option.value }" :aria-pressed="selectedCategory === option.value" @click="selectedCategory = option.value">
              {{ option.label }}
            </button>
          </div>
        </section>

        <section class="practice-menu__filter-group" aria-label="按难度筛选">
          <span class="practice-menu__filter-label">难度</span>
          <div class="practice-menu__difficulty-filter">
            <button v-for="option in difficultyOptions" :key="option.label" type="button" class="practice-menu__difficulty-option" :class="{ 'practice-menu__difficulty-option--active': selectedDifficulty === option.value }" :aria-pressed="selectedDifficulty === option.value"
              @click="selectedDifficulty = option.value">
              <span v-if="option.value === 'all'">{{ option.label }}</span>
              <span v-else class="practice-menu__filter-stars" :aria-label="`${option.value} 星`">
                <span v-for="star in option.value" :key="star">★</span>
              </span>
            </button>
          </div>
        </section>
      </div>
      <span class="practice-menu__count">{{ visibleCount }} 个案例</span>
    </div>

    <nav>
      <ul class="practice-menu__list">
        <template v-for="group in filteredGroups" :key="group.categoryKey">
          <li v-for="item in group.items" :key="item.path" class="practice-menu__item">
            <router-link :to="item.path" class="practice-menu__link">
              <span class="practice-menu__badge" :style="{ backgroundColor: group.categoryColor }">
                {{ item.category }}
              </span>
              <span class="practice-menu__title" :title="item.title">{{ item.title }}</span>
              <span v-if="item.tag" class="practice-menu__tag">#{{ item.tag }}</span>
              <span class="practice-menu__difficulty" :title="`难度 ${item.difficulty} 星`" :aria-label="`难度 ${item.difficulty} 星`">
                <span class="practice-menu__difficulty-label">难度</span>
                <span class="practice-menu__stars" aria-hidden="true">
                  <span v-for="star in 5" :key="star" class="practice-menu__star" :class="{ 'practice-menu__star--active': star <= item.difficulty }">
                    ★
                  </span>
                </span>
              </span>
            </router-link>
          </li>
        </template>
      </ul>
    </nav>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  // 已按一级目录分组后的菜单数据；组件会摊平成一个连续网格展示。
  groups: {
    type: Array,
    default: () => [],
  },
})

const difficultyOptions = [
  { label: '全部', value: 'all' },
  { label: '1 星', value: 1 },
  { label: '2 星', value: 2 },
  { label: '3 星', value: 3 },
  { label: '4 星', value: 4 },
  { label: '5 星', value: 5 },
]

const selectedDifficulty = ref('all')
const selectedCategory = ref('all')

const categoryOptions = computed(() => {
  const categoryMap = new Map()

  props.groups.forEach(group => {
    group.items.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, {
          label: item.category,
          value: item.category,
        })
      }
    })
  })

  return [{ label: '全部', value: 'all' }, ...Array.from(categoryMap.values())]
})

const filteredGroups = computed(() => {
  if (selectedCategory.value === 'all' && selectedDifficulty.value === 'all') {
    return props.groups
  }

  return props.groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        const matchesCategory = selectedCategory.value === 'all' || item.category === selectedCategory.value
        const matchesDifficulty = selectedDifficulty.value === 'all' || item.difficulty === selectedDifficulty.value

        return matchesCategory && matchesDifficulty
      }),
    }))
    .filter(group => group.items.length)
})

const visibleCount = computed(() => filteredGroups.value.reduce((total, group) => total + group.items.length, 0))
</script>

<style lang="less" scoped>
.practice-menu {
  margin: 28px auto;
  padding: 0 24px;
}

.practice-menu__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px 14px;
}

.practice-menu__filters {
  display: grid;
  flex: 1;
  gap: 10px;
  min-width: 0;
}

.practice-menu__filter-group {
  display: grid;
  grid-template-columns: 38px 1fr;
  align-items: start;
  gap: 10px;
}

.practice-menu__filter-label {
  padding-top: 7px;
  color: #64748b;
  font-size: 13px;
  line-height: 1;
}

.practice-menu__chips,
.practice-menu__difficulty-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.practice-menu__chip,
.practice-menu__difficulty-option {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  font: inherit;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.practice-menu__chip {
  padding: 6px 10px;
  font-size: 13px;
  line-height: 1;
}

.practice-menu__difficulty-option {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 5px 9px;
  font-size: 12px;
  line-height: 1;
}

.practice-menu__chip:hover,
.practice-menu__difficulty-option:hover {
  border-color: #42b883;
  color: #0f766e;
}

.practice-menu__chip:focus-visible,
.practice-menu__difficulty-option:focus-visible {
  outline: 2px solid rgb(66 184 131 / 22%);
  outline-offset: 2px;
}

.practice-menu__chip--active,
.practice-menu__difficulty-option--active {
  border-color: #42b883;
  background: #ecfdf5;
  color: #047857;
  box-shadow: 0 1px 0 rgb(15 118 110 / 8%);
}

.practice-menu__filter-stars {
  display: inline-flex;
  gap: 1px;
  color: #f59e0b;
}

.practice-menu__count {
  flex: 0 0 auto;
  border-radius: 6px;
  background: #f1f5f9;
  padding: 7px 10px;
  color: #64748b;
  font-size: 13px;
  line-height: 1;
}

.practice-menu__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  grid-auto-flow: row;
  gap: 14px;
}

.practice-menu__item {
  background-color: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
  border: 1px solid transparent;
  min-width: 0;

  // 菜单项默认保持紧凑，悬停时只展开标题文本，避免卡片整体跳动太明显。
  &:hover {
    background-color: #ffffff;
    border-color: #42b883;
    transform: translateY(-1px);
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.06);

    .practice-menu__title {
      color: #42b883;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
    }
  }

  &:active {
    transform: translateY(-1px) scale(0.98);
  }
}

.practice-menu__link {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 8px;
  height: 100%;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
}

.practice-menu__badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
  text-transform: uppercase;
  justify-self: start;
  color: white;
}

.practice-menu__title {
  width: 100%;
  min-width: 0;
  font-weight: 500;
  font-size: 15px;
  line-height: 1.45;
  transition: color 0.3s ease;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.practice-menu__tag {
  font-size: 12px;
  color: #999;
}

.practice-menu__difficulty {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1;
}

.practice-menu__difficulty-label {
  color: #64748b;
}

.practice-menu__stars {
  display: inline-flex;
  gap: 2px;
}

.practice-menu__star {
  color: #cbd5e1;
}

.practice-menu__star--active {
  color: #f59e0b;
}

@media (max-width: 640px) {
  .practice-menu {
    margin: 22px auto;
    padding: 0 16px;
  }

  .practice-menu__toolbar {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px;
  }

  .practice-menu__filter-group {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .practice-menu__filter-label {
    padding-top: 0;
  }

  .practice-menu__list {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
}
</style>
