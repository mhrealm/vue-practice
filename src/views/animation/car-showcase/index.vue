<template>
  <main class="car-showcase-page">
    <!-- Three.js 会把 canvas 挂载到这个容器里，页面上的 3D 内容都由它承载。 -->
    <div ref="sceneHostRef" class="showcase-canvas"></div>

    <!-- 这块是普通 DOM 文案，和 3D 场景分离，方便单独做响应式布局。 -->
    <section class="showcase-copy" aria-label="产品信息">
      <p>Realistic GT Showcase</p>
      <h1>Porsche 911</h1>
      <dl>
        <div>
          <dt>0-100</dt>
          <dd>3.6s</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>443hp</dd>
        </div>
        <div>
          <dt>Drive</dt>
          <dd>AWD</dd>
        </div>
      </dl>
    </section>

    <!-- 车漆色卡是普通按钮，点击后只修改 Three.js 里的车身材质颜色。 -->
    <section class="paint-panel" aria-label="车漆颜色">
      <button v-for="paint in paintOptions" :key="paint.name" type="button" class="paint-swatch" :class="{ 'paint-swatch--active': activePaint === paint.name }" :style="{ backgroundColor: paint.color }" :aria-label="paint.label" :aria-pressed="activePaint === paint.name"
        @click="applyPaint(paint)"></button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

interface PaintOption {
  name: string
  label: string
  color: string
}

// 模型放在当前案例目录下，通过 import.meta.url 交给 Vite 处理。
// 这样生产构建时，Vite 会自动把 glb 拷贝到 dist/assets，并返回正确的资源地址。
const carModelUrl = new URL('./models/porsche-911.glb', import.meta.url).href
const sceneHostRef = ref<HTMLDivElement | null>(null)
const activePaint = ref('rosso-corsa')

// 色值刻意没有使用特别鲜艳的纯色。
// PBR 材质里颜色太亮、太纯时，很容易出现“塑料玩具感”。
const paintOptions: PaintOption[] = [
  { name: 'rosso-corsa', label: '赛道红', color: '#9f1d23' },
  { name: 'midnight-blue', label: '午夜蓝', color: '#1f3f68' },
  { name: 'pearl-silver', label: '珍珠银', color: '#b8c0c7' },
  { name: 'obsidian-black', label: '曜石黑', color: '#0b0f14' },
]

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let carGroup: THREE.Group | null = null
let bodyMaterial: THREE.MeshPhysicalMaterial | null = null
let environmentMap: THREE.WebGLRenderTarget | null = null
let animationFrameId = 0

// canvas 的尺寸要和页面容器保持一致。
// 如果容器还没渲染出来，就退回使用窗口尺寸，避免初始化时拿到 0。
const getHostSize = () => {
  const host = sceneHostRef.value

  return {
    width: host?.clientWidth || window.innerWidth,
    height: host?.clientHeight || window.innerHeight,
  }
}

const createBodyMaterial = (sourceMaterial: THREE.MeshStandardMaterial, color: string) => {
  // 车漆是否真实，关键不只是 color。
  // 如果从零创建一个纯色材质，模型原本的粗糙度/金属度细节会丢失，车身会像一整块塑料。
  // 所以这里以模型自带的 paint 材质为基础，把它的贴图复制到新的车漆材质上。
  const material = new THREE.MeshPhysicalMaterial({
    color,
    // 这些贴图来自原模型，决定了车身表面的细节变化。
    map: sourceMaterial.map,
    metalnessMap: sourceMaterial.metalnessMap,
    roughnessMap: sourceMaterial.roughnessMap,
    normalMap: sourceMaterial.normalMap,
    aoMap: sourceMaterial.aoMap,

    // 汽车漆不是整块金属，metalness 过高会显得发硬。
    // 适当提高 roughness，可以让反射没那么“镜面”，更像真实清漆表面。
    metalness: 0.45,
    roughness: 0.32,

    // clearcoat 可以理解成车漆最外层的透明清漆。
    // 这层清漆带来高光和反射，是汽车漆面质感很重要的一部分。
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.28,
  })

  material.name = 'car-paint'

  return material
}

