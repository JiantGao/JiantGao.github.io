/**
 * M1-4 产物生成：分块详情 + 紧凑搜索索引 + meta + 精编清单 → src/data/generated/
 * 产物确定性生成（不含时间戳），可复现提交。
 */
import { existsSync, readFileSync } from 'node:fs'
import { CHUNK_SIZE, GENERATED_DIR, NORMALIZED_DIR, SHA_FILE, SOURCE_FILE, ensureDir, log, warn, writeJson, readJson, fileSha256, isMain } from './_shared.ts'
import type { NormalizedIdiom } from './normalize.mts'

const NORMALIZED_FILE = `${NORMALIZED_DIR}/idiom.normalized.json`

interface IndexRecord {
  /** [word, pinyinPlain, abbrev, hot, id] */
  records: Array<[string, string, string, number, number]>
}

export function main(): void {
  ensureDir(GENERATED_DIR)
  const normalized = readJson<NormalizedIdiom[]>(NORMALIZED_FILE)
  const total = normalized.length
  const chunkCount = Math.ceil(total / CHUNK_SIZE)

  // 1) 搜索索引
  const records: IndexRecord['records'] = normalized.map((n) => [n.word, n.pinyinPlain, n.abbrev, n.hot, n.id])
  writeJson(`${GENERATED_DIR}/index.json`, { version: 1, count: total, chunkSize: CHUNK_SIZE, records })

  // 2) 分块详情（不含简拼索引字段，保留完整详情）
  for (let c = 0; c < chunkCount; c++) {
    const slice = normalized.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE)
    writeJson(`${GENERATED_DIR}/details.${String(c).padStart(3, '0')}.json`, slice)
  }

  // 3) 精编清单
  const curated = normalized
    .filter((n) => n.curated)
    .map((n) => ({ word: n.word, tier: n.curated!.tier, hot: n.hot }))
  writeJson(`${GENERATED_DIR}/curated.manifest.json`, { count: curated.length, items: curated })

  // 4) meta
  const sourceSha = existsSync(SHA_FILE) ? readFileSync(SHA_FILE, 'utf-8').trim() : fileSha256(SOURCE_FILE)
  writeJson(`${GENERATED_DIR}/meta.json`, {
    version: `data-${sourceSha.slice(0, 8)}-${total}`,
    total,
    chunkSize: CHUNK_SIZE,
    detailChunkCount: chunkCount,
    indexChunkCount: 1,
    sourceSha256: sourceSha,
    curatedCount: curated.length,
  })

  log('build', `产物生成：total=${total} chunkCount=${chunkCount} curated=${curated.length}`)
  if (!curated.length) warn('build', '当前无精编数据，详情将缺少近反义词/多例句等精编字段')
}

if (isMain(import.meta.url)) main()
