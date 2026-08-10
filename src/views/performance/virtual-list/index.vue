<template>
  <main class="virtual-list-page">
    <section class="virtual-list-shell">
      <header class="virtual-list-header">
        <div>
          <p>Performance / Virtual List</p>
          <h1>虚拟列表</h1>
        </div>
        <span>{{ total }} 条数据，仅渲染 {{ visibleItems.length }} 个节点</span>
      </header>

      <div ref="scrollRef" class="virtual-list-viewport" @scroll="handleScroll">
        <div class="virtual-list-spacer" :style="{ height: `${totalHeight}px` }">
          <ul class="virtual-list-content" :style="{ transform: `translateY(${offsetY}px)` }">
            <li v-for="item in visibleItems" :key="item.id" class="virtual-list-item">
              <strong>#{{ item.id }}</strong>
              <span>{{ item.title }}</span>
              <em>{{ item.status }}</em>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface ListItem {
  id: number
  title: string
  status: string
}

const total = 10000
const itemHeight = 64
const viewportHeight = 520
const bufferSize = 6

const scrollTop = ref(0)
const scrollRef = ref<HTMLElement | null>(null)

const list = Array.from({ length: total }, (_, index): ListItem => ({
  id: index + 1,
  title: `订单渲染任务 ${index + 1}`,
  status: index % 3 === 0 ? '待处理' : index % 3 === 1 ? '执行中' : '已完成',
}))

const totalHeight = total * itemHeight

const startIndex = computed(() => Math.max(Math.floor(scrollTop.value / itemHeight) - bufferSize, 0))
const visibleCount = computed(() => Math.ceil(viewportHeight / itemHeight) + bufferSize * 2)
const endIndex = computed(() => Math.min(startIndex.value + visibleCount.value, total))
const offsetY = computed(() => startIndex.value * itemHeight)
const visibleItems = computed<ListItem[]>(() => list.slice(startIndex.value, endIndex.value))

const handleScroll = () => {
  scrollTop.value = scrollRef.value?.scrollTop || 0
}
</script>

<style scoped>
.virtual-list-page {
  min-height: 100vh;
  padding: 32px;
  background: #f4f7fb;
  color: #172033;
}

.virtual-list-shell {
  max-width: 980px;
  margin: 0 auto;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 18px 40px rgb(33 56 96 / 10%);
}

.virtual-list-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.virtual-list-header p,
.virtual-list-header h1 {
  margin: 0;
}

.virtual-list-header p {
  color: #64748b;
  font-size: 13px;
}

.virtual-list-header h1 {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 700;
}

.virtual-list-header span {
  color: #2563eb;
  font-size: 14px;
}

.virtual-list-viewport {
  height: 520px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.virtual-list-spacer {
  position: relative;
}

.virtual-list-content {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  margin: 0;
  padding: 8px;
  list-style: none;
  will-change: transform;
}

.virtual-list-item {
  display: grid;
  grid-template-columns: 90px 1fr 82px;
  align-items: center;
  height: 56px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 0 16px;
}

.virtual-list-item strong {
  color: #0f172a;
}

.virtual-list-item span {
  min-width: 0;
  overflow: hidden;
  color: #475569;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.virtual-list-item em {
  justify-self: end;
  color: #0f766e;
  font-style: normal;
}

@media (max-width: 640px) {
  .virtual-list-page {
    padding: 16px;
  }

  .virtual-list-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .virtual-list-item {
    grid-template-columns: 66px 1fr;
    row-gap: 4px;
    height: 64px;
  }

  .virtual-list-item em {
    grid-column: 2;
    justify-self: start;
  }
}
</style>

<route lang="json">{
  "meta": {
    "title": "虚拟列表",
    "category": "性能优化",
    "tag": "Virtual List",
    "difficulty": 4
  }
}</route>