const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
  // glTF 模型里的一个 Mesh 可能绑定单个材质，也可能绑定材质数组。
  // 清理时统一转成数组处理，避免漏掉某些子材质。
  if (Array.isArray(material)) {
    material.forEach(item => item.dispose())
    return
  }

  material.dispose()
}

const setMaterial = (mesh: THREE.Mesh, material: THREE.Material) => {
  // 替换材质前先释放模型自带材质。
  // 注意：dispose 只释放材质本身，不会把它引用的贴图一起删掉，所以新车漆仍然可以复用原贴图。
  disposeMaterial(mesh.material)
  mesh.material = material
}

const fitModelToStage = (model: THREE.Object3D) => {
  // 不同来源的模型尺寸差异很大：有的按米建模，有的按厘米建模。
  // Box3 可以包住整个模型，用它算出模型当前的宽高深。
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)

  // 把模型最长的一边缩放到 5.2 左右，保证它能舒服地放进当前相机视野。
  model.scale.setScalar(5.2 / maxSize)

  // 缩放会改变包围盒，所以要重新计算中心点。
  // position.sub(center) 的意思是：把模型整体往中心点的反方向移动，让中心落到原点。
  const centeredBox = new THREE.Box3().setFromObject(model)
  const center = centeredBox.getCenter(new THREE.Vector3())

  model.position.sub(center)

  // 居中后模型可能一半在地面下方。
  // 再根据包围盒的最低点把车抬起来，让车底刚好贴到 y = 0 的地面。
  const finalBox = new THREE.Box3().setFromObject(model)
  model.position.y -= finalBox.min.y
}

const prepareCarModel = (model: THREE.Object3D) => {
  const currentPaint = paintOptions.find(paint => paint.name === activePaint.value)

  // glTF 模型本质上是一棵对象树，里面包含很多零件。
  // traverse 会遍历这棵树，我们只处理真正参与渲染的 Mesh。
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) {
      return
    }

    // Porsche 911 模型里，车身使用的材质名叫 paint。
    // 这里按“材质名”识别车身，比按节点名更稳定，因为车身可能被拆成多个 Mesh。
    const material = Array.isArray(object.material) ? object.material[0] : object.material
    const materialName = material?.name.toLowerCase()

    // 开启阴影后，模型既可以投射影子，也可以接收地面的反射阴影。
    object.castShadow = true
    object.receiveShadow = true

    if (materialName === 'paint' && material instanceof THREE.MeshStandardMaterial) {
      // 多个车身 Mesh 复用同一个 bodyMaterial。
      // 后续点击色卡时，只需要改这一个材质的 color，所有车身零件都会同步换色。
      bodyMaterial = bodyMaterial || createBodyMaterial(material, currentPaint?.color || '#9f1d23')
      setMaterial(object, bodyMaterial)
    }
  })
}

const loadRealCarModel = async () => {
  try {
    // 这个 porsche-911.glb 已经离线转换成普通 GLB。
    // 因此运行时只需要 GLTFLoader，不需要再引入 DRACOLoader。
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(carModelUrl)
    const model = gltf.scene

    // 如果模型还没加载完，用户就切走了页面，scene 会在卸载时被置空。
    // 这时不能再把模型 add 到场景里，需要先释放资源。
    if (!scene) {
      disposeObject(model)
      return
    }

    // 模型加载完成后，先处理材质，再处理尺寸和位置，最后加进场景。
    prepareCarModel(model)
    fitModelToStage(model)

    // 用一个 Group 包住整车。
    // 后续自动旋转时只转这个 Group，不需要改模型内部每个零件。
    carGroup = new THREE.Group()
    carGroup.add(model)
    carGroup.rotation.y = -0.48
    scene.add(carGroup)
  } catch (error) {
    console.error('Failed to load car model:', error)
  }
}

