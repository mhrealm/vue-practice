# 使用虚拟滚动究竟能提升页面多少性能？

## 前言

虚拟滚动的场景你用的多吗？

## 手搓一个虚拟滚动

如果你对于虚拟滚动已经非常熟悉了，那就直接看后面内容吧！这一节主要介绍代码实现过程中的注意事项。

#### 构建DOM和CSS

对于DOM和CSS部分这里不过多的介绍了，会附上相应的代码。绘制的页面大概是这样的。
![alt text](image-1.png)

```vue
<template>
  <main class="list-page">
    <section class="list-shell">
      <header class="list-header">
        <h1>虚拟列表</h1>
        <span>{{ total }} 条数据，仅渲染 {{ showData.length }} 个节点</span>
      </header>
      <div class="list-view" @scroll="onScroll">
        <ul class="list-space" :style="{ height: `${fullHeight}px` }">
          <li v-for="item in showData" key="item.id" class="list-item">
            <strong>#{{ item.id }}</strong>
            <span>{{ item.title }}</span>
            <em>{{ item.status }}</em>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style lang="less" scoped>
.list-page {
  padding: 32px;
  background: #f4f7fb;
  color: #172033;
}

.list-shell {
  max-width: 980px;
  margin: 0 auto;
  border: 1px solid #d8e1ee;
  border-radius: 8px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 18px 40px rgb(33 56 96 / 10%);
}

.list-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.list-header p,
.list-header h1 {
  margin: 0;
}

.list-header p {
  color: #64748b;
  font-size: 13px;
}

.list-header h1 {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 700;
}

.list-header span {
  color: #2563eb;
  font-size: 14px;
}

.list-view {
  height: 520px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 20px;
}

.list-space {
  position: relative;
}

.list-body {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  margin: 0;
  padding: 8px;
  list-style: none;
  will-change: transform;
}

.list-item {
  display: grid;
  grid-template-columns: 90px 1fr 82px;
  align-items: center;
  box-sizing: border-box;
  height: 56px;
  margin-bottom: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 0 16px;
}

.list-item strong {
  color: #0f172a;
}

.list-item span {
  min-width: 0;
  overflow: hidden;
  color: #475569;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-item em {
  justify-self: end;
  color: #0f766e;
  font-style: normal;
}
</style>

```

#### js部分

第一步：mock 数据

```js
let listData = Array.from({ length: total }, (_, index) => ({
  id: index + 1,
  title: `订单渲染任务 ${index + 1}`,
  status: index % 3 === 0 ? '待处理' : index % 3 === 1 ? '执行中' : '已完成',
}))
```

第二步：获取滚动高度

获取滚动高度的目的是为了实时替换展示的数据。

```js
const scrollTop = ref(0)

const onScroll = (e: Event) => {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}
```

第三步：滚动的过程中拿到最新的数据

```js
const total = 10000
const rowHeight = 64
const viewHeight = 520

const fullHeight = total * rowHeight
const start = computed(() => Math.max(Math.floor(scrollTop.value / rowHeight), 0))
const showCount = computed(() => Math.ceil(viewHeight / rowHeight))
const end = computed(() => Math.min((showCount.value + start.value), total))
const showData = computed(() => listData.slice(start.value, end.value))
```

解释：

1. fullHeight： 填充高度，目的是撑起内容，显示滚动条。
2. showData：需要展示的数据，这里是截取开始的那一条数据到结束的那一条数据。
3. start：开始展示的数据条数 = 滚动的高度 / 单条数据的高度。
4. showCount：视口数据条数 = 视口的高度 / 单条数据的高度。
5. end：结束条数 = 视口数据条数 + 开始展示的数据条数

如果你代码已经实现到这一步，你会在滚动页面的时候看到数据消失了，但是list-space中的DOM在不断的被替换。这是由于没有设置moveY。。。。

图解

## 这张图把 moveY 的作用压成一句话：slice 删除了前面的行，moveY 负责把这段被渲染的 DOM 再往下补回原来的高度位置。

示例：scrollTop = 640px，rowHeight = 64px，start = 10
moveY 的作用：补回前面 10 行被 slice 掉后丢失的高度。

![alt text](image.png)

## 完整代码

## 结束语
