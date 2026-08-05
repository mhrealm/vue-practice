<template>
  <div class="container">
    <div class="story-stage" ref="stageRef">
      <!-- 卡片 -->
      <div class="story-card" ref="cardTrackRef">
        <article ref="cardRef" class="story-item" v-for="group in storyGroups" :key="group.id" :data-card-id="group.id">
          <figure class="story-img">
            <img :src="group.cardImage" :alt="group.title" loading="lazy" />
          </figure>
          <div class="story-copy">
            <p>{{ group.kicker }}</p>
            <h2>{{ group.title }}</h2>
            <span>{{ group.description }}</span>
          </div>
        </article>
      </div>
      <!-- 故事面板 -->
      <div class="story-panel">
        <template v-for="group in storyGroups" :key="`${group.id}-panels`">
          <section ref="panelRef" v-for="panel in group.panels" :key="`${group.id}-${panel.id}`" class="story-section" :style="{ '--panel-accent': group.accent }" :data-card-id="group.id">
            <div class="panel-visual">
              <video v-if="panel.video" :src="panel.video" :poster="panel.image" muted playsinline preload="metadata"></video>
              <img v-else :src="panel.image" :alt="panel.title" loading="lazy" />
            </div>
            <div class="panel-content">
              <p class="panel-kicker">{{ group.title }} / {{ panel.kicker }}</p>
              <h2>{{ panel.title }}</h2>
              <p>{{ panel.description }}</p>
              <ul v-if="panel.stats" class="panel-stats">
                <li v-for="stat in panel.stats" :key="stat.label">
                  <strong>{{ stat.value }}</strong>
                  <span>{{ stat.label }}</span>
                </li>
              </ul>
            </div>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { storyGroups } from './story-data'

gsap.registerPlugin(ScrollTrigger)

const cardRef = ref([])
const panelRef = ref([])
const cardTrackRef = ref()
const stageRef = ref()

const hideCard = { autoAlpha: 0, duration: 0.5 }
const showCard = { autoAlpha: 1, duration: 0.5 }
const focusCard = { autoAlpha: 1, scale: 2, duration: 0.5 }
const resetCard = { autoAlpha: 1, scale: 1, duration: 0.5 }
const liftImage = { y: -54, duration: 0.5 }
const resetImage = { y: 0, duration: 0.5 }
const dimCopy = { y: 58, opacity: 0.1, duration: 0.5 }
const resetCopy = { y: 0, opacity: 1, duration: 0.5 }
const showPanel = { autoAlpha: 1, duration: 1 }
const hidePanel = { autoAlpha: 0, duration: 0.5 }
const holdPanel = { duration: 0.8 }

const isReady = () =>
  stageRef.value && cardTrackRef.value && cardRef.value.length && panelRef.value.length

const getCardByGroupId = groupId =>
  cardRef.value.find(card => card.dataset.cardId === groupId)

const getPanelsByGroupId = groupId =>
  panelRef.value.filter(panel => panel.dataset.cardId === groupId)

const getCardNodes = groupId => {
  const card = getCardByGroupId(groupId)
  if (!card) return null

  const image = card.querySelector('.story-img')
  const copy = card.querySelector('.story-copy')
  return image && copy ? { card, image, copy } : null
}

// 计算移动的距离
const getMoveX = targetCard => () => {
  const stage = stageRef.value
  const cardTrack = cardTrackRef.value
  if (!stage || !cardTrack) return 0

  const stageRect = stage.getBoundingClientRect()
  const cardRect = targetCard.getBoundingClientRect()
  const trackX = Number(gsap.getProperty(cardTrack, 'x'))
  return stageRect.left + stageRect.width / 2 - (cardRect.left - trackX + cardRect.width / 2)
}

const addPanelSequence = (timeline, panels) => {
  panels.forEach((panel, index) => {
    const previousPanel = panels[index - 1]
    if (previousPanel) timeline.to(previousPanel, hidePanel, '>')

    timeline.to(panel, showPanel, previousPanel ? '<' : '>')
      .to({}, holdPanel)
  })

  const lastPanel = panels.at(-1)
  if (lastPanel) {
    timeline.to(lastPanel, hidePanel, '>')
  }
}

