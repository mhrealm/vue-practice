<template>
  <main class="car-showcase-page">
    <!-- Three.js 生成的 canvas 会挂到这个容器里，Vue 只负责提供一个稳定的 DOM 挂载点。 -->
    <div
      ref="sceneHostRef"
      class="showcase-canvas"
    ></div>

    <!-- 普通页面文案继续交给 DOM/CSS 处理，3D 场景只负责车和展台。 -->
    <section
      class="showcase-copy"
      aria-label="产品信息"
    >
      <p>{{ modelKicker }}</p>
      <h1>Chevrolet Corvette C8</h1>

      <dl>
        <div>
          <dt>Engine</dt>
          <dd>LT2 V8</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>495hp</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>Mid-engine</dd>
        </div>
      </dl>

      <span
        v-if="modelNote"
        class="model-note"
      >
        {{ modelNote }}
      </span>
    </section>

    <!-- 基础版只保留车漆切换，让初学者先看懂“加载模型 + 替换材质”这条主线。 -->
    <section
      class="paint-panel"
      aria-label="车漆颜色"
    >
      <button
        v-for="paint in paintOptions"
        :key="paint.name"
        type="button"
        class="paint-swatch"
        :class="{ 'paint-swatch--active': activePaint === paint.name }"
        :style="{ backgroundColor: paint.color }"
        :aria-label="paint.label"
        :aria-pressed="activePaint === paint.name"
        @click="applyPaint(paint)"
      ></button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

interface PaintOption {
  // 程序内部使用的唯一标识，点击色卡时会用它判断当前选中项。
  name: string

  // 给无障碍属性 aria-label 使用，方便读屏软件读出色卡名称。
  label: string

  // 色卡显示颜色，也是车身材质的基础色。
  color: string

  // 下面这些参数都会写入 MeshPhysicalMaterial，用来控制车漆质感。
  metalness: number
  roughness: number
  clearcoatRoughness: number
  reflectivity: number
  envMapIntensity: number
  pearl: number
}

// 模型和当前案例放在一起，方便迁移、删除和写博客时统一管理。
const corvetteModelUrl = new URL('./models/chevrolet-corvette-c8.glb', import.meta.url).href
const sceneHostRef = ref<HTMLDivElement | null>(null)

// 默认选中红色，让第一个色卡和页面初始车漆保持一致。
const activePaint = ref('corvette-red')
const modelNote = ref('')
const modelKicker = 'Animated Sports Car Showcase'

// 车漆色值尽量避免纯色过饱和。
// PBR 材质里颜色太亮、太纯时，车身很容易变成“塑料玩具感”。
const paintOptions: PaintOption[] = [
  { name: 'corvette-red', label: 'Corvette Red', color: '#8f1418', metalness: 0.16, roughness: 0.22, clearcoatRoughness: 0.03, reflectivity: 0.68, envMapIntensity: 1.36, pearl: 0.04 },
  { name: 'ceramic-white', label: 'Ceramic White', color: '#98a3ad', metalness: 0.05, roughness: 0.43, clearcoatRoughness: 0.09, reflectivity: 0.28, envMapIntensity: 0.58, pearl: 0.02 },
  { name: 'blade-silver', label: 'Blade Silver', color: '#b5bec7', metalness: 0.28, roughness: 0.2, clearcoatRoughness: 0.028, reflectivity: 0.7, envMapIntensity: 1.42, pearl: 0.1 },
  { name: 'night-black', label: 'Night Black', color: '#05070a', metalness: 0.14, roughness: 0.18, clearcoatRoughness: 0.026, reflectivity: 0.74, envMapIntensity: 1.58, pearl: 0.02 },
]

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let carGroup: THREE.Group | null = null
let bodyMaterial: THREE.MeshPhysicalMaterial | null = null
let environmentMap: THREE.WebGLRenderTarget | null = null
let animationFrameId = 0

const paintKeywords = ['paint', 'body', 'carpaint', 'car_paint', 'exterior', 'corvette', 'c8']
const ignorePaintKeywords = ['glass', 'window', 'tire', 'tyre', 'rubber', 'rim', 'wheel', 'light', 'lamp']

