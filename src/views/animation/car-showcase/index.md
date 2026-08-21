# 如何使用 Vue + Three.js 实现一个 3D 汽车产品展示？

## 前言

最近在做一个 3D 汽车产品展示的小案例，技术栈是 `Vue 3 + Three.js`。

一开始我尝试过用 Three.js 的基础几何体手动拼一辆车：车身用盒子，轮胎用圆柱，玻璃用自定义几何体。这个方式很适合入门，因为能快速理解 `Mesh`、`Geometry`、`Material` 的关系。

但是它有一个明显的问题：看起来像玩具车。

真正的汽车产品展示，重点不只是“页面上有一辆车”，而是车身曲面、玻璃、轮毂、灯光、车漆反射这些细节能不能撑住质感。所以最终我换成了真实的 `.glb` 模型，再用 Three.js 做加载、布光、换色和交互。

本文就用当前这个案例，拆一下如何在 Vue 中实现一个基础的 3D 汽车展示页。

## 最终效果

这个 demo 的核心效果包括：

1. 页面中展示一辆可旋转的 Porsche 911 3D 模型；
2. 用户可以拖拽视角查看车辆；
3. 车辆会自动缓慢旋转；
4. 支持切换车漆颜色；
5. 页面能适配桌面端和移动端；
6. 组件卸载时会清理 Three.js 资源。

对应源码在：

```text
src/views/animation/car-showcase/index.vue
```

模型文件在：

```text
src/views/animation/car-showcase/models/porsche-911.glb
```

## 什么是 GLB？

`.glb` 可以理解为一种 3D 模型文件。

它是 `glTF` 的二进制版本，可以把模型结构、几何数据、材质、贴图、动画等内容打包到一个文件中。

简单理解：

```text
glTF = 3D 模型格式
GLB = glTF 的单文件二进制版本
```

在前端里，Three.js 可以通过 `GLTFLoader` 加载 `.glb` 文件：

```ts
const loader = new GLTFLoader()
const gltf = await loader.loadAsync(carModelUrl)
const model = gltf.scene
```

其中 `gltf.scene` 就是模型里的 3D 场景对象，可以直接添加到 Three.js 的 `scene` 中。

## DOM 结构

这个页面的 DOM 很简单，主要分成三块：

```vue
<template>
  <main class="car-showcase-page">
    <div ref="sceneHostRef" class="showcase-canvas"></div>

    <section class="showcase-copy">
      <!-- 产品文案 -->
    </section>

    <section class="paint-panel">
      <!-- 车漆色卡 -->
    </section>
  </main>
</template>
```

`.showcase-canvas` 是 Three.js 的画布容器。

`.showcase-copy` 是页面上的普通 DOM 文案，比如车型名称、性能参数。

`.paint-panel` 是车漆颜色切换按钮。

这里有一个很重要的设计：3D 内容和普通 DOM 不混在一起。

Three.js 只负责渲染汽车和展台，文案和按钮仍然交给 Vue 和 CSS 处理。这样页面结构会更清晰，响应式布局也更容易做。

## 引入 Three.js

当前案例用到了这些模块：

```ts
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
```

它们分别负责：

1. `THREE`：Three.js 核心对象，比如场景、相机、灯光、材质；
2. `OrbitControls`：鼠标拖拽旋转视角；
3. `GLTFLoader`：加载 `.glb/.gltf` 模型；
4. `RoomEnvironment`：生成一张环境贴图，让车漆和玻璃有反射。

## 加载模型路径

模型路径使用了 `new URL`：

```ts
const carModelUrl = new URL('./models/porsche-911.glb', import.meta.url).href
```

这样写的好处是：模型文件会交给 Vite 处理。

开发环境下它能正确找到本地文件；生产构建后，Vite 会把模型复制到 `dist/assets`，并自动替换成正确的资源地址。

## 创建 Three.js 场景

Three.js 最基础的几个对象是：

```ts
scene = new THREE.Scene()
camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
renderer = new THREE.WebGLRenderer({ antialias: true })
```

可以这样理解：

1. `scene` 是 3D 世界；
2. `camera` 是观察这个世界的眼睛；
3. `renderer` 是把 3D 世界画到 canvas 上的渲染器。

当前页面把 renderer 生成的 canvas 挂载到 Vue 的容器中：

```ts
host.appendChild(renderer.domElement)
```

## 为什么要设置色彩空间和色调映射？

代码里有两行很关键：

```ts
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
```

`outputColorSpace` 会影响颜色在浏览器里的显示。如果不处理，模型颜色可能偏灰、偏暗，或者和设计预期不一致。

