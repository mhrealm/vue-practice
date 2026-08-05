<template>
  <main ref="pageRef" class="pinned-story-page">
    <section ref="scrollRef" class="story-scroll" :style="{ '--story-scroll-distance': storyScrollDistance }">
      <div ref="stageRef" class="story-stage">
        <div class="story-stage__wash"></div>

        <div ref="cardTrackRef" class="story-card-track" aria-label="叙事概览卡片">
          <article v-for="group in storyGroups" :key="group.id" class="overview-card" :data-story-card="group.id" :style="{ '--accent': group.accent }">
            <figure class="overview-card__media">
              <img :src="group.cardImage" :alt="group.title" loading="lazy" />
            </figure>
            <div class="overview-card__copy">
              <p>{{ group.kicker }}</p>
              <h2>{{ group.title }}</h2>
              <span>{{ group.description }}</span>
            </div>
          </article>
        </div>

        <div class="story-panel-stack" aria-live="polite">
          <template v-for="group in storyGroups" :key="`${group.id}-panels`">
            <section v-for="panel in group.panels" :key="`${group.id}-${panel.id}`" class="story-panel" :data-story-panel="`${group.id}-${panel.id}`" :data-card-id="group.id" :style="{ '--panel-accent': group.accent }">
              <div class="story-panel__visual">
                <video v-if="panel.video" :src="panel.video" :poster="panel.image" muted playsinline preload="metadata"></video>
                <img v-else :src="panel.image" :alt="panel.title" loading="lazy" />
              </div>

              <div class="story-panel__content">
                <p class="story-panel__kicker">{{ group.title }} / {{ panel.kicker }}</p>
                <h2>{{ panel.title }}</h2>
                <p>{{ panel.description }}</p>
                <ul v-if="panel.stats" class="story-panel__stats">
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
    </section>
  </main>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { storyGroups, storyScrollDistance } from './story-data'

gsap.registerPlugin(ScrollTrigger)

const pageRef = ref<HTMLElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const cardTrackRef = ref<HTMLElement | null>(null)

let animationContext: gsap.Context | null = null
let activeVideo: HTMLVideoElement | null = null

const dimCards = { opacity: 0.2, scale: 0.94, filter: 'saturate(0.55)', duration: 0.35 }
const resetCards = { opacity: 1, scale: 1, filter: 'saturate(1)', duration: 0.42 }
const showPanel = { autoAlpha: 1, duration: 0.48 }
const hidePanel = { autoAlpha: 0, duration: 0.48 }
const holdPanel = { duration: 0.72 }

const notEmpty = <T,>(value: T | null | undefined): value is T => Boolean(value)
const selectAll = <T extends Element>(root: ParentNode, selector: string) =>
  Array.from(root.querySelectorAll<T>(selector))

const playFromStart = (video: HTMLVideoElement) => {
  try {
    video.currentTime = 0
    video.play().catch(() => undefined)
  } catch {
    video.play().catch(() => undefined)
  }
}

const pauseAllVideos = () => {
  activeVideo = null
  pageRef.value?.querySelectorAll('video').forEach(video => {
    video.pause()
  })
}

const getCenterX = (stage: HTMLElement, card: HTMLElement) => () => {
  const stageRect = stage.getBoundingClientRect()
  const cardRect = card.getBoundingClientRect()
  const currentX = Number(gsap.getProperty(card, 'x'))

  return stageRect.left + stageRect.width / 2 - (cardRect.left - currentX + cardRect.width / 2)
}

const getGroupNodes = (stage: HTMLElement, group: (typeof storyGroups)[number]) => {
  const card = stage.querySelector<HTMLElement>(`[data-story-card="${group.id}"]`)
  const panels = group.panels
    .map(panel => stage.querySelector<HTMLElement>(`[data-story-panel="${group.id}-${panel.id}"]`))
    .filter(notEmpty)

  if (!card || !panels.length) return null

  const media = card.querySelector<HTMLElement>('.overview-card__media')
  const copy = card.querySelector<HTMLElement>('.overview-card__copy')

  return media && copy ? { card, media, copy, panels } : null
}

