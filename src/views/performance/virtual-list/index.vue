<template>
  <main class="list-page">
    <section class="list-shell">
      <header class="list-header">
        <div>
          <p>Performance / Virtual List</p>
          <h1>虚拟列表</h1>
        </div>
        <span>{{ total }} 条数据，仅渲染 {{ showRows.length }} 个节点</span>
      </header>

      <div class="list-view" @scroll="onScroll">
        <!-- 用完整高度撑出真实滚动条，实际 DOM 只渲染可视区域。 -->
        <div class="list-space" :style="{ height: `${fullHeight}px` }">
          <!-- 把当前渲染片段移动到它在完整列表中的位置。 -->
          <ul class="list-body" :style="{ transform: `translateY(${moveY}px)` }">
            <li v-for="item in showRows" :key="item.id" class="list-item">
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

interface RowItem {
  id: number
  title: string
  status: string
}

const total = 10000
const rowHeight = 64
const viewHeight = 520
const buffer = 6

const scrollTop = ref(0)

// 这里模拟一次性拿到的大列表，真实项目可以替换成接口数据。
const rows = Array.from({ length: total }, (_, index): RowItem => ({
  id: index + 1,
  title: `订单渲染任务 ${index + 1}`,
  status: index % 3 === 0 ? '待处理' : index % 3 === 1 ? '执行中' : '已完成',
}))

// 总高度只用来撑开滚动条，不会创建对应数量的 DOM 节点。
const fullHeight = total * rowHeight

// 根据滚动距离换算当前应该从哪一行开始渲染。
const start = computed(() => Math.max(Math.floor(scrollTop.value / rowHeight) - buffer, 0))

// 多渲染上下 buffer 行，避免快速滚动时出现短暂空白。
const showCount = computed(() => Math.ceil(viewHeight / rowHeight) + buffer * 2)
const end = computed(() => Math.min(start.value + showCount.value, total))
const moveY = computed(() => start.value * rowHeight)
const showRows = computed<RowItem[]>(() => rows.slice(start.value, end.value))

const onScroll = (event: Event) => {
  scrollTop.value = (event.target as HTMLElement).scrollTop
}
</script>

<style scoped>
.list-page {
  min-height: 100vh;
  padding: 32px;
  background: #f4f7fb;
  color: #172033;
}

.list-shell {
  max-width: 980px;
  margin: 0 auto;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 18px 40px rgb(33 56 96 / 10%);
}

.list-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.list-header p,
.list-header h1 {
  margin: 0;
}

.list-header p {
  color: #64748b;
  font-size: 13px;
}

.list-header h1 {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 700;
}

.list-header span {
  color: #2563eb;
  font-size: 14px;
}

.list-view {
  height: 520px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.list-space {
  position: relative;
}

.list-body {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  margin: 0;
  padding: 8px;
  list-style: none;
  will-change: transform;
}

.list-item {
  display: grid;
  grid-template-columns: 90px 1fr 82px;
  align-items: center;
  box-sizing: border-box;
  height: 56px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 0 16px;
}

.list-item strong {
  color: #0f172a;
}

.list-item span {
  min-width: 0;
  overflow: hidden;
  color: #475569;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-item em {
  justify-self: end;
  color: #0f766e;
  font-style: normal;
}

@media (max-width: 640px) {
  .list-page {
    padding: 16px;
  }

  .list-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .list-item {
    grid-template-columns: 66px 1fr;
    row-gap: 4px;
    height: 64px;
  }

  .list-item em {
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
