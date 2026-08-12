<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useSearchStore } from '@/stores/search'
import { useLibraryStore } from '@/stores/library'
import { useDictStore } from '@/stores/dict'
import type { Idiom, SearchResultItem } from '@/types/idiom'

defineOptions({ name: 'HomeView' })

const router = useRouter()
const search = useSearchStore()
const library = useLibraryStore()
const dict = useDictStore()

const composing = ref(false)
const searchWrapRef = ref<HTMLElement>()
const curated = ref<Idiom[]>([])
const curatedLoading = ref(true)
let curatedTimer = 0

onMounted(() => {
  // IME 组合输入门控：直接监听底层 input 的 composition 事件
  const input = searchWrapRef.value?.querySelector('input')
  input?.addEventListener('compositionstart', onCompositionStart)
  input?.addEventListener('compositionend', onCompositionEnd)

  void library.ensureLoaded()
  void search.loadHistory()

  // 延迟加载精选成语，保证首屏轻量
  curatedTimer = window.setTimeout(async () => {
    try {
      curated.value = await dict.getCuratedWords(12)
    } catch {
      curatedLoading.value = false
    } finally {
      curatedLoading.value = false
    }
  }, 300)
})

onBeforeUnmount(() => window.clearTimeout(curatedTimer))

const showResults = computed(() => search.hasQuery)
const todayDueCount = computed(() => library.todayDueCount)

function onInput(q: string) {
  search.setQuery(q)
  if (!composing.value) search.scheduleSearch()
}
function onCompositionStart() {
  composing.value = true
}
function onCompositionEnd() {
  composing.value = false
  search.scheduleSearch()
}
async function onSubmit() {
  if (!search.hasQuery) return
  await search.recordHistory(search.query)
  await search.runSearch()
}
async function onResultTap(item: SearchResultItem) {
  await search.recordHistory(search.query)
  router.push({ name: 'idiom-detail', params: { word: item.word } })
}
function onHistoryTap(q: string) {
  search.setQuery(q)
  void search.runSearch()
}
function onCuratedTap(item: Idiom) {
  router.push({ name: 'idiom-detail', params: { word: item.word } })
}
function onSearchClear() {
  search.setQuery('')
  search.results = []
  search.searched = false
}
function onInstallTap() {
  showToast('稍后在「设置」中安装')
}
</script>

<template>
  <div class="home">
    <div class="home__brand">
      <span class="brand-mark">成</span>
      <div class="brand-text">
        <div class="brand-title">成语学习</div>
        <div class="brand-sub">搜一搜 · 自动入库 · 越用越懂你</div>
      </div>
    </div>

    <div class="home__search" ref="searchWrapRef">
      <van-search
        v-model="search.query"
        placeholder="搜索成语：汉字 / 拼音 / 简拼"
        shape="round"
        background="transparent"
        show-action
        clearable
        :action-text="composing ? '输入中' : '搜索'"
        @update:model-value="onInput"
        @search="onSubmit"
        @clear="onSearchClear"
      >
      </van-search>
    </div>

    <!-- 结果视图 -->
    <div v-if="showResults" class="home__results">
      <template v-if="search.searching && !search.searched">
        <van-skeleton title :row="3" v-for="n in 4" :key="n" style="padding: 12px 0" />
      </template>
      <template v-else-if="search.isEmpty">
        <van-empty image="search" description="未找到相关成语，试试其他写法" />
      </template>
      <template v-else>
        <ul class="result-list">
          <li
            v-for="item in search.results"
            :key="item.word"
            class="result-item"
            @click="onResultTap(item)"
          >
            <div class="result-item__main">
              <div class="result-item__top">
                <span class="result-item__word">{{ item.word }}</span>
                <van-tag v-if="item.hot > 0" type="danger" plain size="medium">精选</van-tag>
              </div>
              <div class="result-item__pinyin">{{ item.pinyinPlain }}</div>
            </div>
            <van-icon name="arrow" class="result-item__arrow" />
          </li>
        </ul>
      </template>
    </div>

    <!-- 首页内容 -->
    <div v-else class="home__content">
      <!-- 今日复习卡 -->
      <div
        v-if="todayDueCount > 0"
        class="review-card"
        @click="router.push({ name: 'review' })"
      >
        <div class="review-card__icon">📖</div>
        <div class="review-card__body">
          <div class="review-card__title">今日复习</div>
          <div class="review-card__desc">有 {{ todayDueCount }} 个成语到期，点击开始复习</div>
        </div>
        <van-icon name="arrow" />
      </div>

      <!-- 搜索历史 -->
      <section v-if="search.history.length" class="section">
        <div class="section__head">
          <span class="section__title">搜索历史</span>
          <span class="section__clear" @click="search.clearHistory()">清空</span>
        </div>
        <div class="history-chips">
          <span
            v-for="h in search.history"
            :key="h.query"
            class="history-chip"
            @click="onHistoryTap(h.query)"
          >
            {{ h.query }}
          </span>
        </div>
      </section>

      <!-- 精选成语 -->
      <section class="section">
        <div class="section__head">
          <span class="section__title">精选成语</span>
          <span class="section__sub" v-if="curated.length">点击查看详情 · 自动加入学习库</span>
        </div>
        <van-skeleton v-if="curatedLoading" title :row="4" style="padding: 12px 0" />
        <ul v-else-if="curated.length" class="curated-list">
          <li
            v-for="item in curated"
            :key="item.word"
            class="curated-item"
            @click="onCuratedTap(item)"
          >
            <div class="curated-item__word">{{ item.word }}</div>
            <div class="curated-item__pinyin">{{ item.pinyin }}</div>
            <div class="curated-item__exp">{{ item.explanation }}</div>
          </li>
        </ul>
        <van-empty v-else description="暂无精选内容" />
      </section>

      <div class="home__install" @click="onInstallTap">安装应用到手机 · 完全离线可用</div>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100%;
}

