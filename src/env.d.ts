// src/env.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // 声明.vue文件的类型为Vue组件
  const component: DefineComponent<{}, {}, any>
  export default component
}
declare module '~pages' {
  import type { RouteRecordRaw } from 'vue-router'
  const routes: RouteRecordRaw[]
  export default routes
}

declare module '*.less' {
  const content: any;
  export default content;
}
