/**
 * PWA 图标生成：由 public/icon.svg 产出全套 PNG（192/512/maskable/apple-touch/favicon）。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { ROOT, ensureDir, isMain } from './_shared.ts'

const SRC = resolve(ROOT, 'public', 'icon.svg')
const ICONS_DIR = resolve(ROOT, 'public', 'icons')

interface Target {
  file: string
  size: number
  dir?: string
}

const TARGETS: Target[] = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180, dir: resolve(ROOT, 'public') },
  { file: 'favicon-32x32.png', size: 32 },
]

export async function main(): Promise<void> {
  ensureDir(ICONS_DIR)
  const svg = readFileSync(SRC)
  for (const t of TARGETS) {
    const out = t.dir ? resolve(t.dir, t.file) : resolve(ICONS_DIR, t.file)
    await sharp(svg).resize(t.size, t.size).png().toFile(out)
    console.log(`[gen-icons] ${t.file} (${t.size}x${t.size})`)
  }
  console.log('[gen-icons] 完成')
}

if (isMain(import.meta.url)) {
  main().catch((e) => {
    console.error('[gen-icons] 失败：', e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
}
