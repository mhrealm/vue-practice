<template>
  <section class="list-card">
    <header class="list-header">
      <div>
        <h2>普通列表</h2>
        <p>一次性渲染完整数据</p>
      </div>
      <span>{{ listData.length }} 个节点</span>
    </header>

    <div class="list-view" :style="{ height: `${viewHeight}px` }">
      <ul class="list-body">
        <li v-for="item in listData" :key="item.id" class="list-item">
          <strong>#{{ item.id }}</strong>
          <span>{{ item.title }}</span>
          <em>{{ item.status }}</em>
        </li>
      </ul>
    </div>
  </section>
</template>

<script lang="ts" setup>
interface ListItem {
  id: number
  title: string
  status: string
}

const total = 10000
const viewHeight = 520

const listData: ListItem[] = Array.from({ length: total }, (_, index) => ({
  id: index + 1,
  title: `订单渲染任务 ${index + 1}`,
  status: index % 3 === 0 ? '待处理' : index % 3 === 1 ? '执行中' : '已完成',
}))
</script>

<style lang="less" scoped>
.list-card {
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  background: #fff;
  padding: 20px;
  box-shadow: 0 18px 40px rgb(33 56 96 / 10%);
}

.list-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.list-header h2,
.list-header p {
  margin: 0;
}

.list-header h2 {
  font-size: 22px;
  font-weight: 700;
}

.list-header p {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.list-header span {
  color: #dc2626;
  font-size: 14px;
}

.list-view {
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.list-body {
  margin: 0;
  padding: 0 8px;
  list-style: none;
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
  .list-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .list-item {
    grid-template-columns: 66px 1fr;
    row-gap: 4px;
  }

  .list-item em {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
