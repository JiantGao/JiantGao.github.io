import { defineStore } from 'pinia'
import { db } from '@/db'
import type { LibraryItem, LibrarySort, LibraryTab, MasteryLevel } from '@/types/library'
import { formatDate, endOfDay } from '@/utils/date'
import { calcDueForBox } from '@/modules/srs/schedule'

export const useLibraryStore = defineStore('library', {
  state: () => ({
    items: [] as LibraryItem[],
    loaded: false,
    tab: 'all' as LibraryTab,
    sort: 'addedDesc' as LibrarySort,
  }),
  getters: {
    visibleItems(state): LibraryItem[] {
      const now = Date.now()
      const dueDeadline = endOfDay(now)
      let list = state.items
      switch (state.tab) {
        case 'all':
          list = list.filter((i) => !i.isRemoved)
          break
        case 'favorite':
          list = list.filter((i) => !i.isRemoved && i.favorite === 1)
          break
        case 'mastered':
          list = list.filter((i) => !i.isRemoved && i.mastery >= 3)
          break
        case 'todayDue':
          list = list.filter((i) => !i.isRemoved && i.dueDate > 0 && i.dueDate <= dueDeadline)
          break
        case 'removed':
          list = list.filter((i) => i.isRemoved === 1)
          break
      }
      const copy = [...list]
      switch (state.sort) {
        case 'addedDesc':
          copy.sort((a, b) => b.addedAt - a.addedAt)
          break
        case 'masteryDesc':
          copy.sort((a, b) => b.mastery - a.mastery || b.addedAt - a.addedAt)
          break
        case 'dueAsc':
          copy.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0) || b.addedAt - a.addedAt)
          break
        case 'pinyinAsc':
          copy.sort((a, b) => a.abbreviation.localeCompare(b.abbreviation) || b.addedAt - a.addedAt)
          break
      }
      return copy
    },
    totalCount: (s) => s.items.filter((i) => !i.isRemoved).length,
    masteredCount: (s) => s.items.filter((i) => !i.isRemoved && i.mastery >= 3).length,
    favoriteCount: (s) => s.items.filter((i) => !i.isRemoved && i.favorite === 1).length,
    todayDueCount: (s) => {
      const d = endOfDay(Date.now())
      return s.items.filter((i) => !i.isRemoved && i.dueDate > 0 && i.dueDate <= d).length
    },
    removedCount: (s) => s.items.filter((i) => i.isRemoved === 1).length,
  },
  actions: {
    async ensureLoaded() {
      if (this.loaded) return
      this.items = await db.library.toArray()
      this.loaded = true
    },

    /** 打开详情时自动入库并记录查看 */
    async recordView(word: string, meta: { pinyin?: string; abbreviation?: string }) {
      await this.ensureLoaded()
      const now = Date.now()
      const existing = await db.library.get(word)
      if (existing) {
        await db.library.update(word, {
          searchCount: (existing.searchCount || 0) + 1,
          lastViewedAt: now,
          updatedAt: now,
        })
      } else {
        const item: LibraryItem = {
          word,
          pinyin: meta.pinyin ?? '',
          abbreviation: meta.abbreviation ?? '',
          addedAt: now,
          updatedAt: now,
          mastery: 0,
          favorite: 0,
          isRemoved: 0,
          note: '',
          searchCount: 1,
          lastViewedAt: now,
          box: 0,
          dueDate: calcDueForBox(0, now),
          lastReviewedAt: 0,
        }
        await db.library.add(item)
      }
      // 记录查看事件
      const date = formatDate(now)
      await db.events.add({ ts: now, date, word, type: 'view', outcome: '', durationSec: undefined })
      await this.loadItems()
    },

    async getItem(word: string): Promise<LibraryItem | undefined> {
      return db.library.get(word)
    },

    async toggleFavorite(word: string) {
      const item = await db.library.get(word)
      if (!item) return
      await db.library.update(word, { favorite: item.favorite ? 0 : 1, updatedAt: Date.now() })
      await this.loadItems()
    },

    async setMastery(word: string, mastery: MasteryLevel) {
      const item = await db.library.get(word)
      if (!item) return
      const now = Date.now()
      await db.library.update(word, { mastery, updatedAt: now })
      const date = formatDate(now)
      await db.events.add({ ts: now, date, word, type: 'mastery', outcome: mastery >= 3 ? 'ok' : '', durationSec: undefined })
      await this.loadItems()
    },

    async setNote(word: string, note: string) {
      await db.library.update(word, { note, updatedAt: Date.now() })
      await this.loadItems()
    },

    /** 软删除（移除） */
    async remove(word: string) {
      await db.library.update(word, { isRemoved: 1, updatedAt: Date.now() })
      await this.loadItems()
    },

    /** 恢复 */
    async restore(word: string) {
      await db.library.update(word, { isRemoved: 0, updatedAt: Date.now() })
      await this.loadItems()
    },

    /** 彻底删除 */
    async deletePermanent(word: string) {
      await db.library.delete(word)
      await db.events.where('word').equals(word).delete()
      await this.loadItems()
    },

    /** 搜索结果全量入库（设置项开启时调用） */
    async bulkAddWords(words: Array<{ word: string; pinyinPlain?: string; abbrev?: string }>) {
      await this.ensureLoaded()
      const now = Date.now()
      for (const w of words) {
        const existing = await db.library.get(w.word)
        if (existing || w.word.includes('·')) continue
        await db.library.add({
          word: w.word,
          pinyin: '',
          abbreviation: w.abbrev ?? '',
          addedAt: now,
          updatedAt: now,
          mastery: 0,
          favorite: 0,
          isRemoved: 0,
          note: '',
          searchCount: 1,
          lastViewedAt: now,
          box: 0,
          dueDate: calcDueForBox(0, now),
          lastReviewedAt: 0,
        })
      }
      await this.loadItems()
    },

    async loadItems() {
      this.items = await db.library.toArray()
    },
  },
})