const createStage = () => {
  // GridHelper 是地面参考线，能让 3D 空间更容易被看出来。
  const grid = new THREE.GridHelper(18, 36, '#475569', '#1e293b')

  // 地面负责接收车的影子，同时给场景一个稳定的落点。
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({
      color: '#0d1117',
      metalness: 0.1,
      roughness: 0.76,
    }),
  )

  // 光圈只是一个轻量的视觉提示，用来强调车所在的展台中心。
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.35, 0.018, 12, 120),
    new THREE.MeshStandardMaterial({
      color: '#e5e7eb',
      emissive: '#94a3b8',
      emissiveIntensity: 0.16,
    }),
  )

  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true

  // 网格和光圈稍微高于地面，避免和地面处在同一平面时闪烁。
  grid.position.y = 0.012
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.025

  scene?.add(floor, grid, ring)
}

const initScene = () => {
  const host = sceneHostRef.value

  // Vue ref 需要等 DOM 挂载后才有值。
  // 如果这里拿不到容器，说明组件还没准备好，直接结束初始化。
  if (!host) {
    return
  }

  const { width, height } = getHostSize()

  // 场景：所有 3D 物体、灯光、环境都会被放在 scene 里。
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#0a0d12')
  scene.fog = new THREE.Fog('#0a0d12', 10, 22)

  // 相机：决定用户从哪里、用什么视角看这个 3D 世界。
  // 42 是视野角度，width / height 是宽高比，0.1 和 100 是近远裁剪面。
  camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
  camera.position.set(5.8, 2.6, 5.2)

  // 渲染器：把 scene + camera 渲染成 canvas 画面。
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)

  // 限制最大像素比，避免高分屏设备渲染压力过大。
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // 使用 sRGB 输出，避免模型颜色在浏览器里显得发灰或过曝。
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // ACESFilm 常用于更接近摄影/影视的色调映射。
  // exposure 稍微收低一点，车漆高光不会过分炸白。
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  // 开启阴影，让车和地面之间有接触感。
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  host.appendChild(renderer.domElement)

  // 环境贴图可以理解成“周围环境的反光”。
  // 金属、玻璃和车漆都很依赖环境反射，否则表面会显得很平。
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = environmentMap.texture
  pmremGenerator.dispose()

  // OrbitControls 让用户可以用鼠标拖拽旋转视角、滚轮缩放。
  controls = new OrbitControls(camera, renderer.domElement)

  // damping 会让拖拽有缓动感，所以每一帧都要调用 controls.update()。
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 4
  controls.maxDistance = 9
  controls.maxPolarAngle = Math.PI / 2.05
  controls.target.set(0, 0.85, 0)

  // 主光：从右前上方打下来，负责主要明暗关系。
  const keyLight = new THREE.DirectionalLight('#ffffff', 2.6)

  // 补光：从另一侧轻轻补亮，避免暗部完全死黑。
  const fillLight = new THREE.DirectionalLight('#f8fafc', 0.8)

  // 轮廓光：从后侧给车身边缘一点亮边，增强立体感。
  const rimLight = new THREE.PointLight('#ffffff', 30, 12)

  // 环境光：给整个场景一个基础亮度。
  const ambientLight = new THREE.HemisphereLight('#f8fafc', '#020617', 1.05)

  keyLight.position.set(4, 7, 5)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  fillLight.position.set(-5, 4, -5)
  rimLight.position.set(-3.8, 1.7, -3)
  scene.add(keyLight, fillLight, rimLight, ambientLight)

  createStage()
  void loadRealCarModel()
}

const applyPaint = (paint: PaintOption) => {
  activePaint.value = paint.name

  // bodyMaterial 是车身共享材质。
  // 点击色卡时只改 color，不重新加载模型，也不重新创建场景。
  bodyMaterial?.color.set(paint.color)
}

const renderScene = () => {
  // 组件卸载后 renderer/scene/camera 会被置空。
  // 这里做保护，避免 requestAnimationFrame 下一帧继续访问空对象。
  if (!renderer || !scene || !camera) {
    return
  }

  // 每一帧让整车轻微旋转，页面不操作时也像一个产品展台。
  // 注意：这里转的是 carGroup，不是相机，所以用户拖拽视角后仍然有动态展示感。
  carGroup?.rotateY(0.0022)
  controls?.update()
  renderer.render(scene, camera)

  // requestAnimationFrame 会在浏览器下一次重绘前继续调用 renderScene。
  // 这样就形成了 Three.js 的动画循环。
  animationFrameId = window.requestAnimationFrame(renderScene)
}