`toneMapping` 可以理解成把 3D 渲染里的高亮、暗部重新映射成屏幕上更舒服的颜色。`ACESFilmicToneMapping` 常用于偏影视感的显示效果。

`toneMappingExposure` 是曝光值。值越大越亮，但太大时车漆高光容易炸白，所以这里用了比较克制的 `1.05`。

## 环境反射

汽车漆面真实不真实，很大程度取决于反射。

如果没有环境反射，车身会显得很平，像一个普通彩色模型。代码里使用了 `RoomEnvironment`：

```ts
const pmremGenerator = new THREE.PMREMGenerator(renderer)
environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04)
scene.environment = environmentMap.texture
pmremGenerator.dispose()
```

可以把 `scene.environment` 理解成“周围环境的反光来源”。

车漆、玻璃、金属这些材质会根据它产生反射，所以画面会更接近真实展厅。

## 加载 GLB 模型

模型加载函数如下：

```ts
const loadRealCarModel = async () => {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(carModelUrl)
  const model = gltf.scene

  prepareCarModel(model)
  fitModelToStage(model)

  carGroup = new THREE.Group()
  carGroup.add(model)
  scene.add(carGroup)
}
```

这里做了三件事：

1. 用 `GLTFLoader` 加载模型；
2. 处理模型材质和尺寸；
3. 把模型放进一个 `Group`，再添加到场景里。

之所以额外包一层 `Group`，是为了后续旋转整车时更简单：

```ts
carGroup?.rotateY(0.0022)
```

这样不需要去修改模型内部的每一个零件。

## 让模型适配展台

真实模型的尺寸通常不可控，有的按米建模，有的按厘米建模，有的模型中心点也不在原点。

所以加载后要做三步：

1. 计算模型包围盒；
2. 缩放到合适大小；
3. 居中并贴地。

代码核心是：

```ts
const box = new THREE.Box3().setFromObject(model)
const size = box.getSize(new THREE.Vector3())
const maxSize = Math.max(size.x, size.y, size.z)

model.scale.setScalar(5.2 / maxSize)
```

`Box3` 会用一个立方体包住整个模型。

拿到模型的宽高深后，取最长的一边作为缩放参考，这样模型无论原始尺寸是多少，都能放到一个比较稳定的展示范围里。

居中的逻辑是：

```ts
const centeredBox = new THREE.Box3().setFromObject(model)
const center = centeredBox.getCenter(new THREE.Vector3())

model.position.sub(center)
```

最后再把模型底部贴到地面：

```ts
const finalBox = new THREE.Box3().setFromObject(model)
model.position.y -= finalBox.min.y
```

这样车不会悬浮，也不会陷进地面里。

## 车漆为什么不能直接纯色覆盖？

一开始我直接创建了一个新的纯色车漆材质：

```ts
new THREE.MeshPhysicalMaterial({
  color,
  metalness: 0.86,
  roughness: 0.18,
  clearcoat: 1,
})
```

这样虽然能换色，但问题很明显：车身像玩具。

原因是原模型的车漆材质里有贴图，比如粗糙度贴图、金属度贴图。这些贴图会让车身不同位置有细微变化。

如果完全替换成纯色材质，这些细节就丢了。

现在的做法是：保留原始 `paint` 材质里的贴图，只替换颜色和少量 PBR 参数：

```ts
const material = new THREE.MeshPhysicalMaterial({
  color,
  map: sourceMaterial.map,
  metalnessMap: sourceMaterial.metalnessMap,
  roughnessMap: sourceMaterial.roughnessMap,
  normalMap: sourceMaterial.normalMap,
  aoMap: sourceMaterial.aoMap,
  metalness: 0.45,
  roughness: 0.32,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
  envMapIntensity: 1.28,
})
```

这里几个参数可以这样理解：

1. `metalness`：金属感，车漆不应该像整块金属，所以不能太高；
2. `roughness`：粗糙度，越低越像镜子，越高越柔和；
3. `clearcoat`：清漆层，汽车漆面的亮面主要靠它；
4. `clearcoatRoughness`：清漆层的粗糙度；
5. `envMapIntensity`：环境反射强度。

这个调整之后，车漆会更接近“清漆覆盖下的漆面”，而不是一整块塑料。

## 如何找到车身材质？

模型加载进来后，本质是一棵对象树。我们可以遍历它：

```ts
model.traverse(object => {
  if (!(object instanceof THREE.Mesh)) {
    return
  }

  const material = Array.isArray(object.material) ? object.material[0] : object.material
  const materialName = material?.name.toLowerCase()

  if (materialName === 'paint') {
    // 替换车身材质
  }
})
```

当前 Porsche 911 模型里，车身材质名叫 `paint`。

