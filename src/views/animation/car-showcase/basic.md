# Vue + Three.js 实现 3D 汽车展示基础版

## 前言

最近在做一个汽车 3D 产品展示案例，技术栈是 `Vue 3 + Three.js`。

这个系列我拆成两个版本：

1. 基础版：加载模型、搭建展台、自动旋转、切换车漆；
2. 交互版：开车门、开前备箱、开尾翼、车轮旋转、灯光控制、SSAO、车顶颜色、轮毂样式。

这篇先讲基础版。

对应源码：

```text
src/views/animation/car-showcase/basic.vue
```

模型目标路径：

```text
src/views/animation/car-showcase/models/chevrolet-corvette-c8.glb
```

模型来源：

[Animated Chevrolet C8 Model - Sketchfab](https://sketchfab.com/3d-models/animated-chevrolet-c8-model-91d39ff24d6c4e7b83674411f9c5bb67)

这个模型是 `CC Attribution` 授权，使用时需要保留作者署名。当前项目已经把运行时使用的 GLB 放到了当前案例的 `models` 文件夹下，模型和页面代码放在一起，后续移动、删除、写说明都会更直观。

## 基础版做什么？

基础版先不急着做车门、尾翼这些交互，只保留最核心的展示能力：

1. 创建 Three.js 场景；
2. 加载 `.glb` 车模；
3. 让模型自动适配展台；
4. 添加灯光和环境反射；
5. 通过色卡切换车漆颜色；
6. 页面卸载时清理 WebGL 资源。

初学 Three.js 的时候，先把这条主线跑通非常重要。因为后面的所有交互，其实都是建立在“模型已经被正确加载并组织好”这个基础上的。

## 页面结构

DOM 结构非常简单：

```vue
<template>
  <main class="car-showcase-page">
    <div ref="sceneHostRef" class="showcase-canvas"></div>

    <section class="showcase-copy">
      <!-- 车型文案 -->
    </section>

    <section class="paint-panel">
      <!-- 车漆色卡 -->
    </section>
  </main>
</template>
```

这里有一个重要思路：3D 归 3D，DOM 归 DOM。

`showcase-canvas` 只负责挂载 Three.js 生成的 canvas。车型标题、参数、按钮还是用普通 DOM 写。这样代码更清晰，布局也更好控制。

## 模型路径

代码里用了一个模型地址：

```ts
const corvetteModelUrl = new URL('./models/chevrolet-corvette-c8.glb', import.meta.url).href
```

`corvetteModelUrl` 指向当前组件旁边的 `models/chevrolet-corvette-c8.glb`。

为什么放在当前案例目录？

因为这个模型只服务于 `car-showcase` 这个案例，不是全站公共资源。放到当前案例目录后，Vite 会把它当成模块资源处理，最终构建时自动生成正确的资源地址。

写法是：

```ts
new URL('./models/chevrolet-corvette-c8.glb', import.meta.url)
```

这种写法的好处是路径跟着文件走。以后如果把整个 `car-showcase` 文件夹移动到别处，模型路径也不容易散。

目录结构大致是：

```text
car-showcase/
├─ basic.vue
├─ interactive.vue
└─ models/
   └─ chevrolet-corvette-c8.glb
```

这样模型资源不会混到 `public` 里。

## 加载模型

基础版的加载逻辑是：

```ts
const loadCarModel = async () => {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(corvetteModelUrl)
}
```

现在代码直接加载 C8。因为模型已经进入案例目录，继续保留备用模型反而会让主线变复杂。

这里的兜底不是为了偷懒，而是为了让案例在模型缺失时也能继续调试场景、灯光、材质和布局。等真实模型放进去后，逻辑不需要改。

## 创建场景

Three.js 最核心的三个对象是：

```ts
scene = new THREE.Scene()
camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
renderer = new THREE.WebGLRenderer({ antialias: true })
```

可以这样理解：

1. `scene` 是 3D 世界；
2. `camera` 是观察这个世界的眼睛；
3. `renderer` 是把 3D 世界画成 canvas 的渲染器。

初始化完成后，把 canvas 挂到 Vue 的容器里：

```ts
host.appendChild(renderer.domElement)
```

## 色彩空间和色调映射

代码里有几行很关键：

```ts
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.03
```

`outputColorSpace` 会影响颜色在浏览器里的显示。如果不处理，模型颜色可能偏灰或者不准。

`toneMapping` 可以理解成把 3D 渲染中的高光和暗部映射成屏幕上更舒服的颜色。汽车展示很依赖高光，所以这里用了 `ACESFilmicToneMapping`。

`toneMappingExposure` 是曝光值。过高会让车漆高光炸白，过低又会显得没质感，所以这里设置得比较克制。

## 环境反射

汽车车漆是否真实，很大程度取决于反射。

基础版使用 `RoomEnvironment` 生成环境贴图：

```ts
const pmremGenerator = new THREE.PMREMGenerator(renderer)
environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04)
scene.environment = environmentMap.texture
pmremGenerator.dispose()
```

`scene.environment` 可以理解成“周围环境的反光来源”。

车漆、玻璃、金属这些材质都会从环境贴图里拿到反射信息。如果没有它，车身会显得很平，像普通彩色模型。

## 模型适配展台

不同来源的 3D 模型尺寸差别很大，有的按米建模，有的按厘米建模，原点也不一定在车身中心。

所以加载模型后，要统一做三件事：

```ts
const box = new THREE.Box3().setFromObject(model)
const size = box.getSize(new THREE.Vector3())
const maxSize = Math.max(size.x, size.y, size.z)

model.scale.setScalar(5.4 / maxSize)
```

第一步：用 `Box3` 获取模型包围盒。

第二步：根据最长边把模型缩放到合适大小。

第三步：居中并贴地：

```ts
const centeredBox = new THREE.Box3().setFromObject(model)
const center = centeredBox.getCenter(new THREE.Vector3())
model.position.sub(center)

const finalBox = new THREE.Box3().setFromObject(model)
model.position.y -= finalBox.min.y
```

这样无论原模型大小如何，都能比较稳定地放进当前展台。

## 车漆材质

汽车车漆不能简单地用纯色覆盖。

如果直接这样写：

```ts
new THREE.MeshPhysicalMaterial({
  color: '#9b171b',
})
```

车身很容易变成一整块塑料。

更好的方式是基于原模型材质创建新材质，并尽量保留原始贴图：

```ts
const material = new THREE.MeshPhysicalMaterial({
  color,
  map: source?.map || null,
  metalnessMap: source?.metalnessMap || null,
  roughnessMap: source?.roughnessMap || null,
  normalMap: source?.normalMap || null,
  aoMap: source?.aoMap || null,
  metalness: 0.48,
  roughness: 0.3,
  clearcoat: 1,
  clearcoatRoughness: 0.07,
  envMapIntensity: 1.35,
})
```

这里几个参数可以简单理解为：

1. `metalness`：金属感；
2. `roughness`：粗糙度；
3. `clearcoat`：清漆层；
4. `clearcoatRoughness`：清漆层粗糙度；
5. `envMapIntensity`：环境反射强度。

汽车漆面不是纯金属，也不是纯塑料，而是底色上覆盖一层清漆。所以 `clearcoat` 对车漆质感很重要。

## 如何识别车身？

模型内部节点名不一定统一，所以代码用了关键词判断：

```ts
const paintKeywords = ['paint', 'body', 'carpaint', 'car_paint', 'exterior', 'corvette', 'c8']
const ignorePaintKeywords = ['glass', 'window', 'tire', 'tyre', 'rubber', 'rim', 'wheel', 'light', 'lamp']
```

遍历 Mesh 时，把节点名和材质名拼起来：

```ts
const text = `${mesh.name} ${material?.name || ''}`.toLowerCase()
```

如果命中 `paint/body/exterior`，同时没有命中 `glass/wheel/light`，就把它当成车身。

这种方式不是绝对完美，但对教学案例很友好。真实项目里，最好还是下载模型后打印节点树，再按实际节点名精确匹配。

## 切换车漆

色卡点击后只做一件事：

```ts
bodyMaterial?.color.set(paint.color)
```

这里没有重新加载模型，也没有重新创建材质。

因为所有车身 Mesh 都共用同一个 `bodyMaterial`，所以只要改这一份材质颜色，整辆车的车身都会同步变化。

## 渲染循环

Three.js 动画依赖 `requestAnimationFrame`：

```ts
const renderScene = () => {
  carGroup?.rotateY(0.002)
  controls?.update()
  renderer.render(scene, camera)

  animationFrameId = window.requestAnimationFrame(renderScene)
}
```

每一帧做三件事：

1. 让整车轻微自转；
2. 更新 OrbitControls 的阻尼；
3. 渲染当前画面。

`controls.enableDamping = true` 后，必须每帧调用 `controls.update()`，否则拖拽缓动不会生效。

## 资源清理

Three.js 资源不会随着 Vue 组件销毁自动释放。

所以卸载时需要处理：

```ts
window.cancelAnimationFrame(animationFrameId)
window.removeEventListener('resize', handleResize)
controls?.dispose()
disposeObject(scene)
environmentMap?.dispose()
renderer?.dispose()
renderer?.domElement.remove()
```

其中 `disposeObject` 会遍历场景里的 Mesh，释放几何体和材质：

```ts
object.traverse(child => {
  if (!(child instanceof THREE.Mesh)) {
    return
  }

  child.geometry.dispose()
  disposeMaterial(child.material, disposedMaterials)
})
```

在 SPA 项目里，这一步非常重要。否则来回切换路由后，WebGL 资源可能一直留在内存里。

## 放在最后的话

基础版看起来只是“加载一辆车”，但里面已经包含了 Three.js 产品展示的核心判断：

为什么模型路径要考虑构建？

为什么加载后要重新计算尺寸？

为什么车漆不能简单替换成纯色？

为什么环境反射比多加几盏灯更重要？

为什么离开页面时还要手动释放资源？

AI 可以很快生成一段能跑的 Three.js 代码，但能不能把它改成业务真正需要的样子，还是取决于我们是否理解这些细节。

基础版解决“车能不能稳定展示”的问题。

交互版再解决“车能不能被用户操作”的问题。
