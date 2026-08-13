<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import type { SearchResultItem } from '@/types/idiom'

defineOptions({ name: 'HomeView' })

const router = useRouter()
const search = useSearchStore()

const composing = ref(false)
const searchWrapRef = ref<HTMLElement>()
const appVersion = __APP_VERSION__

onMounted(() => {
  // IME 组合输入门控：直接监听底层 input 的 composition 事件
  const input = searchWrapRef.value?.querySelector('input')
  input?.addEventListener('compositionstart', onCompositionStart)
  input?.addEventListener('compositionend', onCompositionEnd)
})

const showResults = computed(() => search.hasQuery)

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
function onSearchClear() {
  search.setQuery('')
  search.results = []
  search.searched = false
}
</script>

<template>
  <div class="home">
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
      />
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

    <!-- 空态提示 -->
    <div v-else class="home__empty">
      <div class="home__empty-mark">成</div>
      <p class="home__empty-hint">输入汉字、拼音或首字母简拼，搜索并自动加入学习库</p>
      <p class="home__empty-ver">v{{ appVersion }}</p>
    </div>
  </div>
</template>

<style scoped>
.home {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.home__search {
  padding: 14px 8px 4px;
}

.home__results {
  padding: 4px 12px 20px;
  flex: 1;
}

/* 空态 */
.home__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 40px 60px;
}

.home__empty-mark {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: var(--cy-primary);
  color: #fff;
  font-size: 40px;
  font-weight: 700;
  font-family: serif;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--cy-shadow-md);
}

.home__empty-hint {
  margin-top: 16px;
  font-size: var(--cy-font-sm);
  color: var(--cy-text-tertiary);
  text-align: center;
  line-height: 1.7;
}

.home__empty-ver {
  margin-top: 8px;
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
  opacity: 0.6;
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
</style>