const addCardSequence = (timeline, group) => {
  const cardNodes = getCardNodes(group.id)
  if (!cardNodes) return

  const { card, image, copy } = cardNodes
  const cards = cardRef.value
  const otherCards = cards.filter(item => item !== card)
  const currentPanels = getPanelsByGroupId(group.id)

  timeline
    .to(cards, { x: getMoveX(card), duration: 0.5 })
    .to(otherCards, hideCard, '>')
    .to(card, focusCard, '<')
    .to(image, liftImage, '<')
    .to(copy, dimCopy, '<')
    .to(card, hideCard, '>')

  addPanelSequence(timeline, currentPanels)

  timeline
    .to(card, resetCard, '>')
    .to(image, resetImage, '<')
    .to(copy, resetCopy, '<')
    .to(otherCards, showCard, '<')
}

onMounted(async () => {
  await nextTick()
  if (!isReady()) {
    return
  }

  gsap.set(panelRef.value, { autoAlpha: 0 })

  const timeline = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: '.container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      invalidateOnRefresh: true,
    },
  })
  storyGroups.forEach(group => addCardSequence(timeline, group))
})

</script>

<style lang="less" scoped>
.container {
  position: relative;
  height: 500vh;
  background-color: #191b1f;

  video,
  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .story-stage {
    position: sticky;
    top: 0;
    height: 100vh;
    min-height: 640px;
    overflow: hidden;
    isolation: isolate;
    background:
      linear-gradient(120deg, rgba(53, 183, 168, 0.14), transparent 30%),
      linear-gradient(250deg, rgba(232, 109, 91, 0.16), transparent 34%),
      #101214;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .story-card {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: center;
    gap: 18px;
    width: min(1120px, calc(100% - 56px));
  }

  .story-item {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 440px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    background: #191b1f;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.26);
    color: #fff;
    transform-origin: center center;
    will-change: transform, opacity;
    overflow: hidden;

    .story-img {
      width: 100%;
      height: 64%;
      margin: 0;
    }

    .story-copy {
      margin: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;

      h2 {
        margin: 0;
      }

      p {
        font-weight: 700;
        text-transform: uppercase;
      }

      span {
        color: rgba(255, 255, 255, 0.72);
      }
    }
  }

  .story-panel {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
  }

  .story-section {
    position: absolute;
    display: grid;
    grid-template-columns: minmax(0, 1.12fr) minmax(320px, 0.88fr);
    gap: 40px;
    align-items: center;
    padding: 60px max(36px, calc((100vw - 1180px) / 2));
  }

  .story-section .panel-visual {
    height: min(66vh, 620px);
    min-height: 380px;
    overflow: hidden;
    border-radius: 8px;
    background: #0b0d10;
    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
  }

  .story-section .panel-content::before {
    display: block;
    width: 58px;
    height: 4px;
    border-radius: 4px;
    background: var(--panel-accent);
    content: '';
  }

  .story-section .panel-content {
    max-width: 440px;
    color: #fff;
    display: flex;
    flex-direction: column;
    gap: 20px;

    .panel-kicker {
      color: var(--panel-accent);
      font-weight: 700;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      font-size: 44px;
      line-height: 1.08;
    }

    .panel-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 14px 0 0;
      padding: 0;
      list-style: none;

      li {
        min-width: 0;
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.07);
      }

      strong {
        display: block;
        font-size: 24px;
        line-height: 1.2;
        letter-spacing: 0;
      }

      span {
        display: block;
        margin-top: 6px;
        font-size: 13px;
        line-height: 1.4;
        color: rgba(248, 242, 232, 0.64);
      }
    }
  }
}
</style>

<route lang="json">{
  "meta": {
    "title": "Pinned 滚动叙事楼层",
    "category": "animation",
    "tag": "GSAP"
  }
}</route>
