# Vue Vite Practice

一个基于 **Vue 3 + Vite + TypeScript** 的前端练习项目，用来沉淀 Vue 基础交互、自动路由、GSAP 滚动动画、3D 可视化和 CSS 3D 动效示例。

项目首页会读取 `src/views` 下的路由信息，并根据页面中的 `meta` 配置自动生成练习入口。

## 技术栈

- Vue 3
- Vite 7
- TypeScript
- Vue Router 4
- vite-plugin-pages
- Less
- GSAP / ScrollTrigger
- Three.js / globe.gl

## 快速开始

项目中已有 `pnpm-lock.yaml`，建议优先使用 `pnpm` 安装依赖。

```bash
pnpm install
pnpm dev
```

启动后访问终端输出的本地地址，通常是：

```text
http://localhost:5173/
```

## 常用命令

```bash
# 启动开发服务
pnpm dev

# 类型检查并构建生产包
pnpm build

# 本地预览生产构建结果
pnpm preview
```

如果使用 `npm`，也可以执行：

```bash
npm install
npm run dev
```

## 目录结构

```text
vue-vite-practice/
├─ public/                  # 静态资源
├─ src/
│  ├─ assets/               # Vite 模板资源
│  ├─ components/           # 可复用组件
│  │  └─ issues/            # Vue 问题示例组件
│  ├─ images/               # 页面使用的图片资源
│  ├─ router/               # 路由入口
│  ├─ styles/               # 全局 Less 变量
│  ├─ views/                # 页面练习集合，自动生成路由
│  │  ├─ index.vue          # 首页菜单
│  │  ├─ [...all].vue       # 404 页面
│  │  ├─ canvas-sequence/   # Canvas 序列帧滚动练习
│  │  ├─ earth-section/     # 3D 地球仪练习
│  │  ├─ floor-change/      # 滚动楼层切换练习
│  │  ├─ gsap-basics/       # GSAP ScrollTrigger 基础练习
│  │  ├─ hover-navbar/      # 导航 Hover 高亮练习
│  │  ├─ issues/            # Vue 基础问题练习
│  │  ├─ jquery-effects/    # jQuery 交互动效练习
│  │  └─ tilt-card/         # 鼠标跟随倾斜卡片练习
│  ├─ App.vue
│  ├─ env.d.ts
│  └─ main.ts
├─ index.html
├─ package.json
├─ tsconfig*.json
└─ vite.config.ts
```

## 路由机制

项目通过 `vite-plugin-pages` 自动扫描 `src/views` 目录生成路由：

```ts
Pages({
  dirs: 'src/views',
  extensions: ['vue'],
  importMode: 'async',
})
```

`src/router/index.ts` 会导入 `~pages` 并创建 Vue Router：

```ts
import routes from '~pages'

const router = createRouter({
  history: createWebHistory(),
  routes: [...routes],
})
```

如果希望页面出现在首页菜单中，需要在页面里补充 `route meta`：

```vue
<route lang="json">
{
  "meta": {
    "title": "鼠标跟随倾斜",
    "category": "animation",
    "tag": "动效"
  }
}
</route>
```

首页 `src/views/index.vue` 会读取所有路由，筛选带 `meta.title` 的页面并渲染为练习入口。

## 当前练习页面

| 模块         | 说明                                                   |
| ------------ | ------------------------------------------------------ |
| 首页菜单     | 自动读取路由 `meta`，展示练习入口                      |
| 3D 地球仪    | 基于 `globe.gl`、Three.js 和 GSAP 的地球滚动动效示例   |
| Canvas 序列帧滚动 | 基于 Canvas 和 GSAP ScrollTrigger 的滚动序列帧动画 |
| GSAP 基础 | 演示 GSAP 位移动画和 ScrollTrigger 滚动触发 |
| Hover 高亮导航 | 鼠标悬停时跟随菜单项移动的导航高亮效果 |
| jQuery 交互动效 | 演示 jQuery 基础事件、样式、动画和打字机效果 |
| 鼠标跟随倾斜 | 基于鼠标位置计算 `rotateX` / `rotateY` 的 CSS 3D 卡片  |
| 滚动楼层切换 | 基于 GSAP ScrollTrigger 的滚动分屏切换动画             |
| 全局方法     | 演示 `app.config.globalProperties` 和 `provide/inject` |
| 键盘事件     | 演示 Vue 内置键盘修饰符、自定义组合键和全局键盘监听    |
| 强制刷新组件 | 演示通过 `key` 和 `v-if + nextTick` 重新渲染组件       |
| 404 页面     | 捕获未匹配路由并返回首页                               |

## 新增练习页面

1. 在 `src/views` 下新增页面文件或目录，例如：

```text
src/views/example/index.vue
```

2. 编写页面组件。

3. 添加 `route meta`，让首页菜单可以展示这个练习：

```vue
<route lang="json">
{
  "meta": {
    "title": "示例练习",
    "category": "Vue",
    "tag": "基础"
  }
}
</route>
```

4. 启动开发服务，在首页点击对应入口验证效果。

## 全局配置

### 路径别名

`vite.config.ts` 和 `tsconfig.json` 中都配置了 `@` 指向 `src`：

```ts
import Demo from '@/components/Demo.vue'
```

### Less 全局变量

Vite 会给所有 Less 文件注入：

```less
@import "@/styles/variables.less";
```

页面或组件中可以直接使用 `variables.less` 中定义的变量。

### 全局方法示例

`src/main.ts` 中注册了两个示例能力：

- `$showToast`：通过 `app.config.globalProperties` 挂载的全局方法
- `$sayHello`：通过 `provide` 注入的全局方法

对应示例在 `src/views/issues/global-methods.vue`。

## 命名整理建议

项目当前已经从 `hello-*` 方向调整为更清晰的练习仓库命名，建议后续继续保持：

- 父目录：`frontend-practice-lab`
- 当前项目：`vue-vite-practice`
- React 项目：`practice-react`

后续可逐步优化：

- 给 `src/views/floor-change/index.vue` 补充 `route meta`，让它稳定出现在首页菜单中。
- 页面目录命名保持 2 个单词以内，例如 `gsap-basics`、`hover-navbar`。
- 如果历史 Markdown 或注释里出现中文乱码，统一转换为 UTF-8 编码。

## 开发注意事项

- 新页面优先放在 `src/views`，依靠自动路由生成访问路径。
- 需要展示在首页的练习必须配置 `meta.title`。
- 使用动画库时注意在组件卸载时清理事件监听、定时器和第三方实例。
- 运行 `pnpm build` 可以同时做 TypeScript 检查和生产构建。
