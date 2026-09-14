<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useDictStore } from '@/stores/dict'
import { useLibraryStore } from '@/stores/library'
import type { Idiom } from '@/types/idiom'
import type { LibraryItem, MasteryLevel } from '@/types/library'
import { MASTERY_LABELS } from '@/types/library'
import MasteryPicker from '@/components/common/MasteryPicker.vue'
import { useStudyTracking } from '@/modules/stats/tracker'

defineOptions({ name: 'IdiomDetailView' })

useStudyTracking('detail')

const route = useRoute()
const router = useRouter()
const dict = useDictStore()
const library = useLibraryStore()

const idiom = ref<Idiom | null>(null)
const loading = ref(true)
const notFound = ref(false)
const libItem = ref<LibraryItem | null>(null)
const masteryPickOpen = ref(false)
/** 典故·古文例句折叠状态（默认收起） */
const classicOpen = ref([] as string[])

const word = computed(() => (route.params.word as string) || '')
const syllables = computed(() => (idiom.value?.pinyin ?? '').trim().split(/\s+/).filter(Boolean))

const examples = computed<string[]>(() => idiom.value?.curated?.examples ?? [])
const synonyms = computed(() => idiom.value?.curated?.synonyms ?? [])
const antonyms = computed(() => idiom.value?.curated?.antonyms ?? [])
const charMeanings = computed(() => idiom.value?.curated?.charMeanings ?? [])
const sentiment = computed(() => idiom.value?.curated?.sentiment ?? '')
const usage = computed(() => idiom.value?.curated?.usage ?? '')
const notes = computed(() => idiom.value?.curated?.notes ?? '')
const tags = computed(() => idiom.value?.tags ?? [])
/** 是否存在古文出处或古文例句（用于「典故出处」折叠区） */
const hasClassic = computed(() => !!(idiom.value?.derivation || idiom.value?.example))
/** 情感色彩样式类：褒义→success，贬义→danger，中性→info，多含贬义/亦褒亦贬→warning */
const sentimentClass = computed(() => {
  switch (sentiment.value) {
    case '褒义':
      return 'is-pos'
    case '贬义':
    case '多含贬义':
      return 'is-neg'
    case '亦褒亦贬':
      return 'is-mixed'
    default:
      return 'is-neutral'
  }
})

watch(
  () => route.params.word,
  async () => {
    await load()
  },
  { immediate: true },
)

