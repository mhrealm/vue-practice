# Vue Vite Practice

一个基于 **Vue 3 + Vite + TypeScript** 的前端练习项目，用来沉淀 Vue 基础能力、JavaScript 实战、Canvas 示例、CSS 效果、交互组件、GSAP 动画、性能优化和经典官网效果复刻。

项目首页会读取 `src/views` 下自动生成的路由，并根据页面中的 `meta` 配置生成练习入口。

## 技术栈

- Vue 3
- Vite 7
- TypeScript
- Vue Router 4
- vite-plugin-pages
- Less
- GSAP / ScrollTrigger
- Three.js / globe.gl
- Canvas
- jQuery

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
├─ public/                      # 静态资源
├─ src/
│  ├─ assets/                   # Vite 模板资源
│  ├─ components/               # 可复用组件
│  │  ├─ issues/                # Vue 问题示例组件
│  │  └─ practice-menu/         # 首页练习菜单
│  ├─ composables/              # 组合式函数
│  ├─ constants/                # 常量配置
│  ├─ images/                   # 页面使用的图片资源
│  ├─ router/                   # 路由入口
│  ├─ styles/                   # 全局 Less 变量
│  ├─ utils/                    # 工具函数
│  ├─ views/                    # 页面练习集合，自动生成路由
│  │  ├─ index.vue              # 首页菜单
│  │  ├─ [...all].vue           # 404 页面
│  │  ├─ animation/             # 动画动效与滚动时间线
│  │  │  ├─ background-shake/
│  │  │  ├─ car-showcase/
│  │  │  ├─ flip-clock/
│  │  │  ├─ floor-change/
│  │  │  ├─ gsap-basics/
│  │  │  └─ photo-album/
│  │  ├─ canvas/                # Canvas 练习
│  │  │  ├─ basic-shapes/
│  │  │  ├─ canvas-sequence/
│  │  │  ├─ orbit-animation/
│  │  │  ├─ signature/
│  │  │  └─ transform/
│  │  ├─ classic-replica/       # 经典复刻系列
│  │  │  ├─ earth-section/
│  │  │  ├─ pinned-story/
│  │  │  └─ qa-session/
│  │  ├─ css-effects/           # CSS 布局与视觉效果
│  │  │  ├─ blend-mode/
│  │  │  └─ text-ellipsis/
│  │  ├─ interaction/           # 交互组件与页面行为
│  │  │  ├─ hover-navbar/
│  │  │  ├─ jquery-effects/
│  │  │  ├─ load-refresh/
│  │  │  ├─ refresh/
│  │  │  ├─ slide/
│  │  │  └─ tilt-card/
│  │  ├─ javascript/            # JavaScript 实战
│  │  │  ├─ async-delay/
│  │  │  └─ map-usage/
│  │  ├─ performance/           # 性能优化示例
│  │  │  ├─ lazy-image/
│  │  │  ├─ preload-image/
│  │  │  ├─ skeleton-screen/
│  │  │  └─ virtual-list/
│  │  └─ vue/                   # Vue 基础能力练习
│  │     ├─ component-refresh/
│  │     ├─ global-methods/
│  │     └─ keyboard-events/
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

如果希望页面出现在首页菜单中，需要在页面中补充 `route meta`：

```vue
<route lang="json">
{
  "meta": {
    "title": "示例练习",
    "category": "Vue 基础",
    "tag": "基础",
    "difficulty": 1
  }
}
</route>
```

首页菜单会筛选带 `meta.title` 的路由。菜单分组以 `src/views` 下的一级目录为基础，展示文案优先使用页面里的 `meta.category`。`meta.difficulty` 表示案例难度，范围为 1-5 星。

## 当前练习页面

