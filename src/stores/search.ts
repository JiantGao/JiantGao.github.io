import { defineStore } from 'pinia'
import { db, type SearchHistoryItem } from '@/db'
import type { SearchResultItem } from '@/types/idiom'
import { useDictStore } from './dict'

const HISTORY_LIMIT = 50
const DEBOUNCE_MS = 200

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export const useSearchStore = defineStore('search', {
  state: () => ({
    query: '',
    results: [] as SearchResultItem[],
    searching: false,
    /** 是否已产生过搜索结果（用于结果视图与空结果态） */
    searched: false,
    history: [] as SearchHistoryItem[],
  }),
  getters: {
    hasQuery: (s) => s.query.trim().length > 0,
    isEmpty: (s) => s.searched && s.results.length === 0,
  },
  actions: {
    setQuery(q: string) {
      this.query = q
      this.searched = false
    },

    /** 输入防抖搜索 */
    scheduleSearch() {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => void this.runSearch(), DEBOUNCE_MS)
    },

    /** 立即搜索 */
    async runSearch() {
      const q = this.query.trim()
      if (!q) {
        this.results = []
        this.searched = false
        return
      }
      this.searching = true
      try {
        const dict = useDictStore()
        this.results = await dict.search(q)
      } finally {
        this.searching = false
      }
      this.searched = true
    },

    async loadHistory() {
      this.history = await db.searchHistory.orderBy('lastAt').reverse().limit(HISTORY_LIMIT).toArray()
    },

    /** 记录一次搜索（打开结果/回车时调用） */
    async recordHistory(query: string) {
      const q = query.trim()
      if (!q) return
      const now = Date.now()
      const existing = await db.searchHistory.get(q)
      await db.searchHistory.put(existing ? { ...existing, count: existing.count + 1, lastAt: now } : { query: q, count: 1, lastAt: now })
      const all = await db.searchHistory.toArray()
      if (all.length > HISTORY_LIMIT) {
        const excess = all.sort((a, b) => a.lastAt - b.lastAt).slice(0, all.length - HISTORY_LIMIT)
        await db.searchHistory.bulkDelete(excess.map((e) => e.query))
      }
      await this.loadHistory()
    },

    async clearHistory() {
      await db.searchHistory.clear()
      this.history = []
    },
  },
})