const handleResize = () => {
  if (!camera || !renderer) {
    return
  }

  const { width, height } = getHostSize()

  // 容器尺寸变化后，相机宽高比必须同步更新，否则画面会被拉伸。
  camera.aspect = width / height
  camera.updateProjectionMatrix()

  // 渲染器尺寸也要同步更新，让 canvas 像素和页面尺寸一致。
  renderer.setSize(width, height)
}

const disposeObject = (object: THREE.Object3D) => {
  // Three.js 不会像普通 DOM 那样自动释放 GPU 资源。
  // 离开页面时需要遍历场景，把几何体和材质都手动 dispose。
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    child.geometry.dispose()
    disposeMaterial(child.material)
  })
}

const disposeScene = () => {
  // 停止动画循环和窗口监听，避免组件卸载后逻辑还在后台运行。
  window.cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)

  // OrbitControls 内部也绑定了鼠标/触摸事件，需要单独释放。
  controls?.dispose()

  if (scene) {
    disposeObject(scene)
  }

  // 环境贴图和渲染器都持有 WebGL 资源，也需要释放。
  environmentMap?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()

  // 清空引用，帮助垃圾回收，也避免后续逻辑误用旧对象。
  scene = null
  camera = null
  renderer = null
  controls = null
  carGroup = null
  bodyMaterial = null
  environmentMap = null
}

onMounted(() => {
  // DOM 挂载后才能拿到 sceneHostRef，所以 Three.js 初始化放在 onMounted 里。
  initScene()
  window.addEventListener('resize', handleResize)
  renderScene()
})

// Vue 组件卸载时，清理 Three.js 场景和监听。
onBeforeUnmount(disposeScene)
</script>

<style scoped lang="less">
.car-showcase-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #0a0d12;
  color: #f8fafc;
}

.showcase-canvas {
  position: absolute;
  inset: 0;
}

.showcase-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.showcase-copy {
  position: relative;
  z-index: 1;
  width: min(520px, calc(100vw - 40px));
  padding: 48px 0 0 48px;
  pointer-events: none;
}

.showcase-copy p,
.showcase-copy h1 {
  margin: 0;
}

.showcase-copy p {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.showcase-copy h1 {
  margin-top: 8px;
  font-size: 58px;
  font-weight: 800;
  line-height: 1;
}

.showcase-copy dl {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin: 24px 0 0;
}

.showcase-copy div {
  min-width: 86px;
}

.showcase-copy dt {
  color: #94a3b8;
  font-size: 12px;
}

.showcase-copy dd {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 700;
}

.paint-panel {
  position: absolute;
  right: 40px;
  bottom: 34px;
  z-index: 2;
  display: flex;
  gap: 12px;
}

.paint-swatch {
  width: 34px;
  height: 34px;
  border: 2px solid rgb(255 255 255 / 56%);
  border-radius: 50%;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.paint-swatch:hover,
.paint-swatch--active {
  border-color: #fff;
  box-shadow: 0 0 0 4px rgb(255 255 255 / 16%);
  transform: translateY(-2px);
}

.paint-swatch:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 3px;
}

@media (max-width: 720px) {
  .showcase-copy {
    width: calc(100vw - 32px);
    padding: 28px 16px 0;
  }

  .showcase-copy h1 {
    font-size: 40px;
  }

  .showcase-copy dl {
    gap: 14px;
    margin-top: 18px;
  }

  .showcase-copy dd {
    font-size: 17px;
  }

  .paint-panel {
    right: 50%;
    bottom: 22px;
    transform: translateX(50%);
  }
}
</style>

<route lang="json">{
  "meta": {
    "title": "3D 汽车产品展示",
    "category": "动画动效",
    "tag": "Three.js",
    "difficulty": 4
  }
}</route>
