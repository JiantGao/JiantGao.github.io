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

defineOptions({ name: 'IdiomDetailView' })

const route = useRoute()
const router = useRouter()
const dict = useDictStore()
const library = useLibraryStore()

const idiom = ref<Idiom | null>(null)
const loading = ref(true)
const notFound = ref(false)
const libItem = ref<LibraryItem | null>(null)
const masteryPickOpen = ref(false)

const word = computed(() => (route.params.word as string) || '')
const syllables = computed(() => (idiom.value?.pinyin ?? '').trim().split(/\s+/).filter(Boolean))

const examples = computed<string[]>(() => {
  const c = idiom.value?.curated
  if (c?.examples?.length) return c.examples
  if (idiom.value?.example) return [idiom.value.example]
  return []
})
const synonyms = computed(() => idiom.value?.curated?.synonyms ?? [])
const antonyms = computed(() => idiom.value?.curated?.antonyms ?? [])
const tags = computed(() => idiom.value?.tags ?? [])

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

      <!-- 释义 -->
      <section class="card">
        <h3 class="card__title">释义</h3>
        <p class="card__text">{{ idiom.explanation }}</p>
        <div v-if="idiom.curated?.notes" class="card__notes">
          <span class="card__notes-label">引申义</span>
          <p>{{ idiom.curated.notes }}</p>
        </div>
      </section>

      <!-- 出处典故 -->
      <section v-if="idiom.derivation" class="card">
        <h3 class="card__title">出处 · 典故</h3>
        <p class="card__text">{{ idiom.derivation }}</p>
      </section>

      <!-- 例句 -->
      <section class="card">
        <h3 class="card__title">实用例句</h3>
        <template v-if="examples.length">
          <ol class="example-list">
            <li v-for="(ex, i) in examples" :key="i" class="example-item">
              <span class="example-item__no">{{ i + 1 }}</span>
              <span class="example-item__text">{{ ex }}</span>
            </li>
          </ol>
        </template>
        <van-empty v-else image="search" description="暂无例句，可添加笔记记录用法" />
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
