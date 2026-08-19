<template>
  <main class="list-page">
    <section class="list-shell">
      <header class="list-header">
        <h1>虚拟列表</h1>
        <span>{{ total }} 条数据，仅渲染 {{ showData.length }} 个节点</span>
      </header>
      <div class="list-view" @scroll="onScroll">
        <div class="list-space" :style="{ height: `${fullHeight}px` }">
          <ul class="list-body" :style="{ transform: `translateY(${moveY}px)` }">
            <li v-for="item in showData" :key="item.id" class="list-item">
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


<script lang="ts" setup>
import { computed, ref } from 'vue'
const total = 10000
const rowHeight = 64
const viewHeight = 520
const buffer = 6
const scrollTop = ref(0)
const listData = Array.from({ length: total }, (_, index) => ({
  id: index + 1,
  title: `订单渲染任务 ${index + 1}`,
  status: index % 3 === 0 ? '待处理' : index % 3 === 1 ? '执行中' : '已完成',
}))

const fullHeight = total * rowHeight
const start = computed(() => Math.max(Math.floor(scrollTop.value / rowHeight) - buffer, 0))
const showCount = computed(() => Math.ceil(viewHeight / rowHeight))
const end = computed(() => Math.min((showCount.value + start.value) + buffer * 2, total))
const showData = computed(() => listData.slice(start.value, end.value))
const moveY = computed(() => start.value * rowHeight)
const onScroll = (e: Event) => {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

</script>

<style lang="less" scoped>
.list-page {
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
</style>
