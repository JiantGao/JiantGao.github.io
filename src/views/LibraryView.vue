<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useLibraryStore } from '@/stores/library'
import type { LibraryItem, LibrarySort, LibraryTab, MasteryLevel } from '@/types/library'
import { MASTERY_LABELS } from '@/types/library'
import { formatDate } from '@/utils/date'
import MasteryPicker from '@/components/common/MasteryPicker.vue'
import NoteEditor from '@/components/common/NoteEditor.vue'

defineOptions({ name: 'LibraryView' })

const router = useRouter()
const library = useLibraryStore()

const sortSheetOpen = ref(false)
const masteryTarget = ref<LibraryItem | null>(null)
const noteTarget = ref<LibraryItem | null>(null)

const tabDefs: Array<{ key: LibraryTab; label: string; count: () => number }> = [
  { key: 'all', label: '全部', count: () => library.totalCount },
  { key: 'favorite', label: '收藏', count: () => library.favoriteCount },
  { key: 'mastered', label: '已掌握', count: () => library.masteredCount },
  { key: 'removed', label: '已移除', count: () => library.removedCount },
]

const sortOptions: Array<{ key: LibrarySort; label: string }> = [
  { key: 'addedDesc', label: '最近搜索' },
  { key: 'masteryDesc', label: '掌握程度' },
  { key: 'pinyinAsc', label: '拼音' },
]
const sortActions = computed(() => sortOptions.map((o) => ({ name: o.label, key: o.key })))

const activeKey = computed(() => tabDefs.findIndex((t) => t.key === library.tab))
const list = computed(() => library.visibleItems)
const isRemovedTab = computed(() => library.tab === 'removed')

onMounted(() => {
  void library.ensureLoaded()
})

onActivated(() => {
  // 从设置页导入/重置返回时刷新
  void library.loadItems()
})

function onTabChange(index: number) {
  library.tab = tabDefs[index].key
}

function onSortChange(k: LibrarySort) {
  library.sort = k
  sortSheetOpen.value = false
}

function onSortSelect(action: { key?: LibrarySort }) {
  if (action.key) onSortChange(action.key)
}

function openDetail(item: LibraryItem) {
  router.push({ name: 'idiom-detail', params: { word: item.word } })
}

function onFavorite(item: LibraryItem) {
  void library.toggleFavorite(item.word)
}

function openMastery(item: LibraryItem) {
  masteryTarget.value = item
}
function onMasteryConfirm(level: MasteryLevel) {
  if (masteryTarget.value) {
    void library.setMastery(masteryTarget.value.word, level)
  }
  masteryTarget.value = null
}

function openNote(item: LibraryItem) {
  noteTarget.value = item
}
function onNoteSave(note: string) {
  if (noteTarget.value) {
    void library.setNote(noteTarget.value.word, note)
  }
  noteTarget.value = null
}

function onRemove(item: LibraryItem) {
  void library.remove(item.word)
  showToast('已从学习库移除')
}

function onRestore(item: LibraryItem) {
  void library.restore(item.word)
  showToast('已恢复')
}

async function onDeletePermanent(item: LibraryItem) {
  try {
    await showConfirmDialog({
      title: '彻底删除',
      message: `确定彻底删除「${item.word}」及其学习记录？此操作不可恢复。`,
      confirmButtonText: '删除',
      confirmButtonColor: '#c62828',
    })
    await library.deletePermanent(item.word)
    showToast('已彻底删除')
  } catch {
    /* 取消 */
  }
}
</script>

