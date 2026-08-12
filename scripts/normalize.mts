/**
 * M1-2 规范化：去重、校验、派生 pinyinPlain / abbrev / len / id。
 */
import { NORMALIZED_DIR, SOURCE_FILE, readJson, writeJson, ensureDir, log, warn, error, isMain } from './_shared.ts'
import { stripTones, computeAbbrev } from './pinyin.ts'

interface SourceIdiom {
  word?: string
  pinyin?: string
  abbreviation?: string
  explanation?: string
  derivation?: string
  example?: string
}

export interface NormalizedIdiom {
  id: number
  word: string
  pinyin: string
  abbreviation: string
  pinyinPlain: string
  abbrev: string
  explanation: string
  derivation: string
  example: string
  tags: string[]
  len: number
  hot: number
  curated?: {
    tier: number
    examples: string[]
    synonyms: string[]
    antonyms: string[]
    misuse: string
    notes: string
  }
}

const NORMALIZED_FILE = `${NORMALIZED_DIR}/idiom.normalized.json`
const DUPLICATES_FILE = `${NORMALIZED_DIR}/duplicates.json`
const INVALID_FILE = `${NORMALIZED_DIR}/invalid.json`

function normalizeExample(example: string | undefined): string {
  const e = (example ?? '').trim()
  // 源数据用「无」表示没有例句
  return e === '无' ? '' : e
}

export function main(): void {
  ensureDir(NORMALIZED_DIR)
  const source = readJson<SourceIdiom[]>(SOURCE_FILE)
  log('normalize', `读取源数据 ${source.length} 条`)

  const seen = new Map<string, SourceIdiom[]>()
  for (const item of source) {
    const w = item.word ?? ''
    if (!seen.has(w)) seen.set(w, [])
    seen.get(w)!.push(item)
  }

  const duplicates: string[] = []
  const invalid: Array<{ word: string; reason: string }> = []
  const out: NormalizedIdiom[] = []

  let id = 0
  let sourceAbbrevMismatch = 0
  let exampleMissing = 0

  for (const [word, items] of seen) {
    if (!word) {
      invalid.push({ word, reason: 'word 为空' })
      continue
    }
    const first = items[0]
    const pinyin = (first.pinyin ?? '').trim()
    if (!pinyin) {
      invalid.push({ word, reason: 'pinyin 为空' })
      continue
    }
    if (items.length > 1) duplicates.push(word)

    const pinyinPlain = stripTones(pinyin)
    const abbrev = computeAbbrev(pinyin)
    // 源 abbreviation 字段（即简拼）若与计算值不一致，以计算值为准并记日志
    const srcAbbrev = (first.abbreviation ?? '').toLowerCase().replace(/\s+/g, '')
    if (srcAbbrev && srcAbbrev !== abbrev) sourceAbbrevMismatch++

    const example = normalizeExample(first.example)
    if (!example) exampleMissing++

    out.push({
      id: id++,
      word,
      pinyin,
      abbreviation: srcAbbrev || abbrev,
      pinyinPlain,
      abbrev,
      explanation: (first.explanation ?? '').trim(),
      derivation: (first.derivation ?? '').trim(),
      example,
      tags: [],
      len: [...word].length,
      hot: 0,
    })
  }

  writeJson(NORMALIZED_FILE, out)
  writeJson(DUPLICATES_FILE, duplicates)
  writeJson(INVALID_FILE, invalid)

  log('normalize', `通过 ${out.length} 条 | 重复 ${duplicates.length} | 非法 ${invalid.length} | 简拼不一致 ${sourceAbbrevMismatch} | 缺例句 ${exampleMissing}`)
  if (duplicates.length) warn('normalize', `重复词示例：${duplicates.slice(0, 10).join('、')}`)
  if (invalid.length) warn('normalize', `非法词示例：${invalid.slice(0, 10).map((i) => `${i.word || '(空)'}(${i.reason})`).join('、')}`)
}

if (isMain(import.meta.url)) main()
