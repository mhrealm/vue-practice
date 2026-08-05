# 把三张卡片锁进一屏：用 GSAP 做 pinned 滚动叙事楼层

![alt text](image-1.png)

有些官网的产品页很会讲故事。

页面滚到某一段时，画面突然停住了。你继续滚，页面没有向下走，而是像一条时间线一样开始播放：卡片移动到中心、放大、图片和文字拉开距离，然后主角退场，背后的内容一层一层覆盖进来。等这一段讲完，卡片又回到原位，下一个卡片接着进入中心。

这类效果看起来像“页面在滚”，但它真正滚动的不是普通文档流，而是一个被 `pin` 住的固定舞台。鼠标滚轮只是用来推进 GSAP 时间轴的播放进度。

这次实现的 `Pinned 滚动叙事楼层` 就是这个思路：三张概览卡片横向排列，用户继续滚动时，每张卡片依次成为主角，并在同一屏里切换它对应的多个内容楼层。

## 先把结构想清楚

这个效果最容易写偏的地方，是把后续内容继续做成一个个普通楼层，然后用滚动跳到下一屏。这样虽然也能看到内容变化，但它已经不是 pinned narrative 了。

我这次把页面拆成三层：

```text
story-stage
  story-card-track    三张概览卡片
  story-panel-stack   所有内容楼层的叠放容器
    story-panel       内容楼层，absolute inset: 0
```

`story-scroll` 是负责撑开滚动距离的外层容器，`story-stage` 才是真正显示画面的粘性舞台。它使用 `position: sticky; top: 0;` 固定在视口内。卡片轨道和内容楼层都放在这个舞台内部，所以后续内容不会把页面撑高，也不会变成普通向下滚动的楼层。

内容楼层统一使用 `.story-panel`：

```css
.story-panel {
  position: absolute;
  inset: 0;
  opacity: 0;
  visibility: hidden;
}
```

动画里使用 GSAP 的 `autoAlpha` 控制它们，`autoAlpha: 0` 等价于透明并隐藏，`autoAlpha: 1` 才显示。这比只改 `opacity` 更稳，因为透明但仍然可见、可被读屏或拦截交互的元素，在复杂叠层里很容易制造奇怪问题。

## 配置数组是整个效果的骨架

这类动画不能把 DOM 和时间轴写死，否则第四张卡片、第五组内容一来，代码就会散。

所以页面里的卡片和内容都来自同一个 `storyGroups` 配置：

```ts
const storyGroups = [
  {
    id: 'signal',
    title: '城市信号',
    cardImage: '...',
    panels: [
      { id: 'map', title: '街区热度被压缩到一屏', image: '...' },
      { id: 'motion', title: '视频楼层进入时重新播放', video: '...' },
      { id: 'brief', title: '最后收束成行动摘要', image: '...' },
    ],
  },
]
```

模板只负责循环渲染：外层循环生成概览卡片，内层循环生成每个组对应的 `.story-panel`。动画初始化时再通过 `data-story-card` 和 `data-story-panel` 找到对应节点。

这样做有一个好处：动画流程只写一遍。每组内容有几张 panel、是否有视频、主题色是什么，都交给配置决定。后续扩展时，大部分时候只需要加数据。

## timeline 才是主线，不是点击事件

这个需求有一个很明确的限制：不要点击跳转，所有过程都由滚动推进。

所以核心不是写事件监听，而是搭建一条 scrub 时间轴。固定效果交给 CSS sticky，ScrollTrigger 只负责读取外层滚动容器的滚动进度：

```ts
const timeline = gsap.timeline({
  scrollTrigger: {
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
    invalidateOnRefresh: true,
  },
})
```

这里不再使用 `pin`。`start: 'top top'` 表示外层滚动容器顶部到达视口顶部时开始推进时间轴，`end: 'bottom bottom'` 表示外层滚动容器底部到达视口底部时结束。中间这段真实滚动距离由 `.story-scroll` 的高度提供，而 `.story-stage` 会在这段期间用 sticky 停在屏幕里。

