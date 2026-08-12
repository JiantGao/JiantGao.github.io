/**
 * M1-3 精编合并：读取 data/curated/curated-*.json，校验后挂载到规范化详情，并折算热度。
 * 校验规则：word 必须存在于全集中；tier 1-5；tier1 需 examples≥3；examples 非空。
 */
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { CURATED_DIR, NORMALIZED_DIR, readJson, writeJson, log, warn, error, isMain } from './_shared.ts'
import type { NormalizedIdiom } from './normalize.mts'

export interface CuratedItem {
  word: string
  tier: 1 | 2 | 3 | 4 | 5
  examples: string[]
  synonyms: string[]
  antonyms: string[]
  misuse: string
  notes: string
}

const NORMALIZED_FILE = `${NORMALIZED_DIR}/idiom.normalized.json`

export function main(): void {
  const files = readdirSync(CURATED_DIR)
    .filter((f) => /^curated-\d+\.json$/.test(f))
    .sort()
  if (!files.length) {
    log('curated', '无精编文件，跳过合并')
    return
  }

  const items = files.flatMap((f) => {
    const data = readJson<CuratedItem[] | { items: CuratedItem[] }>(resolve(CURATED_DIR, f))
    return Array.isArray(data) ? data : data.items
  })
  log('curated', `读取精编 ${files.length} 个文件共 ${items.length} 条`)

  const normalized = readJson<NormalizedIdiom[]>(NORMALIZED_FILE)
  const byWord = new Map(normalized.map((n) => [n.word, n]))

  // 校验
  const unknown: string[] = []
  const violations: string[] = []
  const applied: string[] = []

  for (const item of items) {
    const target = byWord.get(item.word)
    if (!target) {
      unknown.push(item.word)
      continue
    }
    if (!Number.isInteger(item.tier) || item.tier < 1 || item.tier > 5) {
      violations.push(`${item.word}: tier 非法`)
    }
    if (!item.examples?.length) violations.push(`${item.word}: examples 为空`)
    if (item.tier === 1 && item.examples.length < 3) violations.push(`${item.word}: tier1 例句数 < 3`)
    const syn = item.synonyms ?? []
    const ant = item.antonyms ?? []
    if (syn.includes(item.word)) violations.push(`${item.word}: synonyms 含自身`)
    if (ant.includes(item.word)) violations.push(`${item.word}: antonyms 含自身`)
    if (violations.length) continue
  }

  if (unknown.length) {
    error('curated', `以下精编词不在全量词典中（共 ${unknown.length} 个）：`)
    for (const w of unknown.slice(0, 50)) error('curated', `  - ${w}`)
    throw new Error(`精编数据包含 ${unknown.length} 个未知词，构建中止`)
  }
  if (violations.length) {
    error('curated', `精编数据校验失败（共 ${violations.length} 条）：`)
    for (const v of violations.slice(0, 50)) error('curated', `  - ${v}`)
    throw new Error(`精编数据校验失败，构建中止`)
  }

  // 合并
  let tier1Count = 0
  for (const item of items) {
    const target = byWord.get(item.word)!
    target.curated = {
      tier: item.tier,
      examples: item.examples,
      synonyms: item.synonyms ?? [],
      antonyms: item.antonyms ?? [],
      misuse: item.misuse ?? '',
      notes: item.notes ?? '',
    }
    target.hot = 6 - item.tier
    if (item.tier === 1) tier1Count++
    applied.push(item.word)
  }

  writeJson(NORMALIZED_FILE, normalized)
  log('curated', `合并成功 ${applied.length} 条（tier1 ${tier1Count}）`)
}

if (isMain(import.meta.url)) main()