// canvas 尺寸永远跟随容器。
// 初始化瞬间如果容器还没有宽高，就退回窗口尺寸，避免相机宽高比出现 0。
const getHostSize = () => {
  const host = sceneHostRef.value

  return {
    width: host?.clientWidth || window.innerWidth,
    height: host?.clientHeight || window.innerHeight,
  }
}

const includesAny = (value: string, keywords: string[]) => keywords.some(keyword => value.includes(keyword))

const getFirstMaterial = (material: THREE.Material | THREE.Material[]) => {
  return Array.isArray(material) ? material[0] : material
}

const getActivePaint = () => paintOptions.find(paint => paint.name === activePaint.value) || paintOptions[0]!

const applyCarPaintToMaterial = (material: THREE.MeshPhysicalMaterial, paint: PaintOption) => {
  // 真实车漆不是一整块金属，而是底色 + 透明清漆层。
  // metalness 保持偏低，主要靠 clearcoat、reflectivity 和环境反射做出漆面高光。
  material.color.set(paint.color)

  // metalness 越高越像金属，汽车漆通常只保留一点点金属质感。
  material.metalness = paint.metalness

  // roughness 越低，高光越锐利；越高，反射越柔和。
  material.roughness = paint.roughness
  material.clearcoat = 1
  material.clearcoatRoughness = paint.clearcoatRoughness
  material.reflectivity = paint.reflectivity
  material.ior = 1.55
  material.specularIntensity = 1
  material.specularColor.set('#ffffff')

  // 环境反射强度会明显影响车漆是否有“摄影棚高光”。
  material.envMapIntensity = paint.envMapIntensity

  // 少量 iridescence 模拟珠光层，数值太高会变成夸张的变色漆。
  material.iridescence = paint.pearl
  material.iridescenceIOR = 1.32
  material.iridescenceThicknessRange = [120, 360]
  material.needsUpdate = true
}

const createBodyMaterial = (sourceMaterial: THREE.Material, paint: PaintOption) => {
  // MeshPhysicalMaterial 比 MeshStandardMaterial 多了 clearcoat 清漆层。
  // 汽车车漆通常不是单纯的漫反射颜色，而是底色 + 清漆反射一起构成质感。
  const source = sourceMaterial instanceof THREE.MeshStandardMaterial ? sourceMaterial : null

  const material = new THREE.MeshPhysicalMaterial({
    color: paint.color,

    // 尽量复用原模型自带的贴图。
    // 这些贴图能保留车身表面的细节变化，比如粗糙度、法线和遮蔽。
    map: source?.map || null,
    metalnessMap: source?.metalnessMap || null,
    roughnessMap: source?.roughnessMap || null,
    normalMap: source?.normalMap || null,
    aoMap: source?.aoMap || null,

    transparent: false,
    opacity: 1,
  })

  material.name = 'c8-showcase-paint'
  applyCarPaintToMaterial(material, paint)

  return material
}

const isPaintMesh = (mesh: THREE.Mesh) => {
  const material = getFirstMaterial(mesh.material)
  const text = `${mesh.name} ${material?.name || ''}`.toLowerCase()

  return includesAny(text, paintKeywords) && !includesAny(text, ignorePaintKeywords)
}

const isModelBaseMesh = (mesh: THREE.Mesh) => {
  const material = getFirstMaterial(mesh.material)
  const text = `${mesh.name} ${material?.name || ''}`.toLowerCase()

  return text.includes('plane') || text.includes('material.052')
}

const prepareCarModel = (model: THREE.Object3D) => {
  const currentPaint = getActivePaint()

  // glTF 加载后是一棵对象树。
  // traverse 会递归走完整棵树，我们只处理真正渲染出来的 Mesh。
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) {
      return
    }

    object.castShadow = true
    object.receiveShadow = true

    if (isModelBaseMesh(object)) {
      object.visible = false
      return
    }

    if (isPaintMesh(object)) {
      const sourceMaterial = getFirstMaterial(object.material)

      if (!sourceMaterial) {
        return
      }

      // 所有车身 Mesh 共用同一个 bodyMaterial。
      // 后续点击色卡时，只需要改这一份材质的 color，所有车身零件都会同步换色。
      bodyMaterial = bodyMaterial || createBodyMaterial(sourceMaterial, currentPaint)
      object.material = bodyMaterial
    }
  })
}

