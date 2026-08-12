import type { IndexRecord } from '@/types/idiom'
import type { NormalizedQuery } from './normalize'

/**
 * 打分权重。与 docs/search-spec.md 保持一致：
 * 汉字：精确 1000 > 前缀 900 > 子串 800 > 顺次子序列 400
 * 拼音：简拼精确 750 > 全拼精确 700 > 简拼前缀 650 > 全拼前缀 600 > 全拼子串 500 > 简拼包含 350
 */

/** 汉字查询打分 */
export function scoreHan(word: string, raw: string): number {
  if (word === raw) return 1000
  if (word.startsWith(raw)) return 900 - raw.length * 5
  const pos = word.indexOf(raw)
  if (pos >= 0) return 800 - pos * 10
  // 顺次子序列：每个字按序出现
  let k = 0
  for (const ch of raw) {
    const found = word.indexOf(ch, k)
    if (found < 0) return 0
    k = found + 1
  }
  return 400
}

/** 拼音查询打分 */
export function scorePinyin(abbrev: string, pinyinPlain: string, qPlain: string): number {
  if (abbrev === qPlain) return 750
  if (abbrev.startsWith(qPlain)) return 650 - qPlain.length * 3
  const plain = pinyinPlain.replace(/\s+/g, '')
  if (plain === qPlain) return 700
  if (plain.startsWith(qPlain)) return 600 - qPlain.length * 3
  const pos = plain.indexOf(qPlain)
  if (pos >= 0) return 500 - pos * 5
  if (abbrev.includes(qPlain)) return 350
  return 0
}

/** 综合打分；score > 0 才命中 */
export function scoreRecord(record: IndexRecord, q: NormalizedQuery): number {
  const [word, pinyinPlain, abbrev] = record
  if (q.hasHan && q.hasLatin) {
    // 混合查询：汉字与拼音双条件 AND
    const han = scoreHan(word, q.raw)
    const latin = scorePinyin(abbrev, pinyinPlain, q.qPlain)
    if (han <= 0 || latin <= 0) return 0
    return han + latin - 20
  }
  if (q.hasHan) return scoreHan(word, q.raw)
  return scorePinyin(abbrev, pinyinPlain, q.qPlain)
}

/** 排名比较：score 降序 → hot 降序 → len 升序 → 拼音字典序 */
export function compareResults(
  a: { score: number; hot: number; len: number; pinyinPlain: string },
  b: { score: number; hot: number; len: number; pinyinPlain: string },
): number {
  if (b.score !== a.score) return b.score - a.score
  if (b.hot !== a.hot) return b.hot - a.hot
  if (a.len !== b.len) return a.len - b.len
  return a.pinyinPlain.localeCompare(b.pinyinPlain)
}