.home__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px 4px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--cy-primary);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  font-family: serif;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--cy-shadow-sm);
}

.brand-title {
  font-size: var(--cy-font-xl);
  font-weight: 700;
}

.brand-sub {
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
  margin-top: 2px;
}

.home__search {
  padding: 8px 8px 4px;
}

.home__results,
.home__content {
  padding: 4px 12px 20px;
}

/* 结果列表 */
.result-list {
  background: var(--cy-card);
  border-radius: var(--cy-radius-md);
  box-shadow: var(--cy-shadow-sm);
  overflow: hidden;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 14px 14px;
  border-bottom: 1px solid var(--cy-divider);
  cursor: pointer;
  transition: background 0.15s;
}
.result-item:last-child {
  border-bottom: none;
}
.result-item:active {
  background: var(--cy-primary-soft);
}

.result-item__main {
  flex: 1;
  min-width: 0;
}

.result-item__top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-item__word {
  font-size: var(--cy-font-lg);
  font-weight: 600;
}

.result-item__pinyin {
  font-size: var(--cy-font-sm);
  color: var(--cy-text-tertiary);
  margin-top: 3px;
}

.result-item__arrow {
  color: var(--cy-text-tertiary);
}

/* 复习卡 */
.review-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #c62828, #ef5350);
  color: #fff;
  border-radius: var(--cy-radius-lg);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--cy-shadow-md);
  cursor: pointer;
}

.review-card__icon {
  font-size: 28px;
}

.review-card__body {
  flex: 1;
}

.review-card__title {
  font-size: var(--cy-font-lg);
  font-weight: 700;
}

.review-card__desc {
  font-size: var(--cy-font-sm);
  opacity: 0.92;
  margin-top: 2px;
}

/* 区块 */
.section {
  margin-top: 16px;
}

.section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section__title {
  font-size: var(--cy-font-md);
  font-weight: 700;
}

.section__sub {
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
}

.section__clear {
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
  cursor: pointer;
}

.history-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-chip {
  padding: 6px 12px;
  background: var(--cy-card);
  border-radius: 999px;
  font-size: var(--cy-font-sm);
  color: var(--cy-text-secondary);
  box-shadow: var(--cy-shadow-sm);
  cursor: pointer;
}

/* 精选列表 */
.curated-list {
  background: var(--cy-card);
  border-radius: var(--cy-radius-md);
  box-shadow: var(--cy-shadow-sm);
  overflow: hidden;
}

.curated-item {
  padding: 12px 14px;
  border-bottom: 1px solid var(--cy-divider);
  cursor: pointer;
}
.curated-item:last-child {
  border-bottom: none;
}
.curated-item:active {
  background: var(--cy-primary-soft);
}

.curated-item__word {
  font-size: var(--cy-font-lg);
  font-weight: 600;
  color: var(--cy-primary);
}

.curated-item__pinyin {
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
  margin-top: 2px;
}

.curated-item__exp {
  font-size: var(--cy-font-sm);
  color: var(--cy-text-secondary);
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.home__install {
  margin-top: 20px;
  text-align: center;
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
  text-decoration: underline;
  cursor: pointer;
}
</style>
