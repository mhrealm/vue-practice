<template>
  <PracticeMenu :groups="menuGroups" />
</template>

<script setup>
import PracticeMenu from '@/components/practice-menu/PracticeMenu.vue'
import { usePracticeMenu } from '@/composables/use-practice-menu'

// 首页只负责接入菜单数据和渲染菜单组件，新增练习页时不需要改这里。
const { menuGroups } = usePracticeMenu()
</script>
