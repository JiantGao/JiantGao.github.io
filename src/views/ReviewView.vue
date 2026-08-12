<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '@/stores/library'
import { useDictStore } from '@/stores/dict'
import type { LibraryItem } from '@/types/library'
import type { Idiom } from '@/types/idiom'
import type { ReviewGrade } from '@/modules/srs/schedule'
import { useStudyTracking } from '@/modules/stats/tracker'

defineOptions({ name: 'ReviewView' })

const router = useRouter()
const library = useLibraryStore()
const dict = useDictStore()

useStudyTracking('review')

onMounted(() => {
  void loadQueue()
})

type Mode = 'due' | 'random'
const mode = ref<Mode>('due')
const queue = ref<LibraryItem[]>([])
const idx = ref(0)
const flipped = ref(false)
const feedback = ref<ReviewGrade | null>(null)
const finished = ref(false)
const tally = ref({ ok: 0, miss: 0, again: 0, skip: 0 })

const current = computed(() => queue.value[idx.value])
const detail = ref<Idiom | null>(null)
const detailLoading = ref(false)
const progress = computed(() => {
  const total = queue.value.length
  if (!total) return 0
  return Math.round(((finished.value ? total : idx.value) / total) * 100)
})

const GRADE_LABEL: Record<ReviewGrade, string> = { ok: '记得', miss: '模糊', again: '忘记' }

async function loadQueue() {
  await library.ensureLoaded()
  if (mode.value === 'due') {
    queue.value = library.reviewQueue
  } else {
    const pool = library.items.filter((i) => !i.isRemoved)
    queue.value = shuffle(pool).slice(0, 10)
  }
  idx.value = 0
  flipped.value = false
  finished.value = false
  tally.value = { ok: 0, miss: 0, again: 0, skip: 0 }
  feedback.value = null
  await loadDetail()
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function loadDetail() {
  const c = current.value
  if (!c) return
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = (await dict.getDetail(c.word)) ?? null
  } finally {
    detailLoading.value = false
  }
}

async function flip() {
  if (!flipped.value) {
    flipped.value = true
    if (!detail.value && !detailLoading.value) await loadDetail()
  }
}

async function grade(g: ReviewGrade) {
  const c = current.value
  if (!c) return
  await library.gradeReview(c.word, g)
  tally.value[g]++
  feedback.value = g
  await nextCard()
}

async function skip() {
  tally.value.skip++
  await nextCard()
}

async function nextCard() {
  if (idx.value + 1 >= queue.value.length) {
    finished.value = true
    return
  }
  idx.value++
  flipped.value = false
  feedback.value = null
  await loadDetail()
}

function changeMode(m: Mode) {
  mode.value = m
  void loadQueue()
}
</script>

<template>
  <div class="review">
    <header class="review__head">
      <span class="review__title">复习</span>
      <span class="review__sub">间隔记忆 · 温故知新</span>
    </header>

    <div class="review__body">
      <!-- 空状态 -->
      <van-empty
        v-if="!queue.length && !finished"
        :description="mode === 'due' ? '今天没有到期的成语，保持好节奏！' : '学习库还没有成语'"
      >
        <van-button
          v-if="mode === 'due' && library.items.filter((i) => !i.isRemoved).length"
          round
          type="primary"
          size="small"
          @click="changeMode('random')"
        >
          随机温习 10 条
        </van-button>
      </van-empty>

      <!-- 完成态 -->
      <div v-else-if="finished" class="review__done">
        <div class="done-icon">🎉</div>
        <div class="done-title">本轮完成！</div>
        <div class="done-stats">
          <div class="done-stat">
            <span class="done-stat__num">{{ queue.length }}</span>
            <span class="done-stat__label">复习总数</span>
          </div>
          <div class="done-stat done-stat--ok">
            <span class="done-stat__num">{{ tally.ok }}</span>
            <span class="done-stat__label">记得</span>
          </div>
          <div class="done-stat done-stat--miss">
            <span class="done-stat__num">{{ tally.miss }}</span>
            <span class="done-stat__label">模糊</span>
          </div>
          <div class="done-stat done-stat--again">
            <span class="done-stat__num">{{ tally.again }}</span>
            <span class="done-stat__label">忘记</span>
          </div>
        </div>
        <div class="done-actions">
          <van-button round plain type="primary" @click="changeMode(mode)">再来一轮</van-button>
          <van-button round plain type="default" @click="router.push({ name: 'library' })">回学习库</van-button>
        </div>
      </div>

      <!-- 闪卡 -->
      <template v-else>
        <div class="review__head">
          <span class="review__mode">
            <span
              class="mode-chip"
              :class="{ active: mode === 'due' }"
              @click="changeMode('due')"
            >今日到期</span>
            <span
              class="mode-chip"
              :class="{ active: mode === 'random' }"
              @click="changeMode('random')"
            >随机温习</span>
          </span>
          <span class="review__counter">{{ idx + 1 }} / {{ queue.length }}</span>
        </div>
        <van-progress :percentage="progress" :show-pivot="false" color="#c62828" :stroke-width="4" />

        <div
          class="card"
          :class="{ 'is-flipped': flipped, 'feed-ok': feedback === 'ok', 'feed-miss': feedback === 'miss', 'feed-again': feedback === 'again' }"
          @click="flip"
        >
          <!-- 正面 -->
          <div class="card__face card__front">
            <template v-if="current">
              <div class="card__word">{{ current.word }}</div>
              <div class="card__pinyin">{{ current.pinyin }}</div>
              <div class="card__hint">点击卡片查看释义</div>
            </template>
          </div>
          <!-- 反面 -->
          <div class="card__face card__back">
            <template v-if="detailLoading">
              <van-skeleton title :row="3" style="padding: 12px" />
            </template>
            <template v-else-if="detail">
              <div class="card__expl">{{ detail.explanation }}</div>
              <div v-if="detail.example" class="card__example">{{ detail.example }}</div>
            </template>
            <template v-else>
              <div class="card__hint">暂无释义</div>
            </template>
          </div>
        </div>

        <transition name="fade">
          <div v-if="feedback" class="feed-msg" :class="`feed-msg--${feedback}`">
            {{ GRADE_LABEL[feedback] }} · 已更新复习计划
          </div>
        </transition>

        <div class="review__actions" :class="{ 'is-visible': flipped }">
          <button class="grade-btn grade-btn--again" :disabled="!flipped" @click="grade('again')">忘记</button>
          <button class="grade-btn grade-btn--miss" :disabled="!flipped" @click="grade('miss')">模糊</button>
          <button class="grade-btn grade-btn--ok" :disabled="!flipped" @click="grade('ok')">记得</button>
        </div>
        <div class="review__skip" v-if="flipped" @click="skip">跳过此条</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.review {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.review__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 18px 20px 6px;
}

