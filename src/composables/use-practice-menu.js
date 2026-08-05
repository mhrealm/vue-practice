import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { groupMenuItems, routeToMenuItem } from '@/utils/practice-menu'

// 将自动路由表转换成首页需要的菜单数据，避免入口页关心路由细节。
export const usePracticeMenu = () => {
  const router = useRouter()

  const menuList = computed(() => {
    return (
      router
        .getRoutes()
        // 只有配置了 title 的页面才出现在首页菜单中。
        .filter(route => route.meta && route.meta.title)
        .map(routeToMenuItem)
    )
  })

  const menuGroups = computed(() => groupMenuItems(menuList.value))

  return {
    menuList,
    menuGroups
  }
}