async function load() {
  loading.value = true
  notFound.value = false
  idiom.value = null
  try {
    const d = await dict.getDetail(word.value)
    if (!d) {
      notFound.value = true
      return
    }
    idiom.value = d
    // 自动入库（基于搜索行为的个性化学习库核心机制）
    await library.recordView(d.word, { pinyin: d.pinyin, abbreviation: d.abbrev })
    await refreshLibItem()
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

async function refreshLibItem() {
  libItem.value = (await library.getItem(word.value)) ?? null
}

async function toggleFavorite() {
  if (!idiom.value) return
  await library.toggleFavorite(idiom.value.word)
  await refreshLibItem()
  showToast(libItem.value?.favorite ? '已收藏' : '已取消收藏')
}

function openMastery() {
  masteryPickOpen.value = true
}

async function setMastery(level: MasteryLevel) {
  if (!idiom.value) return
  await library.setMastery(idiom.value.word, level)
  await refreshLibItem()
  masteryPickOpen.value = false
  showToast(`已标记：${MASTERY_LABELS[level]}`)
}

function gotoWord(w: string) {
  if (w === word.value) return
  router.push({ name: 'idiom-detail', params: { word: w } })
}
</script>

<template>
  <div class="detail">
    <van-nav-bar
      :title="word"
      left-arrow
      fixed
      placeholder
      @click-left="router.back()"
    />

    <div v-if="loading" class="page-body">
      <van-skeleton title avatar :row="6" style="padding: 12px 0" />
    </div>

    <van-empty v-else-if="notFound" description="未找到该成语" />

    <div v-else-if="idiom" class="detail__content">
      <!-- 头部 -->
      <header class="header">
        <div class="header__word">{{ idiom.word }}</div>
        <div class="header__pinyin">
          <span v-for="(syl, i) in syllables" :key="i" class="syl">{{ syl }}</span>
        </div>
        <div class="header__actions">
          <button class="act-btn" :class="{ 'is-active': libItem?.favorite }" @click="toggleFavorite">
            <van-icon :name="libItem?.favorite ? 'star' : 'star-o'" />
            <span>{{ libItem?.favorite ? '已收藏' : '收藏' }}</span>
          </button>
          <button class="act-btn" :class="{ 'is-active': libItem }" @click="openMastery">
            <van-icon name="medal-o" />
            <span>{{ libItem ? MASTERY_LABELS[libItem.mastery] : '标记掌握' }}</span>
          </button>
        </div>
        <div v-if="idiom.hot > 0" class="header__badge">精选</div>
      </header>

      <!-- 情感色彩（褒贬义） -->
      <section v-if="sentiment" class="card">
        <h3 class="card__title">情感色彩</h3>
        <span class="sentiment-chip" :class="sentimentClass">{{ sentiment }}</span>
      </section>

      <!-- 释义 -->
      <section class="card">
        <h3 class="card__title">释义</h3>
        <p class="card__text">{{ idiom.explanation }}</p>
        <div v-if="notes" class="card__notes">
          <span class="card__notes-label">引申义</span>
          <p>{{ notes }}</p>
        </div>
      </section>

      <!-- 逐字释义 -->
      <section v-if="charMeanings.length" class="card">
        <h3 class="card__title">逐字释义</h3>
        <div class="char-meanings">
          <div v-for="cm in charMeanings" :key="cm.char" class="char-cell">
            <div class="char-cell__char">
              {{ cm.char }}
              <span v-if="cm.pinyin" class="char-cell__pin">{{ cm.pinyin }}</span>
            </div>
            <div class="char-cell__meaning">{{ cm.meaning }}</div>
          </div>
        </div>
      </section>

      <!-- 使用对象 -->
      <section v-if="usage" class="card">
        <h3 class="card__title">使用对象</h3>
        <p class="card__text">{{ usage }}</p>
      </section>

      <!-- 实用例句（现代） -->
      <section v-if="examples.length" class="card">
        <h3 class="card__title">实用例句</h3>
        <ol class="example-list">
          <li v-for="(ex, i) in examples" :key="i" class="example-item">
            <span class="example-item__no">{{ i + 1 }}</span>
            <span class="example-item__text">{{ ex }}</span>
          </li>
        </ol>
      </section>

      <!-- 近义词 / 反义词 -->
      <section v-if="synonyms.length || antonyms.length" class="card">
        <div v-if="synonyms.length" class="synant">
          <span class="synant__label">近义词</span>
          <div class="synant__chips">
            <span
              v-for="s in synonyms"
              :key="s"
              class="chip chip--syn"
              @click="gotoWord(s)"
            >{{ s }}</span>
          </div>
        </div>
        <div v-if="antonyms.length" class="synant" style="margin-top: 10px">
          <span class="synant__label">反义词</span>
          <div class="synant__chips">
            <span
              v-for="a in antonyms"
              :key="a"
              class="chip chip--ant"
              @click="gotoWord(a)"
            >{{ a }}</span>
          </div>
        </div>
      </section>

      <!-- 常见误用 -->
      <section v-if="idiom.curated?.misuse" class="card card--warn">
        <h3 class="card__title">常见误用</h3>
        <p class="card__text">{{ idiom.curated.misuse }}</p>
      </section>

      <!-- 典故 · 古文例句（折叠收起） -->
      <section v-if="hasClassic" class="card">
        <van-collapse v-model="classicOpen">
          <van-collapse-item title="出处 · 典故（古文，可展开）" :name="'classic'">
            <p v-if="idiom.derivation" class="card__text">{{ idiom.derivation }}</p>
            <p v-if="idiom.example" class="classic-example">
              <span class="classic-example__label">古文例句</span>{{ idiom.example }}
            </p>
            <p v-if="!idiom.derivation && !idiom.example" class="card__text">暂无</p>
          </van-collapse-item>
        </van-collapse>
      </section>

      <!-- 标签 -->
      <section v-if="tags.length" class="card">
        <h3 class="card__title">标签</h3>
        <div class="tag-chips">
          <span v-for="t in tags" :key="t" class="tag-chip">{{ t }}</span>
        </div>
      </section>

      <div class="detail__foot">已自动加入学习库 · 可前往「学习库」管理</div>
    </div>

    <!-- 掌握程度选择 -->
    <MasteryPicker
      :show="masteryPickOpen"
      :current="libItem?.mastery ?? 0"
      @update:show="(v: boolean) => (masteryPickOpen = v)"
      @confirm="setMastery"
    />
  </div>
</template>

<style scoped>
.detail {
  min-height: 100%;
}

.detail__content {
  padding: 0 12px 24px;
}

/* 头部 */
.header {
  position: relative;
  background: var(--cy-card);
  border-radius: var(--cy-radius-lg);
  padding: 24px 16px 18px;
  margin: 12px 0;
  text-align: center;
  box-shadow: var(--cy-shadow-sm);
}

.header__word {
  font-size: 44px;
  font-weight: 700;
  letter-spacing: 4px;
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  color: var(--cy-text-primary);
}

.header__pinyin {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 8px;
  margin-top: 10px;
  color: var(--cy-text-tertiary);
  font-size: var(--cy-font-sm);
}

.syl {
  background: var(--cy-bg);
  padding: 2px 8px;
  border-radius: 6px;
}

.header__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}

.act-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border: 1px solid var(--cy-border);
  background: var(--cy-card);
  border-radius: 999px;
  font-size: var(--cy-font-sm);
  color: var(--cy-text-secondary);
  cursor: pointer;
}
.act-btn.is-active {
  color: var(--cy-primary);
  border-color: var(--cy-primary);
  background: var(--cy-primary-soft);
}