每一张卡片的流程都被拆成同样的几个片段：

1. 其他卡片变暗，当前卡片移动到屏幕中心。
2. 当前卡片放大，图片上移，文字下移，制造“卡片被拆开”的感觉。
3. 卡片和卡片轨道淡出，把舞台交给内容楼层。
4. 当前组的 `.story-panel` 依次交叉淡入淡出。
5. 最后一张内容楼层隐藏，卡片重新出现并恢复原位。
6. 进入下一张卡片，重复同一套流程。

这里有一个小技巧：内容完全显示后，需要给用户一点继续阅读的滚动距离。代码里用了空 tween 作为停顿段：

```ts
timeline.to(panel, { autoAlpha: 1, duration: 0.48 }, '>')
timeline.to({}, { duration: 0.72 })
```

这个空 tween 不改变任何 DOM，只是占用时间轴长度。因为时间轴被 scroll scrub 控制，所以它对应的就是“继续滚一段，但画面保持当前内容”的阅读空间。

## 卡片移动到中心的难点

卡片初始是三列网格排布，第一张在左边，第二张在中间，第三张在右边。要让任意一张卡片移动到屏幕中心，不能直接写死 `x: 300` 或 `x: -300`，因为视口宽度、卡片宽度和响应式布局都会变。

实现里用函数动态计算偏移：

```ts
const getCenterX = (card: HTMLElement) => () => {
  const stageRect = stage.getBoundingClientRect()
  const cardRect = card.getBoundingClientRect()
  const currentX = Number(gsap.getProperty(card, 'x'))
  const cardCenter = cardRect.left - currentX + cardRect.width / 2

  return stageRect.left + stageRect.width / 2 - cardCenter
}
```

注意这里减掉了 `currentX`。因为 GSAP 动画过程中，元素可能已经有 transform，如果直接用 `getBoundingClientRect()` 的结果，很容易把当前 transform 也算进去，导致回滚或刷新后位置偏移。

再配合 `invalidateOnRefresh: true`，窗口尺寸变化时 ScrollTrigger 会重新计算函数值，移动距离不会被旧视口缓存住。

## 内容楼层为什么要叠起来

需求里强调“不要让后续内容作为普通楼层向下滚动”。这句话其实决定了布局方案。

如果每个内容都是一个普通 `section`，页面高度会被它们撑开。此时用户继续滚动，看到的是文档在往下走，而不是 pinned 区域内的场景切换。

所以所有内容都必须叠在同一个屏幕上：

```html
<div class="story-panel-stack">
  <section class="story-panel"></section>
  <section class="story-panel"></section>
  <section class="story-panel"></section>
</div>
```

每一层都是 `absolute inset: 0`。它们占据同一个舞台，只通过 `autoAlpha` 决定谁出现。当前内容完全显示后，继续滚动时下一层淡入，上一层淡出，整个过程仍然发生在同一屏。

这种结构还有一个额外好处：视觉上更像剪辑，而不是网页排版。你可以把它理解成一块固定屏幕，滚轮控制的是这块屏幕里的镜头切换。

## 视频楼层的处理

视频是这个效果里比较容易忽略的细节。

如果只是把视频放进某个 panel，当 panel 淡出以后，视频可能还在后台继续播放。用户回滚时，也可能看到视频从中间某个时间点继续播，而不是从头开始。这和“楼层进入显示时从头播放，离开或隐藏时暂停”的要求不一致。

这次的做法是：在时间轴 `onUpdate` 里检查当前可见的 panel。如果某个 panel 的透明度超过阈值，并且它里面有 video，就把它当成当前视频。

```ts
const visibleVideo =
  panels
    .map(panel => ({
      panel,
      opacity: Number(gsap.getProperty(panel, 'opacity')),
      video: panel.querySelector('video'),
    }))
    .filter(item => item.video && item.opacity > 0.65)
    .sort((a, b) => b.opacity - a.opacity)[0]?.video ?? null
```

