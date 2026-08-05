import { createApp } from 'vue'
import router from '@/router/index' // 导入路由配置
import App from './App.vue'
let app = createApp(App)


// 定义全局方法
app.config.globalProperties.$showToast = (message: any) => {
  alert(`提示：${message}`)
}

// 使用provide 全局注入方法
app.provide('$sayHello', (name: any) => {
  alert(`hello：${name}`)
})

app.use(router).mount('#app')
