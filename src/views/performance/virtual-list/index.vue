<template>
  <main class="list-page">
    <section class="test-shell">
      <NormalList v-if="true" />
      <VirtualList v-else />
    </section>
  </main>
</template>

<script lang="ts" setup>
import NormalList from './NormalList.vue'
import VirtualList from './VirtualList.vue'
</script>

<style lang="less" scoped>
.list-page {
  min-height: 100vh;
  padding: 32px;
  background: #f4f7fb;
  color: #172033;
}

.test-shell {
  max-width: 1180px;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .list-page {
    padding: 16px;
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
