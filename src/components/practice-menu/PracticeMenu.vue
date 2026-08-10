<template>
  <div class="practice-menu">
    <nav>
      <ul class="practice-menu__list">
        <template v-for="group in groups" :key="group.categoryKey">
          <li v-for="item in group.items" :key="item.path" class="practice-menu__item">
            <router-link :to="item.path" class="practice-menu__link">
              <span class="practice-menu__badge" :style="{ backgroundColor: group.categoryColor }">
                {{ item.category }}
              </span>
              <span class="practice-menu__title" :title="item.title">{{ item.title }}</span>
              <span v-if="item.tag" class="practice-menu__tag">#{{ item.tag }}</span>
            </router-link>
          </li>
        </template>
      </ul>
    </nav>
  </div>
</template>

<script setup>
defineProps({
  // 已按一级目录分组后的菜单数据；组件会摊平成一个连续网格展示。
  groups: {
    type: Array,
    default: () => [],
  },
})
</script>

<style lang="less" scoped>
.practice-menu {
  margin: 28px auto;
  padding: 0 24px;
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

@media (max-width: 640px) {
  .practice-menu {
    margin: 22px auto;
    padding: 0 16px;
  }

  .practice-menu__list {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
}
</style>
