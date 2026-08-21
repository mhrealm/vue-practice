<template>
  <main class="car-showcase-page">
    <div ref="sceneHostRef" class="showcase-canvas"></div>
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

// 模型放在当前案例目录下，交给 Vite 打包并生成最终访问地址。
const carModelUrl = new URL('./models/porsche-911.glb', import.meta.url).href
const sceneHostRef = ref<HTMLDivElement | null>(null)
const activePaint = ref('rosso-corsa')

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

const getHostSize = () => {
  const host = sceneHostRef.value

  return {
    width: host?.clientWidth || window.innerWidth,
    height: host?.clientHeight || window.innerHeight,
  }
}

const createBodyMaterial = (sourceMaterial: THREE.MeshStandardMaterial, color: string) => {
  // 不从零创建“纯色材质”，而是把原模型的贴图带过来。
  // 这样车身仍然有原来的粗糙度变化，看起来不会像一整块塑料。
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

  material.name = 'car-paint'

  return material
}

const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
  if (Array.isArray(material)) {
    material.forEach(item => item.dispose())
    return
  }

  material.dispose()
}

const setMaterial = (mesh: THREE.Mesh, material: THREE.Material) => {
  // 替换材质前先释放模型自带材质，避免切换路由后内存残留。
  disposeMaterial(mesh.material)
  mesh.material = material
}

const fitModelToStage = (model: THREE.Object3D) => {
  // 真实模型的原始尺寸不可控，先缩放到合适大小。
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)

  model.scale.setScalar(5.2 / maxSize)

  // 缩放后再计算中心点，把车放到展台中心。
  const centeredBox = new THREE.Box3().setFromObject(model)
  const center = centeredBox.getCenter(new THREE.Vector3())

  model.position.sub(center)

  // 最后把车底贴到地面上，而不是悬在半空。
  const finalBox = new THREE.Box3().setFromObject(model)
  model.position.y -= finalBox.min.y
}

const prepareCarModel = (model: THREE.Object3D) => {
  const currentPaint = paintOptions.find(paint => paint.name === activePaint.value)

  // glTF 模型里的每个零件都是 Mesh。这里保留模型自带材质，只替换名为 paint 的车身材质。
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) {
      return
    }

    const material = Array.isArray(object.material) ? object.material[0] : object.material
    const materialName = material?.name.toLowerCase()

    object.castShadow = true
    object.receiveShadow = true

    if (materialName === 'paint' && material instanceof THREE.MeshStandardMaterial) {
      bodyMaterial = bodyMaterial || createBodyMaterial(material, currentPaint?.color || '#9f1d23')
      setMaterial(object, bodyMaterial)
    }
  })
}

const loadRealCarModel = async () => {
  try {
    // 这个模型是普通 GLB，没有 Draco 压缩，所以只需要 GLTFLoader。
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(carModelUrl)
    const model = gltf.scene

    if (!scene) {
      disposeObject(model)
      return
    }

    prepareCarModel(model)
    fitModelToStage(model)

    carGroup = new THREE.Group()
    carGroup.add(model)
    carGroup.rotation.y = -0.48
    scene.add(carGroup)
  } catch (error) {
    console.error('Failed to load car model:', error)
  }
}

const createStage = () => {
  const grid = new THREE.GridHelper(18, 36, '#475569', '#1e293b')
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({
      color: '#0d1117',
      metalness: 0.1,
      roughness: 0.76,
    }),
  )
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

  if (!host) {
    return
  }

  const { width, height } = getHostSize()

  // Three.js 的固定四件套：场景、相机、渲染器、控制器。
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#0a0d12')
  scene.fog = new THREE.Fog('#0a0d12', 10, 22)

  camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
  camera.position.set(5.8, 2.6, 5.2)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  host.appendChild(renderer.domElement)

  // 环境贴图可以理解成“周围环境的反光”，车漆和玻璃会因此更真实。
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
  controls.target.set(0, 0.85, 0)

  // 主光、补光、轮廓光和环境光共同决定汽车的立体感。
  const keyLight = new THREE.DirectionalLight('#ffffff', 2.6)
  const fillLight = new THREE.DirectionalLight('#f8fafc', 0.8)
  const rimLight = new THREE.PointLight('#ffffff', 30, 12)
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

  // bodyMaterial 是车身材质，直接改它的颜色即可完成换色。
  bodyMaterial?.color.set(paint.color)
}

const renderScene = () => {
  if (!renderer || !scene || !camera) {
    return
  }

  // 每帧轻微转动车辆和车轮，让静态产品也有展示节奏。
  // 注意：这里转的是整个车，不是相机，所以用户拖拽视角后仍然有动态展示感。
  carGroup?.rotateY(0.0022)
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

const disposeObject = (object: THREE.Object3D) => {
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    child.geometry.dispose()
    disposeMaterial(child.material)
  })
}

const disposeScene = () => {
  window.cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)
  controls?.dispose()

  // Three.js 不会自动释放 WebGL 资源，组件卸载时需要手动清理。
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