const addPanelSequence = (timeline: gsap.core.Timeline, panels: HTMLElement[]) => {
  panels.forEach((panel, index) => {
    const previousPanel = panels[index - 1]
    if (previousPanel) {
      timeline.to(previousPanel, hidePanel, '>')
        .to(panel, showPanel, '<')
    } else {
      timeline.to(panel, showPanel, '>')
    }
    timeline.to({}, holdPanel)
  })

  timeline.to(panels[panels.length - 1]!, { autoAlpha: 0, duration: 0.42 }, '>')
}

onMounted(async () => {
  await nextTick()

  const [page, scrollContainer, stage, cardTrack] = [
    pageRef.value,
    scrollRef.value,
    stageRef.value,
    cardTrackRef.value,
  ]
  if (!page || !scrollContainer || !stage || !cardTrack) {
    return
  }

  animationContext = gsap.context(() => {
    const cards = storyGroups
      .map(group => stage.querySelector<HTMLElement>(`[data-story-card="${group.id}"]`))
      .filter(notEmpty)
    const panels = selectAll<HTMLElement>(stage, '.story-panel')
    const videos = selectAll<HTMLVideoElement>(stage, 'video')
    const videoPanels = videos
      .map(video => ({ video, panel: video.closest<HTMLElement>('.story-panel') }))
      .filter((item): item is { video: HTMLVideoElement; panel: HTMLElement } =>
        Boolean(item.panel)
      )

    const syncVideos = () => {
      const visibleVideo =
        videoPanels.find(({ panel }) => Number(gsap.getProperty(panel, 'opacity')) > 0.65)
          ?.video ?? null

      videos.forEach(video => {
        if (video !== visibleVideo) {
          video.pause()
        }
      })

      if (!visibleVideo || activeVideo === visibleVideo) {
        if (!visibleVideo) activeVideo = null
        return
      }

      activeVideo = visibleVideo
      playFromStart(visibleVideo)
    }

    const addCardSequence = (group: (typeof storyGroups)[number], timeline: gsap.core.Timeline) => {
      const nodes = getGroupNodes(stage, group)
      if (!nodes) return

      const { card, media, copy, panels: groupPanels } = nodes
      const inactiveCards = cards.filter(item => item !== card)

      timeline
        .set(card, { zIndex: 8 })
        .to(inactiveCards, dimCards, '>')
        .to(card, { x: getCenterX(stage, card), duration: 0.85 }, '<')
        .to(card, { scale: 1.18, duration: 0.65 }, '>')
        .to(media, { y: -54, scale: 1.06, duration: 0.65 }, '<')
        .to(copy, { y: 58, duration: 0.65 }, '<')
        .to(card, { autoAlpha: 0, duration: 0.36 }, '>')
        .to(cardTrack, { autoAlpha: 0, duration: 0.28 }, '<')

      addPanelSequence(timeline, groupPanels)

      timeline
        .set(card, { autoAlpha: 1 })
        .to(cardTrack, { autoAlpha: 1, duration: 0.28 }, '>')
        .to(card, { x: 0, scale: 1, duration: 0.7 }, '<')
        .to(media, { y: 0, scale: 1, duration: 0.7 }, '<')
        .to(copy, { y: 0, duration: 0.7 }, '<')
        .to(inactiveCards, resetCards, '<+=0.2')
        .set(card, { zIndex: 2 })
    }

    const timeline = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onUpdate: syncVideos,
      scrollTrigger: {
        trigger: scrollContainer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        invalidateOnRefresh: true,
        onLeave: pauseAllVideos,
        onLeaveBack: pauseAllVideos,
      },
    })

    gsap.set(cards, { clearProps: 'all', transformOrigin: 'center center', zIndex: 2 })
    gsap.set(panels, { autoAlpha: 0 })
    gsap.set(cardTrack, { autoAlpha: 1 })

    storyGroups.forEach(group => addCardSequence(group, timeline))
    timeline.call(pauseAllVideos)
  }, page)

  requestAnimationFrame(() => ScrollTrigger.refresh())
})

onBeforeUnmount(() => {
  pauseAllVideos()
  animationContext?.revert()
})
</script>

<style scoped lang="less">
.pinned-story-page {
  min-height: 100vh;
  background: #101214;
  color: #171717;
}

.story-scroll {
  position: relative;
  height: calc(100vh + var(--story-scroll-distance, 1440vh));
  min-height: calc(640px + var(--story-scroll-distance, 1440vh));
  background: #101214;
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
}

