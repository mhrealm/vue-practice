<template>
  <div class="not-found">
    <h1>404</h1>
    <p>抱歉，您访问的页面不存在。</p>
    <router-link to="/">返回首页</router-link>
  </div>
</template>

<script setup lang="ts">

</script>

<style scoped>
.not-found {
  text-align: center;
  margin-top: 100px;
}

h1 {
  font-size: 80px;
  color: #42b983;
}
</style>