<template>
  <div class="question-answer-session">
    <Version2 />
  </div>
</template>

<script setup lang="ts">
import Version2 from './version-2.vue'
</script>

<style scoped>
.question-answer-session {
  min-height: 100vh;
  overflow: hidden;
}
</style>

<route lang="json">{
  "meta": {
    "title": "问答会话",
    "category": "function",
    "tag": "qa-session"
  }
}</route>