当 `visibleVideo` 发生变化时，先暂停旧视频，再把新视频 `currentTime` 设为 `0` 并播放。离开 pinned 区域、回到 pinned 区域之前、组件卸载时，也会统一暂停所有视频。

这里视频加了 `muted` 和 `playsinline`，这是为了让浏览器更容易允许自动播放。即便如此，`video.play()` 仍然可能因为浏览器策略返回 rejected promise，所以代码里对播放失败做了兜底，不让它影响主动画。

## 滚动距离不是越长越好

粘性定位版本里，滚动距离由外层 `.story-scroll` 的高度决定，`ScrollTrigger` 的 `end: 'bottom bottom'` 只负责读取这段距离的终点。

如果距离太短，用户轻轻一滚，卡片和内容就飞快切完，看不清每一段。距离太长，又会让人觉得页面卡住了很久。

这里根据内容数量估算滚动距离，并把结果写成 CSS 变量：

```ts
const getStoryScrollDistanceVh = () => {
  const panelCount = storyGroups.reduce((total, group) => total + group.panels.length, 0)
  return Math.max((panelCount + storyGroups.length * 1.8) * 100, 720)
}
```

它不是一个绝对公式，只是给时间轴留出足够空间：panel 越多，滚动距离越长；同时设置一个最小值，避免内容少时动画太赶。页面里会把这个值作为 `--story-scroll-distance`，然后用 `height: calc(100vh + var(--story-scroll-distance))` 撑开外层容器。

做这种滚动叙事时，调 `duration` 和调 `end` 是一组工作。`duration` 决定各段在时间轴中的比例，`end` 决定用户需要滚多少真实距离才能走完这条时间轴。

## 清理比动画本身更重要

Vue 页面被切走时，如果不清理 ScrollTrigger，后面很容易出现残留 pin、重复触发、滚动距离异常这些问题。

实现里用了 `gsap.context` 包住所有动画：

```ts
animationContext = gsap.context(() => {
  // timeline and ScrollTrigger
}, page)
```

组件卸载时调用：

```ts
onBeforeUnmount(() => {
  pauseAllVideos()
  animationContext?.revert()
})
```

`revert()` 会把这个 context 里创建的动画和 ScrollTrigger 一起还原。对 Vue 单页应用来说，这一步非常关键。否则你第一次进入页面是正常的，切出去再回来，就可能发现滚动进度或元素 transform 变得不对。

## 这类效果的注意事项

第一，尽量不要混用 CSS `position: sticky` 和 ScrollTrigger `pin` 做同一个舞台。一个主控就够了，这里由 sticky 负责固定，ScrollTrigger 只负责动画进度，布局负责提供滚动距离和叠层结构。

第二，叠层内容要用 `visibility` 一起控制。只改 `opacity` 的隐藏元素依然在那儿，复杂页面里可能会遮挡鼠标、影响焦点，甚至让视频继续处于活跃状态。

第三，所有用于计算位置的值都要考虑响应式。卡片居中这件事看起来简单，但只要有网格、缩放、窗口变化，就不要写死位移。

第四，视频不要只在动画某个时间点 `play()` 一次。scrub 动画可以前进也可以后退，用户可能停在任意进度，所以更可靠的方式是根据“当前哪个 panel 可见”同步视频状态。

第五，时间轴越长，越要保持 DOM 层级清楚。卡片层、内容层、背景层分开，会比在同一个元素上不断切换 z-index 更容易维护。

## 写在最后

这个效果的关键不是某一个 GSAP API，而是先承认它本质上不是普通页面滚动。

普通页面滚动关心的是“下一个楼层在哪里”；pinned 滚动叙事关心的是“同一个舞台的下一个状态是什么”。一旦这个思路转过来，结构就会清楚很多：主容器 pin 住，内容绝对叠放，timeline 负责调度，滚轮只负责推进时间。

后续如果要扩展，可以继续往 `storyGroups` 里加第四张卡片，也可以让某个组拥有更多 panel。只要每组仍然遵守“卡片入场 -> 内容切换 -> 卡片复位”的节奏，整套滚动叙事就能保持稳定。