const applyInitialAnimationPose = (model: THREE.Object3D, animations: THREE.AnimationClip[]) => {
  if (!animations.length) {
    return
  }

  // C8 的动画第 0 帧是打开态，末帧才是闭合态。
  // 基础展示页不需要播放动画，但需要把模型压到闭合帧，让车辆以完整外观入场。
  const mixer = new THREE.AnimationMixer(model)
  let closeTime = 0

  animations.forEach(clip => {
    const action = mixer.clipAction(clip)
    closeTime = Math.max(closeTime, clip.duration)
    action.setLoop(THREE.LoopOnce, 1)
    action.clampWhenFinished = true
    action.play()
  })

  mixer.setTime(closeTime)
}

const fitModelToStage = (model: THREE.Object3D) => {
  // 外部模型的尺寸和原点通常不可控，所以加载后要统一缩放、居中、贴地。
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)

  model.scale.setScalar(5.4 / maxSize)

  const centeredBox = new THREE.Box3().setFromObject(model)
  const center = centeredBox.getCenter(new THREE.Vector3())
  model.position.sub(center)

  const finalBox = new THREE.Box3().setFromObject(model)
  model.position.y -= finalBox.min.y
}

const loadCarModel = async () => {
  try {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(corvetteModelUrl)
    const model = gltf.scene

    // 如果模型加载过程中用户切走页面，scene 会被清空。
    // 这时不能再把模型 add 进去，直接释放资源即可。
    if (!scene) {
      disposeObject(model)
      return
    }

    applyInitialAnimationPose(model, gltf.animations)
    prepareCarModel(model)
    fitModelToStage(model)

    // 用一个 Group 包住整车。
    // 自动旋转时只转 Group，不改模型内部的零件层级。
    carGroup = new THREE.Group()
    carGroup.add(model)
    carGroup.rotation.y = -0.52
    scene.add(carGroup)
  } catch (error) {
    modelNote.value = '模型加载失败，请检查模型文件路径。'
    console.error('Failed to load car model:', error)
  }
}

const createStage = () => {
  // GridHelper 只是一组线条，不是实心地板。
  // 保留它可以让用户感知空间方向，同时不会像地板一样盖住或压暗车底。
  const grid = new THREE.GridHelper(18, 36, '#475569', '#1f2937')

  // 稍微抬高一点，避免和模型底部同在 y=0 时出现闪烁。
  // 这里不再创建白色外圈光环，让基础版画面和交互版保持一致。
  grid.position.y = 0.018

  scene?.add(grid)
}

const createStudioLights = () => {
  const frontSoftbox = new THREE.RectAreaLight('#ffffff', 0.95, 4.6, 1.5)
  const sideSoftbox = new THREE.RectAreaLight('#dbeafe', 0.45, 3.8, 1.4)

  // 两盏摄影棚柔光不会显示成物体，只负责给清漆层更自然的长条高光。
  frontSoftbox.position.set(-2.4, 3.2, 4.4)
  sideSoftbox.position.set(4.3, 2.4, -2.6)
  frontSoftbox.lookAt(0, 0.82, 0)
  sideSoftbox.lookAt(0, 0.82, 0)

  scene?.add(frontSoftbox, sideSoftbox)
}