.review__title {
  font-size: var(--cy-font-xl);
  font-weight: 700;
}

.review__sub {
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
}

.review__body {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.review__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.review__mode {
  display: flex;
  gap: 8px;
}

.mode-chip {
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--cy-card);
  color: var(--cy-text-secondary);
  font-size: var(--cy-font-sm);
  box-shadow: var(--cy-shadow-sm);
  cursor: pointer;
}
.mode-chip.active {
  background: var(--cy-primary);
  color: #fff;
}

.review__counter {
  font-size: var(--cy-font-sm);
  color: var(--cy-text-tertiary);
}

/* 卡片 */
.card {
  position: relative;
  flex: 1;
  margin: 16px 0;
  min-height: 320px;
  perspective: 1000px;
}

.card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: var(--cy-card);
  border-radius: var(--cy-radius-lg);
  box-shadow: var(--cy-shadow-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.card__front {
  transform: rotateY(0deg);
}
.card__back {
  transform: rotateY(180deg);
  align-items: flex-start;
  justify-content: flex-start;
  overflow-y: auto;
}
.card.is-flipped .card__front {
  transform: rotateY(180deg);
}
.card.is-flipped .card__back {
  transform: rotateY(0deg);
}

.card__word {
  font-size: 56px;
  font-weight: 700;
  letter-spacing: 6px;
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  color: var(--cy-primary);
}

.card__pinyin {
  margin-top: 14px;
  color: var(--cy-text-secondary);
  font-size: var(--cy-font-md);
}

.card__hint {
  margin-top: 20px;
  color: var(--cy-text-tertiary);
  font-size: var(--cy-font-sm);
}

.card__expl {
  font-size: var(--cy-font-md);
  line-height: 1.8;
  color: var(--cy-text-primary);
}

.card__example {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--cy-bg);
  border-radius: var(--cy-radius-sm);
  font-size: var(--cy-font-sm);
  line-height: 1.7;
  color: var(--cy-text-secondary);
}

/* 反馈动画 */
.card.feed-ok {
  box-shadow: 0 4px 20px rgba(46, 125, 50, 0.35);
}
.card.feed-miss {
  box-shadow: 0 4px 20px rgba(239, 108, 0, 0.35);
}
.card.feed-again {
  box-shadow: 0 4px 20px rgba(198, 40, 40, 0.35);
}

.feed-msg {
  text-align: center;
  font-size: var(--cy-font-sm);
  margin-top: -8px;
  margin-bottom: 8px;
}
.feed-msg--ok {
  color: var(--cy-success);
}
.feed-msg--miss {
  color: var(--cy-warning);
}
.feed-msg--again {
  color: var(--cy-danger);
}

/* 评级按钮 */
.review__actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  opacity: 0.35;
  transition: opacity 0.2s;
}
.review__actions.is-visible {
  opacity: 1;
}

.grade-btn {
  padding: 14px 0;
  border: none;
  border-radius: var(--cy-radius-md);
  font-size: var(--cy-font-md);
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: transform 0.1s;
}
.grade-btn:active {
  transform: scale(0.96);
}
.grade-btn--again {
  background: var(--cy-danger);
}
.grade-btn--miss {
  background: var(--cy-warning);
}
.grade-btn--ok {
  background: var(--cy-success);
}
.grade-btn:disabled {
  opacity: 1;
}

.review__skip {
  text-align: center;
  margin-top: 14px;
  font-size: var(--cy-font-sm);
  color: var(--cy-text-tertiary);
  text-decoration: underline;
  cursor: pointer;
}

/* 完成态 */
.review__done {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 60px;
}

.done-icon {
  font-size: 60px;
}

.done-title {
  font-size: var(--cy-font-xl);
  font-weight: 700;
  margin: 12px 0 24px;
}

.done-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.done-stat {
  text-align: center;
}
.done-stat__num {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--cy-text-primary);
}
.done-stat--ok .done-stat__num {
  color: var(--cy-success);
}
.done-stat--miss .done-stat__num {
  color: var(--cy-warning);
}
.done-stat--again .done-stat__num {
  color: var(--cy-danger);
}
.done-stat__label {
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
}

.done-actions {
  display: flex;
  gap: 12px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
