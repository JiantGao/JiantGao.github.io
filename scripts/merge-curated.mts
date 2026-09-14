/**
 * M1-3 精编合并：读取 data/curated/curated-*.json，校验后挂载到规范化详情，并折算热度。
 * 校验规则：word 必须存在于全集中；tier 1-5；tier1 需 examples≥3；examples 非空。
 */
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { CURATED_DIR, NORMALIZED_DIR, readJson, writeJson, log, warn, error, isMain } from './_shared.ts'
import type { NormalizedIdiom } from './normalize.mts'
import { stripTones, computeAbbrev } from './pinyin.ts'

export interface CuratedCharMeaning {
  char: string
  meaning: string
  pinyin?: string
}

export interface CuratedItem {
  word: string
  tier: 1 | 2 | 3 | 4 | 5
  /** 情感色彩（褒贬义），如「褒义」「贬义」「中性」「亦褒亦贬」 */
  sentiment: string
  /** 使用对象 / 适用语境 */
  usage: string
  /** 逐字释义 */
  charMeanings: CuratedCharMeaning[]
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

  // 全量词典可能未收录个别高频成语；为它们补充拼音并追加为词典词条，
  // 使其既能被精编合并，也能被前端搜索到。
  const EXTRA_PINYIN: Record<string, string> = {
    莘莘学子: 'shēn shēn xué zǐ',
    恪尽职守: 'kè jìn zhí shǒu',
    天道酬勤: 'tiān dào chóu qín',
    水滴穿石: 'shuǐ dī chuān shí',
    退而结网: 'tuì ér jié wǎng',
    一丝曙光: 'yì sī shǔ guāng',
    千里马常有而伯乐不常有: 'qiān lǐ mǎ cháng yǒu ér bó lè bù cháng yǒu',
  }

  let nextId = normalized.length
  for (const item of items) {
    if (byWord.has(item.word)) continue
    const pinyin = EXTRA_PINYIN[item.word]
    if (!pinyin) {
      throw new Error(`精编词「${item.word}」不在全量词典中，且未在 EXTRA_PINYIN 中提供拼音，请补充后重试`)
    }
    normalized.push({
      id: nextId++,
      word: item.word,
      pinyin,
      abbreviation: computeAbbrev(pinyin),
      pinyinPlain: stripTones(pinyin),
      abbrev: computeAbbrev(pinyin),
      explanation: item.notes,
      derivation: '',
      example: item.examples[0] ?? '',
      tags: [],
      len: item.word.length,
      hot: 6 - item.tier,
    })
    byWord.set(item.word, normalized[normalized.length - 1])
    log('curated', `追加词典词条：${item.word}`)
  }

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
    if (!item.sentiment) violations.push(`${item.word}: sentiment 缺失`)
    if (!item.usage) violations.push(`${item.word}: usage 缺失`)
    if (!item.charMeanings?.length) violations.push(`${item.word}: charMeanings 为空`)
    else {
      // 词条可能含标点（如「项庄舞剑，意在沛公」），逐字拼接后与词条去标点比较
      const spelled = item.charMeanings.map((c) => c.char).join('')
      const norm = (s: string) => s.replace(/[\s，。、：；！？,./:;!?（）()]/g, '')
      if (norm(spelled) !== norm(item.word)) violations.push(`${item.word}: charMeanings 拼字不符（${spelled}）`)
      const badChar = item.charMeanings.some((c) => !c.char || !c.meaning)
      if (badChar) violations.push(`${item.word}: charMeanings 存在空字段`)
    }
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
      sentiment: item.sentiment,
      usage: item.usage,
      charMeanings: item.charMeanings,
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