.header__badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--cy-primary);
  color: #fff;
  font-size: var(--cy-font-xs);
  padding: 3px 10px;
  border-radius: 999px;
}

/* 卡片 */
.card {
  background: var(--cy-card);
  border-radius: var(--cy-radius-md);
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: var(--cy-shadow-sm);
}

.card__title {
  font-size: var(--cy-font-md);
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--cy-text-primary);
  display: flex;
  align-items: center;
}
.card__title::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 2px;
  background: var(--cy-primary);
  margin-right: 8px;
}

.card__text {
  font-size: var(--cy-font-md);
  line-height: 1.7;
  color: var(--cy-text-primary);
  word-break: break-all;
}

.card__notes {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--cy-bg);
  border-radius: var(--cy-radius-sm);
}

.card__notes-label {
  color: var(--cy-primary);
  font-weight: 600;
  font-size: var(--cy-font-sm);
  margin-right: 6px;
}

.card__notes p {
  margin-top: 4px;
  font-size: var(--cy-font-sm);
  line-height: 1.7;
  color: var(--cy-text-secondary);
}

.card--warn {
  border-left: 4px solid var(--cy-warning);
}

/* 情感色彩 */
.sentiment-chip {
  display: inline-block;
  padding: 5px 16px;
  border-radius: 999px;
  font-size: var(--cy-font-md);
  font-weight: 600;
}
.sentiment-chip.is-pos {
  background: #e8f5e9;
  color: var(--cy-success);
}
.sentiment-chip.is-neg {
  background: #fdecea;
  color: var(--cy-danger, #ee0a24);
}
.sentiment-chip.is-mixed {
  background: #fff7e6;
  color: var(--cy-warning);
}
.sentiment-chip.is-neutral {
  background: var(--cy-bg);
  color: var(--cy-text-secondary);
}

/* 逐字释义 */
.char-meanings {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.char-cell {
  flex: 1 1 calc(50% - 10px);
  min-width: 120px;
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 12px;
  background: var(--cy-bg);
  border-radius: var(--cy-radius-sm);
}
.char-cell__char {
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 700;
  font-family: 'Songti SC', 'Noto Serif CJK SC', serif;
  color: var(--cy-primary);
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.char-cell__pin {
  font-size: var(--cy-font-xs);
  font-weight: 400;
  color: var(--cy-text-tertiary);
}
.char-cell__meaning {
  font-size: var(--cy-font-sm);
  line-height: 1.5;
  color: var(--cy-text-secondary);
}

/* 典故 · 古文例句 */
.classic-example {
  margin-top: 10px;
  font-size: var(--cy-font-sm);
  line-height: 1.7;
  color: var(--cy-text-secondary);
}
.classic-example__label {
  color: var(--cy-text-tertiary);
  margin-right: 6px;
}

/* 例句 */
.example-list {
  list-style: none;
}

.example-item {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--cy-divider);
}
.example-item:last-child {
  border-bottom: none;
}

.example-item__no {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--cy-primary-soft);
  color: var(--cy-primary);
  font-size: var(--cy-font-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.example-item__text {
  font-size: var(--cy-font-sm);
  line-height: 1.7;
  color: var(--cy-text-secondary);
}

/* 近反义词 */
.synant {
  display: flex;
  gap: 10px;
}

.synant__label {
  flex-shrink: 0;
  width: 48px;
  font-size: var(--cy-font-sm);
  color: var(--cy-text-tertiary);
  padding-top: 5px;
}

.synant__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: var(--cy-font-sm);
  cursor: pointer;
}
.chip--syn {
  background: var(--cy-primary-soft);
  color: var(--cy-primary);
}
.chip--ant {
  background: #e8f5e9;
  color: var(--cy-success);
}

/* 标签 */
.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 4px 10px;
  background: var(--cy-bg);
  border-radius: 6px;
  font-size: var(--cy-font-xs);
  color: var(--cy-text-secondary);
}

.detail__foot {
  text-align: center;
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
  padding: 8px 0 4px;
}
</style>