| 分类            | 页面                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------- |
| 经典复刻        | 3D 地球仪、Pinned 滚动叙事楼层、网易音乐七夕活动复刻                                      |
| 动画动效        | 背景抖动、3D glTF 汽车产品展示、楼层转场动画、GSAP ScrollTrigger 基础、相册动画、翻页时钟 |
| 交互组件        | Hover 高亮导航、jQuery 交互动效、加载与刷新、滚动加载、滑动交互、鼠标跟随倾斜             |
| CSS 布局与效果  | 混合模式、文本省略                                                                        |
| Canvas 实验     | Canvas 基础图形、Canvas 序列帧滚动、Canvas 轨道动画、Canvas 电子签名、Canvas 变形         |
| JavaScript 实战 | 异步调用与延迟执行、Map 管理列表选择                                                      |
| 性能优化        | 图片懒加载、图片预加载、骨架屏、虚拟列表                                                  |
| Vue 基础        | 全局方法、强制刷新组件、键盘事件                                                          |

## 掘金文章源码索引

下面链接可以直接用于掘金文章中的“源码地址”引用。

**经典复刻**

- [3D 地球仪](https://github.com/mhrealm/vue-practice/blob/master/src/views/classic-replica/earth-section/index.vue)
- [Pinned 滚动叙事楼层](https://github.com/mhrealm/vue-practice/blob/master/src/views/classic-replica/pinned-story/index.vue)
- [网易音乐七夕活动复刻](https://github.com/mhrealm/vue-practice/blob/master/src/views/classic-replica/qa-session/index.vue)

**animation**

- [背景抖动](https://github.com/mhrealm/vue-practice/blob/master/src/views/animation/background-shake/index.vue)
- [3D glTF 汽车展示基础版](https://github.com/mhrealm/vue-practice/blob/master/src/views/animation/car-showcase/basic.vue)
- [3D glTF 汽车交互展示](https://github.com/mhrealm/vue-practice/blob/master/src/views/animation/car-showcase/interactive.vue)
- [翻页时钟](https://github.com/mhrealm/vue-practice/blob/master/src/views/animation/flip-clock/index.vue)
- [滚动楼层切换](https://github.com/mhrealm/vue-practice/blob/master/src/views/animation/floor-change/index.vue)
- [GSAP ScrollTrigger 基础](https://github.com/mhrealm/vue-practice/blob/master/src/views/animation/gsap-basics/index.vue)
- [相册动画](https://github.com/mhrealm/vue-practice/blob/master/src/views/animation/photo-album/index.vue)

**css-effects**

- [混合模式](https://github.com/mhrealm/vue-practice/blob/master/src/views/css-effects/blend-mode/index.vue)
- [文本省略](https://github.com/mhrealm/vue-practice/blob/master/src/views/css-effects/text-ellipsis/index.vue)

**interaction**

- [Hover 高亮导航](https://github.com/mhrealm/vue-practice/blob/master/src/views/interaction/hover-navbar/index.vue)
- [jQuery 交互动效](https://github.com/mhrealm/vue-practice/blob/master/src/views/interaction/jquery-effects/index.vue)
- [加载与刷新](https://github.com/mhrealm/vue-practice/blob/master/src/views/interaction/load-refresh/index.vue)
- [滚动加载](https://github.com/mhrealm/vue-practice/blob/master/src/views/interaction/refresh/index.vue)
- [滑动交互](https://github.com/mhrealm/vue-practice/blob/master/src/views/interaction/slide/index.vue)
- [鼠标跟随倾斜](https://github.com/mhrealm/vue-practice/blob/master/src/views/interaction/tilt-card/index.vue)

**canvas**

- [Canvas 基础图形](https://github.com/mhrealm/vue-practice/blob/master/src/views/canvas/basic-shapes/index.vue)
- [Canvas 序列帧滚动](https://github.com/mhrealm/vue-practice/blob/master/src/views/canvas/canvas-sequence/index.vue)
- [Canvas 轨道动画](https://github.com/mhrealm/vue-practice/blob/master/src/views/canvas/orbit-animation/index.vue)
- [Canvas 电子签名](https://github.com/mhrealm/vue-practice/blob/master/src/views/canvas/signature/index.vue)
- [Canvas 变形](https://github.com/mhrealm/vue-practice/blob/master/src/views/canvas/transform/index.vue)

**javascript**

- [异步调用与延迟执行](https://github.com/mhrealm/vue-practice/blob/master/src/views/javascript/async-delay/index.vue)
- [Map 管理列表选择](https://github.com/mhrealm/vue-practice/blob/master/src/views/javascript/map-usage/index.vue)
- [Map 实战：响应式勾选示例](https://github.com/mhrealm/vue-practice/blob/master/src/views/javascript/map-usage/MapDemo.vue)
- [Map 实战：数组勾选对比示例](https://github.com/mhrealm/vue-practice/blob/master/src/views/javascript/map-usage/NormalDemo.vue)
- [Map 实战：合并订单编辑状态](https://github.com/mhrealm/vue-practice/blob/master/src/views/javascript/map-usage/OrderMerge.vue)

**performance**

- [图片懒加载](https://github.com/mhrealm/vue-practice/blob/master/src/views/performance/lazy-image/index.vue)
- [图片预加载](https://github.com/mhrealm/vue-practice/blob/master/src/views/performance/preload-image/index.vue)
- [骨架屏](https://github.com/mhrealm/vue-practice/blob/master/src/views/performance/skeleton-screen/index.vue)
- [虚拟列表](https://github.com/mhrealm/vue-practice/blob/master/src/views/performance/virtual-list/VirtualList.vue)
- [普通列表](https://github.com/mhrealm/vue-practice/blob/master/src/views/performance/virtual-list/NormalList.vue)

**vue**

- [如何监听键盘事件？](https://github.com/mhrealm/vue-practice/blob/master/src/views/vue/keyboard-events/index.vue)
- [如何定义全局的方法？](https://github.com/mhrealm/vue-practice/blob/master/src/views/vue/global-methods/index.vue)
- [怎么实现强制刷新组件？](https://github.com/mhrealm/vue-practice/blob/master/src/views/vue/component-refresh/index.vue)

## 新增练习页面

1. 在 `src/views` 下选择合适分类目录，例如：

```text
src/views/animation/example/index.vue
```

2. 编写页面组件。

3. 添加 `route meta`，让首页菜单可以展示这个练习：

```vue
<route lang="json">
{
  "meta": {
    "title": "示例练习",
    "category": "动画动效",
    "tag": "Demo",
    "difficulty": 3
  }
}
</route>
```

4. 启动开发服务，在首页点击对应入口验证效果。

如果是官网、营销活动、交互案例复刻，优先放到：

```text
src/views/classic-replica/
```

并使用：

```json
"category": "经典复刻"
```

如果是按钮、导航、滑动、刷新、鼠标响应这类页面行为，优先放到：

```text
src/views/interaction/
```

并使用：

```json
"category": "交互组件"
```

如果是文本省略、混合模式、布局技巧这类 CSS 方案，优先放到：

```text
src/views/css-effects/
```

并使用：

```json
"category": "CSS 布局与效果"
```

如果是图片懒加载、资源预加载、首屏加载、渲染优化这类性能相关示例，优先放到：

```text
src/views/performance/
```

并使用：

```json
"category": "性能优化"
```

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

对应示例在 `src/views/vue/global-methods/index.vue`。

## 开发注意事项

- 新页面优先放在 `src/views` 下，依靠自动路由生成访问路径。
- 需要展示在首页的练习必须配置 `meta.title`。
- 一级目录会影响首页菜单分组，动效放到 `animation`，交互放到 `interaction`，CSS 方案放到 `css-effects`，复刻类案例放到 `classic-replica`，性能类案例放到 `performance`。
- 从 React 示例迁移来的页面统一改成 Vue SFC，样式优先内联到 `.vue` 中。
- 使用动画库、滚动监听、定时器、IntersectionObserver 或第三方实例时，组件卸载时要清理。
- 运行 `pnpm build` 可以同时做 TypeScript 检查和生产构建。