按材质名识别车身有一个好处：即使车身被拆成多个 Mesh，只要它们共用 `paint` 材质，就都可以被统一处理。

## 车漆换色

色卡点击时只做一件事：

```ts
bodyMaterial?.color.set(paint.color)
```

这里没有重新加载模型，也没有重新创建场景。

因为车身零件共用同一个 `bodyMaterial`，所以修改这个材质的颜色，所有车身零件都会同步变化。

这也是 Three.js 中材质复用的一个常见技巧。

## 添加展台

为了让模型不是孤零零飘在画面中，页面里加了一个简单展台：

```ts
const grid = new THREE.GridHelper(18, 36, '#475569', '#1e293b')
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMaterial)
const ring = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.018, 12, 120), ringMaterial)
```

地面负责接收阴影。

网格负责增强空间感。

光圈负责把用户注意力拉回到车辆中心。

## 灯光设置

当前使用了四种光：

```ts
const keyLight = new THREE.DirectionalLight('#ffffff', 2.6)
const fillLight = new THREE.DirectionalLight('#f8fafc', 0.8)
const rimLight = new THREE.PointLight('#ffffff', 30, 12)
const ambientLight = new THREE.HemisphereLight('#f8fafc', '#020617', 1.05)
```

它们的作用分别是：

1. 主光：负责主要明暗关系；
2. 补光：避免暗部死黑；
3. 轮廓光：让车身边缘更立体；
4. 环境光：提供整体基础亮度。

之前我用过偏蓝的灯光，但车漆会被蓝色污染，看起来更像 CG。后来把灯光调成更中性的白光，车漆会自然很多。

## 渲染循环

Three.js 动画依赖 `requestAnimationFrame`：

```ts
const renderScene = () => {
  carGroup?.rotateY(0.0022)
  controls?.update()
  renderer.render(scene, camera)
  animationFrameId = window.requestAnimationFrame(renderScene)
}
```

每一帧做三件事：

1. 让整车轻微旋转；
2. 更新 OrbitControls 的缓动；
3. 渲染当前画面。

因为页面使用了 `OrbitControls.enableDamping = true`，所以必须每帧调用 `controls.update()`，否则拖拽缓动不会生效。

## 响应式处理

窗口尺寸变化时，需要同步更新相机和渲染器：

```ts
camera.aspect = width / height
camera.updateProjectionMatrix()
renderer.setSize(width, height)
```

如果只改 canvas 尺寸，不更新相机宽高比，画面会被拉伸。

如果只更新相机，不更新 renderer，canvas 像素尺寸又会不对。

所以这两步通常一起做。

## 组件卸载时清理资源

Three.js 里的几何体、材质、环境贴图、渲染器都持有 WebGL 资源。

Vue 组件卸载时，如果不手动清理，切换路由多次后可能会产生内存残留。

当前代码做了这些清理：

```ts
window.cancelAnimationFrame(animationFrameId)
window.removeEventListener('resize', handleResize)
controls?.dispose()
disposeObject(scene)
environmentMap?.dispose()
renderer?.dispose()
renderer?.domElement.remove()
```

其中 `disposeObject` 会遍历整个场景：

```ts
object.traverse(child => {
  if (!(child instanceof THREE.Mesh)) {
    return
  }

  child.geometry.dispose()
  disposeMaterial(child.material)
})
```

这一步很容易被忽略，但在 SPA 项目里非常重要。

## 这个案例可以继续优化什么？

当前案例为了教学清晰，保留了比较直接的写法。后续还可以继续优化：

1. 增加加载进度条；
2. 使用 HDR 环境贴图提升车漆反射；
3. 增加热点标注，比如轮毂、车灯、内饰；
4. 加入 GSAP 入场动画；
5. 模型体积继续压缩，但运行时仍保持普通 GLB；
6. 针对移动端降低像素比或模型细节。

## 放在最后的话

Three.js 入门时，很容易把重点放在“我能不能把模型加载出来”。

但真正影响质感的，往往是那些看起来很细的东西：

为什么要设置色彩空间？

为什么车漆不能直接用纯色材质覆盖？

为什么环境反射比多加几盏灯更重要？

为什么切换路由时还要手动释放 WebGL 资源？

这些问题看起来琐碎，却决定了一个 3D 页面是“能跑”，还是“像那么回事”。

AI 可以很快生成一段 Three.js 代码，但如果我们看不懂材质、灯光、模型加载和资源清理这些细节，就很难在效果不对时做出准确调整。

所以我一直觉得，AI 时代不是不需要代码能力了，而是更需要知道代码背后的判断。

能看懂，才能改准。
