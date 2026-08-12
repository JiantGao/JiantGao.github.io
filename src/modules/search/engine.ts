import type { IndexRecord, SearchResultItem } from '@/types/idiom'
import { normalizeQuery } from './normalize'
import { scoreRecord, compareResults } from './score'

export interface SearchEngine {
  search(q: string, limit?: number): SearchResultItem[]
  /** 全量条数（供调试/基准） */
  readonly count: number
}

/** 由搜索索引（紧凑数组）创建搜索引擎。全量线性扫描约 3 万条，毫秒级。 */
export function createSearchEngine(records: IndexRecord[]): SearchEngine {
  return {
    count: records.length,
    search(q: string, limit = 100): SearchResultItem[] {
      const nq = normalizeQuery(q)
      if (!nq) return []
      const results: SearchResultItem[] = []
      for (const rec of records) {
        const score = scoreRecord(rec, nq)
        if (score <= 0) continue
        const [word, pinyinPlain, abbrev, hot, id] = rec
        results.push({ id, word, pinyinPlain, abbrev, hot, len: [...word].length, score })
      }
      results.sort(compareResults)
      return results.slice(0, limit)
    },
  }
}
