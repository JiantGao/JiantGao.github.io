/**
 * 数据构建流水线共享工具与常量。
 * 仅依赖 node:fs / node:path / node:crypto / node:zlib，保证跨平台。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(import.meta.dirname, '..')
export const DATA_DIR = resolve(ROOT, 'data')
export const SOURCE_DIR = resolve(DATA_DIR, 'source')
export const NORMALIZED_DIR = resolve(DATA_DIR, 'normalized')
export const CURATED_DIR = resolve(DATA_DIR, 'curated')
export const GENERATED_DIR = resolve(ROOT, 'src', 'data', 'generated')

/** 详情分块大小 */
export const CHUNK_SIZE = 4096

export const SOURCE_FILE = resolve(SOURCE_DIR, 'idiom.json')
export const SHA_FILE = resolve(SOURCE_DIR, 'idiom.json.sha256')

/** 数据源（主 → 镜像回退），可经 DATA_SOURCE_URL 环境变量覆盖 */
const DEFAULT_SOURCE_URLS = [
  'https://raw.githubusercontent.com/pwxcoo/chinese-xinhua/master/data/idiom.json',
  'https://cdn.jsdelivr.net/gh/pwxcoo/chinese-xinhua@master/data/idiom.json',
  'https://gitee.com/mirrors/chinese-xinhua/raw/master/data/idiom.json',
]

export function sourceUrls(): string[] {
  const override = process.env.DATA_SOURCE_URL
  return override ? [override, ...DEFAULT_SOURCE_URLS] : DEFAULT_SOURCE_URLS
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

export function readJson<T = unknown>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf-8')) as T
}

export function writeJson(file: string, data: unknown): void {
  ensureDir(dirname(file))
  writeFileSync(file, JSON.stringify(data), 'utf-8')
}

export function fileSha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

export function textSha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export function gzSize(bytes: Buffer): string {
  return formatBytes(gzipSync(bytes).length)
}

export function log(step: string, msg: string): void {
  console.log(`[${step}] ${msg}`)
}

export function warn(step: string, msg: string): void {
  console.warn(`[${step}] ⚠ ${msg}`)
}

export function error(step: string, msg: string): void {
  console.error(`[${step}] ✗ ${msg}`)
}

/** 检查文件是否已存在且 sha 与期望一致 */
export function cachedFresh(file: string, expectedSha: string | null): boolean {
  if (!existsSync(file)) return false
  if (!expectedSha) return true
  return fileSha256(file) === expectedSha
}

/**
 * 判断当前模块是否为主执行脚本（`tsx scripts/x.mts` 直接运行时为 true；
 * 被 run-all 动态 import 时为 false）。用于「导出 main 供编排调用 + CLI 独立执行」双模式。
 */
export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    const self = fileURLToPath(moduleUrl)
    return self.toLowerCase() === resolve(entry).toLowerCase()
  } catch {
    return false
  }
}
