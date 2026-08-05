<template>
  <div class="flex-gap-column-10">
    <button @click="handleShowToastClick">点击触发全局提示</button>
    <button @click="handleSayHello">点击说hello</button>
  </div>
</template>

<script setup>
import { getCurrentInstance, inject } from 'vue'
// 获取全局方法
const { proxy } = getCurrentInstance()
const $sayHello = inject('$sayHello')

const handleSayHello = () => {
  $sayHello('张三')
}

const handleShowToastClick = () => {
  const time = new Date(Date.now()).toLocaleString()
  proxy.$showToast(`当前时间：${time}`)
}
</script>

<style lang="less" scoped></style>


<route lang="json">{
  "meta": {
    "title": "如何定义全局的方法？",
    "category": "Vue",
    "tag": "基础交互"
  }
}</route>