.story-stage__wash {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 30%),
    repeating-linear-gradient(90deg,
      rgba(255, 255, 255, 0.04) 0,
      rgba(255, 255, 255, 0.04) 1px,
      transparent 1px,
      transparent 120px);
  pointer-events: none;
}

.story-card-track {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 18px;
  width: min(1120px, calc(100% - 56px));
  height: 100%;
  margin: 0 auto;
  pointer-events: none;
}

.overview-card {
  position: relative;
  min-width: 0;
  height: 440px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: #191b1f;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.26);
  color: #fff;
  transform-origin: center center;
  will-change: transform, opacity;
}

.overview-card::after {
  position: absolute;
  inset: auto 18px 18px 18px;
  height: 3px;
  border-radius: 3px;
  background: var(--accent);
  content: '';
}

.overview-card__media {
  height: 64%;
  margin: 0;
  overflow: hidden;
  will-change: transform;
}

.overview-card__media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.overview-card__copy {
  position: relative;
  min-height: 36%;
  padding: 22px 20px 28px;
  background: linear-gradient(180deg, rgba(25, 27, 31, 0.82), #191b1f 38%);
  will-change: transform;
}

.overview-card__copy p {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.overview-card__copy h2 {
  margin: 0;
  font-size: 26px;
  line-height: 1.12;
  letter-spacing: 0;
}

.overview-card__copy span {
  display: block;
  margin-top: 12px;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.72);
}

.story-panel-stack {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.story-panel {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(320px, 0.88fr);
  gap: 40px;
  align-items: center;
  padding: 60px max(36px, calc((100vw - 1180px) / 2));
  opacity: 0;
  visibility: hidden;
  color: #f8f2e8;
}

.story-panel__visual {
  position: relative;
  height: min(66vh, 620px);
  min-height: 380px;
  overflow: hidden;
  border-radius: 8px;
  background: #0b0d10;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.32);
}

.story-panel__visual::after {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: inherit;
  content: '';
  pointer-events: none;
}

.story-panel__visual img,
.story-panel__visual video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.story-panel__content {
  position: relative;
  max-width: 440px;
}

.story-panel__content::before {
  display: block;
  width: 58px;
  height: 4px;
  margin-bottom: 24px;
  border-radius: 4px;
  background: var(--panel-accent);
  content: '';
}

.story-panel__kicker {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--panel-accent);
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.story-panel__content h2 {
  margin: 0;
  font-size: 44px;
  line-height: 1.08;
  letter-spacing: 0;
}

.story-panel__content>p:not(.story-panel__kicker) {
  margin: 20px 0 0;
  font-size: 17px;
  line-height: 1.75;
  color: rgba(248, 242, 232, 0.78);
}

.story-panel__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

.story-panel__stats li {
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
}

.story-panel__stats strong {
  display: block;
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: 0;
}

.story-panel__stats span {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(248, 242, 232, 0.64);
}

@media (max-width: 900px) {
  .story-scroll {
    min-height: calc(720px + var(--story-scroll-distance, 1440vh));
  }

  .story-stage {
    min-height: 720px;
  }

  .story-card-track {
    width: calc(100% - 28px);
    gap: 10px;
  }

  .overview-card {
    height: 390px;
  }

  .overview-card__copy {
    padding: 18px 14px 24px;
  }

  .overview-card__copy h2 {
    font-size: 20px;
  }

  .overview-card__copy span {
    font-size: 13px;
  }

  .story-panel {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 24px;
    padding: 28px 18px;
  }

  .story-panel__visual {
    height: 46vh;
    min-height: 280px;
  }

  .story-panel__content {
    max-width: 100%;
  }

  .story-panel__content h2 {
    font-size: 30px;
  }

  .story-panel__content>p:not(.story-panel__kicker) {
    font-size: 15px;
  }
}

@media (max-width: 560px) {
  .story-card-track {
    width: calc(100% - 18px);
    gap: 8px;
  }

  .overview-card {
    height: 330px;
  }

  .overview-card__media {
    height: 58%;
  }

  .overview-card__copy {
    min-height: 42%;
    padding: 14px 10px 22px;
  }

  .overview-card__copy h2 {
    font-size: 17px;
  }

  .overview-card__copy span {
    font-size: 12px;
    line-height: 1.45;
  }

  .story-panel__stats {
    grid-template-columns: 1fr;
  }
}
</style>