<template>
  <div class="library">
    <header class="library__head">
      <div class="library__title">
        学习库
        <span class="library__total">{{ library.totalCount }} 条</span>
      </div>
      <button class="sort-btn" @click="sortSheetOpen = true">
        <van-icon name="sort" />
        {{ sortOptions.find((o) => o.key === library.sort)?.label }}
      </button>
    </header>

    <van-tabs v-model:active="activeKey" shrink animated @change="onTabChange">
      <van-tab v-for="t in tabDefs" :key="t.key">
        <template #title>
          {{ t.label }}
          <span class="tab-count">{{ t.count() }}</span>
        </template>
      </van-tab>
    </van-tabs>

    <div class="library__body">
      <template v-if="list.length">
        <van-swipe-cell v-for="item in list" :key="item.word">
          <div class="lib-item" @click="openDetail(item)">
            <div class="lib-item__main">
              <div class="lib-item__top">
                <span class="lib-item__word">{{ item.word }}</span>
                <span class="lib-item__fav" :class="{ active: item.favorite }" @click.stop="onFavorite(item)">
                  <van-icon :name="item.favorite ? 'star' : 'star-o'" />
                </span>
              </div>
              <div class="lib-item__meta">
                <span class="lib-item__pinyin">{{ item.abbreviation }}</span>
                <span class="lib-item__date">{{ formatDate(item.addedAt) }}加入</span>
              </div>
            </div>
            <div class="lib-item__side">
              <span class="mastery-chip" :style="{ '--mc': `var(--cy-mastery-${item.mastery})` }">
                {{ MASTERY_LABELS[item.mastery] }}
              </span>
            </div>
          </div>

          <template #right>
            <div class="swipe-actions">
              <template v-if="!isRemovedTab">
                <button class="swipe-btn swipe-btn--mastery" @click="openMastery(item)">掌握</button>
                <button class="swipe-btn swipe-btn--note" @click="openNote(item)">笔记</button>
                <button class="swipe-btn swipe-btn--danger" @click="onRemove(item)">移除</button>
              </template>
              <template v-else>
                <button class="swipe-btn swipe-btn--restore" @click="onRestore(item)">恢复</button>
                <button class="swipe-btn swipe-btn--danger" @click="onDeletePermanent(item)">删除</button>
              </template>
            </div>
          </template>
        </van-swipe-cell>
      </template>

      <van-empty v-else :description="isRemovedTab ? '没有已移除的成语' : '学习库还是空的，搜索成语会自动加入'" />
    </div>

    <!-- 排序选择 -->
    <van-action-sheet
      v-model:show="sortSheetOpen"
      :actions="sortActions"
      title="排序方式"
      cancel-text="取消"
      @select="onSortSelect"
    />

    <!-- 掌握程度 / 笔记 -->
    <MasteryPicker
      :show="!!masteryTarget"
      :current="masteryTarget?.mastery ?? 0"
      @update:show="(v: boolean) => v || (masteryTarget = null)"
      @confirm="onMasteryConfirm"
    />
    <NoteEditor
      :show="!!noteTarget"
      :note="noteTarget?.note ?? ''"
      @update:show="(v: boolean) => v || (noteTarget = null)"
      @save="onNoteSave"
    />
  </div>
</template>

<style scoped>
.library {
  min-height: 100%;
}

.library__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 8px;
}

.library__title {
  font-size: var(--cy-font-xl);
  font-weight: 700;
}

.library__total {
  font-size: var(--cy-font-sm);
  font-weight: 400;
  color: var(--cy-text-tertiary);
  margin-left: 8px;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: var(--cy-card);
  color: var(--cy-text-secondary);
  font-size: var(--cy-font-sm);
  padding: 7px 12px;
  border-radius: 999px;
  box-shadow: var(--cy-shadow-sm);
  cursor: pointer;
}

.tab-count {
  margin-left: 3px;
  font-size: 11px;
  color: var(--cy-text-tertiary);
}

.library__body {
  padding: 8px 12px 20px;
}

/* 列表项 */
.lib-item {
  display: flex;
  align-items: center;
  background: var(--cy-card);
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: var(--cy-radius-md);
  box-shadow: var(--cy-shadow-sm);
  cursor: pointer;
}
.lib-item:active {
  background: var(--cy-primary-soft);
}

.lib-item__main {
  flex: 1;
  min-width: 0;
}

.lib-item__top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lib-item__word {
  font-size: var(--cy-font-lg);
  font-weight: 600;
}

.lib-item__fav {
  color: var(--cy-text-tertiary);
  font-size: 16px;
}
.lib-item__fav.active {
  color: #f9a825;
}

.lib-item__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.lib-item__pinyin {
  font-size: var(--cy-font-xs);
  color: var(--cy-text-tertiary);
}

.lib-item__date {
  font-size: 11px;
  color: var(--cy-text-tertiary);
}

.lib-item__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin-left: 8px;
}

.mastery-chip {
  font-size: 11px;
  color: var(--mc, var(--cy-mastery-0));
  border: 1px solid var(--mc, var(--cy-mastery-0));
  padding: 1px 8px;
  border-radius: 999px;
}

/* 滑动操作 */
.swipe-actions {
  display: flex;
  height: 100%;
}

.swipe-btn {
  width: 64px;
  border: none;
  color: #fff;
  font-size: var(--cy-font-sm);
  cursor: pointer;
}
.swipe-btn--mastery {
  background: var(--cy-primary);
}
.swipe-btn--note {
  background: #5c9ce6;
}
.swipe-btn--danger {
  background: var(--cy-danger);
}
.swipe-btn--restore {
  background: var(--cy-success);
}
</style>
