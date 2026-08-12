import { defineStore } from 'pinia'
import type { Idiom } from '@/types/idiom'
import { dictService, type DictMeta, type IndexFile } from '@/modules/dictionary/service'
import { createSearchEngine, type SearchEngine } from '@/modules/search/engine'

export const useDictStore = defineStore('dict', {
  state: () => ({
    index: null as IndexFile | null,
    indexLoading: false,
    indexError: '',
    meta: null as DictMeta | null,
    engine: null as SearchEngine | null,
  }),
  getters: {
    ready: (s) => s.engine !== null,
    total: (s) => s.index?.count ?? 0,
  },
  actions: {
    /** 加载搜索索引（幂等），并构建搜索引擎 */
    async ensureIndex(): Promise<IndexFile> {
      if (this.index) return this.index
      this.indexLoading = true
      this.indexError = ''
      try {
        const idx = await dictService.ensureIndex()
        this.index = idx
        this.engine = createSearchEngine(idx.records)
        return idx
      } catch (e) {
        this.indexError = e instanceof Error ? e.message : String(e)
        throw e
      } finally {
        this.indexLoading = false
      }
    },

    async loadMeta(): Promise<DictMeta> {
      if (this.meta) return this.meta
      this.meta = await dictService.getMeta()
      return this.meta
    },

    /** 搜索（需先 ensureIndex） */
    async search(q: string, limit = 100) {
      await this.ensureIndex()
      if (!this.engine) return []
      return this.engine.search(q, limit)
    },

    /** 按成语获取详情（加载对应分块） */
    async getDetail(word: string): Promise<Idiom | undefined> {
      await this.ensureIndex()
      return dictService.getDetailByWord(word)
    },

    /** 精选成语详情（取精编清单中 tier 最优的前 N 条） */
    async getCuratedWords(limit = 12): Promise<Idiom[]> {
      const man = await dictService.loadCuratedManifest()
      const sorted = [...man.items].sort((a, b) => a.tier - b.tier || b.hot - a.hot).slice(0, limit)
      const out: Idiom[] = []
      for (const it of sorted) {
        const d = await dictService.getDetailByWord(it.word)
        if (d) out.push(d)
      }
      return out
    },
  },
})
