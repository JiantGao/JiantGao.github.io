/**
 * M1-5 验证：全量自检 + 抽样搜索冒烟 + 体积报告。
 * 任何不一致都会导致进程退出码非 0。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'
import { GENERATED_DIR, readJson, log, warn, error, formatBytes, isMain } from './_shared.ts'
import { stripTones } from './pinyin.ts'

interface Meta {
  version: string
  total: number
  chunkSize: number
  detailChunkCount: number
  indexChunkCount: number
  sourceSha256: string
  curatedCount: number
}
interface IndexFile {
  version: number
  count: number
  chunkSize: number
  records: Array<[string, string, string, number, number]>
}

let failures = 0
function check(cond: boolean, label: string): void {
  if (cond) log('verify', `✓ ${label}`)
  else {
    error('verify', `✗ ${label}`)
    failures++
  }
}

function loadIndex(): IndexFile {
  return readJson<IndexFile>(`${GENERATED_DIR}/index.json`)
}

/** 与前端 modules/search/score.ts 保持一致的简版打分 */
function search(query: string, index: IndexFile, limit = 20) {
  const q = query.trim()
  if (!q) return []
  const hasHan = /[一-鿿]/.test(q)
  const hasLatin = /[a-zA-Z]/.test(q)
  if (!hasHan && !hasLatin) return []

  const qPlain = stripTones(q).replace(/\s+/g, '')

  const results: Array<{ word: string; pinyinPlain: string; len: number; hot: number; score: number }> = []

  for (const [word, pinyinPlain, abbrev, hot, id] of index.records) {
    let score = 0
    if (hasHan) {
      if (word === q) score = 1000
      else if (word.startsWith(q)) score = 900 - q.length * 5
      else {
        const pos = word.indexOf(q)
        if (pos >= 0) score = 800 - pos * 10
        else {
          // 顺次子序列
          let k = 0
          for (const ch of q) {
            const found = word.indexOf(ch, k)
            if (found < 0) break
            k = found + 1
          }
          if (k > 0) score = 400
        }
      }
    }
    if (hasLatin) {
      const plain = pinyinPlain.replace(/\s+/g, '')
      const latinScore =
        abbrev === qPlain ? 750 :
        abbrev.startsWith(qPlain) ? 650 - qPlain.length * 3 :
        plain === qPlain ? 700 :
        plain.startsWith(qPlain) ? 600 - qPlain.length * 3 : (() => {
          const pos = plain.indexOf(qPlain)
          if (pos >= 0) return 500 - pos * 5
          return abbrev.includes(qPlain) ? 350 : 0
        })()
      score = hasHan ? (score > 0 ? score - 20 : 0) + latinScore : latinScore
    }
    if (score > 0) results.push({ word, pinyinPlain, len: [...word].length, hot, score })
  }

  results.sort(
    (a, b) => b.score - a.score || b.hot - a.hot || a.len - b.len || a.pinyinPlain.localeCompare(b.pinyinPlain),
  )
  return results.slice(0, limit)
}

function runSmoke(index: IndexFile): void {
  log('verify', '--- 抽样搜索冒烟 ---')
  const cases: Array<[string, (top: string[]) => boolean, string]> = [
    ['守株待兔', (t) => t[0] === '守株待兔', '汉字精确命中'],
    ['拔苗', (t) => t[0] === '拔苗助长', '汉字前缀/子串'],
    ['szdt', (t) => t.includes('守株待兔'), '简拼精确'],
    ['shou zhu', (t) => t.includes('守株待兔'), '全拼前缀（带空格）'],
    ['shouzhudai', (t) => t.includes('守株待兔'), '全拼子串'],
    ['bamiao zhuzhang', (t) => t.includes('拔苗助长'), '全拼精确'],
    ['一', (t) => t[0]?.startsWith('一'), '单字检索'],
    ['vbnm', (t) => t.length === 0, '无结果查询'],
  ]
  for (const [q, assert, label] of cases) {
    const top = search(q, index, 20).map((r) => r.word)
    check(assert(top), `搜索「${q}」→ ${label}（前3：${top.slice(0, 3).join('、')}）`)
  }
}