const initScene = () => {
  const host = sceneHostRef.value

  if (!host) {
    return
  }

  const { width, height } = getHostSize()

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#090d12')
  scene.fog = new THREE.Fog('#090d12', 10, 24)

  // PerspectiveCamera 的四个参数分别是：视角、宽高比、最近可见距离、最远可见距离。
  // position.set(x, y, z) 表示把相机放到车的右前上方。
  // 数值比旧版更靠近模型，所以页面初始看到的汽车会更大一些。
  camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
  camera.position.set(5.15, 2.55, 4.85)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.7
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  host.appendChild(renderer.domElement)
  RectAreaLightUniformsLib.init()

  // 环境贴图决定金属、玻璃、车漆能不能反射出真实层次。
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = environmentMap.texture
  pmremGenerator.dispose()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 4
  controls.maxDistance = 9
  controls.maxPolarAngle = Math.PI / 2.05
  controls.target.set(0, 0.82, 0)

  // 主光负责车身亮面，补光负责暗部层次，轮廓光负责把车从背景里分离出来。
  // 这里的强度保持克制，避免红色车漆和白色高光过曝。
  const keyLight = new THREE.DirectionalLight('#ffffff', 1.45)
  const fillLight = new THREE.DirectionalLight('#f8fafc', 0.28)
  const rimLight = new THREE.PointLight('#ffffff', 14, 12)
  const ambientLight = new THREE.HemisphereLight('#f8fafc', '#020617', 0.5)

  keyLight.position.set(4.2, 7.4, 5.4)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  fillLight.position.set(-5, 4.2, -5)
  rimLight.position.set(-3.8, 1.7, -3)

  scene.add(keyLight, fillLight, rimLight, ambientLight)

  createStudioLights()
  createStage()
  void loadCarModel()
}

const applyPaint = (paint: PaintOption) => {
  activePaint.value = paint.name

  // 换色时同步更新车漆参数，不重新加载模型，也不重新初始化场景。
  if (bodyMaterial) {
    applyCarPaintToMaterial(bodyMaterial, paint)
  }
}

const renderScene = () => {
  if (!renderer || !scene || !camera) {
    return
  }

  // 基础展示版保留轻微自转，适合产品展示页的静态首屏。
  carGroup?.rotateY(0.002)
  controls?.update()
  renderer.render(scene, camera)

  animationFrameId = window.requestAnimationFrame(renderScene)
}

const handleResize = () => {
  if (!camera || !renderer) {
    return
  }

  const { width, height } = getHostSize()

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

const disposeMaterial = (material: THREE.Material | THREE.Material[], disposedMaterials: Set<THREE.Material>) => {
  const materials = Array.isArray(material) ? material : [material]

  materials.forEach(item => {
    if (disposedMaterials.has(item)) {
      return
    }

    item.dispose()
    disposedMaterials.add(item)
  })
}

const disposeObject = (object: THREE.Object3D) => {
  const disposedGeometries = new Set<THREE.BufferGeometry>()
  const disposedMaterials = new Set<THREE.Material>()

  // Three.js 资源在 GPU 里，组件卸载时需要手动释放。
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    if (!disposedGeometries.has(child.geometry)) {
      child.geometry.dispose()
      disposedGeometries.add(child.geometry)
    }

    disposeMaterial(child.material, disposedMaterials)
  })
}

const disposeScene = () => {
  window.cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)

  controls?.dispose()

  if (scene) {
    disposeObject(scene)
  }

  environmentMap?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()

  scene = null
  camera = null
  renderer = null
  controls = null
  carGroup = null
  bodyMaterial = null
  environmentMap = null
}

onMounted(() => {
  initScene()
  window.addEventListener('resize', handleResize)
  renderScene()
})

onBeforeUnmount(disposeScene)
</script>

<style scoped lang="less">
.car-showcase-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #090d12;
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
  width: min(560px, calc(100vw - 40px));
  padding: 48px 0 0 48px;
  pointer-events: none;
}

.showcase-copy p,
.showcase-copy h1 {
  margin: 0;
}

.showcase-copy p {
  color: #fecaca;
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

.model-note {
  display: inline-block;
  margin-top: 18px;
  color: #fca5a5;
  font-size: 13px;
  line-height: 1.6;
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
  outline: 2px solid #fecaca;
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
    "title": "3D 汽车展示基础版",
    "category": "动画动效",
    "tag": "Three.js",
    "difficulty": 4
  }
}</route>
