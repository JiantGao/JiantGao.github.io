/**
 * M1-1 取数：下载 chinese-xinhua 的 idiom.json（三源回退）。
 * 已有本地缓存且 sha256 未变则跳过（离线可重跑）。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { SOURCE_FILE, SHA_FILE, SOURCE_DIR, sourceUrls, ensureDir, log, error, textSha256, formatBytes, isMain } from './_shared.ts'

const TIMEOUT_MS = 20_000

async function fetchText(url: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

export async function main(): Promise<void> {
  ensureDir(SOURCE_DIR)

  // 已有缓存：校验本地文件与记录的 sha 是否一致
  if (existsSync(SOURCE_FILE) && existsSync(SHA_FILE)) {
    const recorded = readFileSync(SHA_FILE, 'utf-8').trim()
    const actual = createHash('sha256').update(readFileSync(SOURCE_FILE)).digest('hex')
    if (recorded === actual) {
      log('fetch', `已存在且校验一致（sha256=${actual.slice(0, 12)}…），跳过下载`)
      return
    }
    log('fetch', `本地缓存 sha 不匹配，重新下载`)
  }

  const urls = sourceUrls()
  let lastErr: unknown = null

  for (const url of urls) {
    try {
      log('fetch', `尝试 ${url}`)
      const text = await fetchText(url)
      const sha = textSha256(text)
      writeFileSync(SOURCE_FILE, text, 'utf-8')
      writeFileSync(SHA_FILE, sha, 'utf-8')
      log('fetch', `下载成功：${formatBytes(Buffer.byteLength(text))}，sha256=${sha.slice(0, 12)}…`)
      return
    } catch (e) {
      lastErr = e
      error('fetch', `来源失败：${(e as Error).message}`)
    }
  }

  throw new Error(
    `所有数据源均失败（${urls.length} 个）。请手动下载 idiom.json 并放置到 ${SOURCE_FILE}，\n` +
      `来源参考：${urls[0]}`,
  )
}

if (isMain(import.meta.url)) {
  main().catch((e) => {
    error('fetch', e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
}