function runStructureChecks(meta: Meta): void {
  log('verify', '--- 结构与一致性 ---')
  const index = loadIndex()
  check(index.count === meta.total, `index.count(${index.count}) === meta.total(${meta.total})`)
  check(index.records.length === meta.total, 'index.records 数量一致')
  check(index.chunkSize === meta.chunkSize, 'index.chunkSize 与 meta 一致')

  // details 分块
  const detailFiles = readdirSync(GENERATED_DIR).filter((f) => /^details\.\d+\.json$/.test(f)).sort()
  check(detailFiles.length === meta.detailChunkCount, `分块数(${detailFiles.length}) === meta.detailChunkCount(${meta.detailChunkCount})`)
  let detailTotal = 0
  let badDetail = 0
  for (const f of detailFiles) {
    const arr = readJson<Array<Record<string, unknown>>>(resolve(GENERATED_DIR, f))
    detailTotal += arr.length
    for (const item of arr) {
      if (!item.word || !item.pinyin || !item.explanation) badDetail++
      if (typeof item.id !== 'number') badDetail++
      if (!item.pinyinPlain || !item.abbrev) badDetail++
    }
  }
  check(detailTotal === meta.total, `详情总数(${detailTotal}) === meta.total(${meta.total})`)
  check(badDetail === 0, `详情字段完整性（bad=${badDetail}）`)

  // 精编
  const curated = readJson<{ count: number; items: Array<{ word: string; tier: number }> }>(`${GENERATED_DIR}/curated.manifest.json`)
  check(curated.count === meta.curatedCount, `精编数(${curated.count}) === meta.curatedCount(${meta.curatedCount})`)
  check(curated.count === 0 || curated.count > 0, '精编清单可读')

  // meta.version 确定性（无时间戳）
  check(!/T\d{2}:/.test(meta.version), 'meta.version 不含时间戳（可复现）')
}

function runSizeReport(): void {
  log('verify', '--- 体积报告 ---')
  const files = readdirSync(GENERATED_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
  let totalRaw = 0
  let totalGz = 0
  for (const f of files) {
    const buf = readFileSync(resolve(GENERATED_DIR, f))
    const raw = buf.length
    const gz = gzipSync(buf).length
    totalRaw += raw
    totalGz += gz
    console.log(`  ${f.padEnd(24)} ${formatBytes(raw).padStart(10)}  gzip ${formatBytes(gz).padStart(10)}`)
  }
  console.log(`  ${'TOTAL'.padEnd(24)} ${formatBytes(totalRaw).padStart(10)}  gzip ${formatBytes(totalGz).padStart(10)}`)
}

function runBenchmark(index: IndexFile): void {
  log('verify', '--- 性能基准（Node 环境参考） ---')
  const buf = readFileSync(resolve(GENERATED_DIR, 'index.json'))
  const t0 = performance.now()
  JSON.parse(buf.toString())
  const parseMs = performance.now() - t0
  console.log(`  index.json 解析：${parseMs.toFixed(1)} ms`)

  const t1 = performance.now()
  const queries = ['守株待兔', 'szdt', 'shou zhu', '一', '卧薪尝胆', '叶公好龙', 'vbnm']
  for (const q of queries) search(q, index, 20)
  const total = performance.now() - t1
  console.log(`  ${queries.length} 次搜索共 ${total.toFixed(1)} ms（平均 ${(total / queries.length).toFixed(2)} ms）`)
}

export function main(): void {
  const meta = readJson<Meta>(`${GENERATED_DIR}/meta.json`)
  log('verify', `构建版本：${meta.version}`)
  runStructureChecks(meta)
  runSmoke(loadIndex())
  runSizeReport()
  runBenchmark(loadIndex())

  if (failures) {
    throw new Error(`共 ${failures} 项校验失败`)
  }
  log('verify', '全部校验通过 ✓')
}

if (isMain(import.meta.url)) {
  try {
    main()
  } catch (e) {
    error('verify', e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}
