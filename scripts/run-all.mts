/**
 * M1 编排入口：fetch → normalize → merge-curated → build-artifacts → verify。
 * 各步骤通过导出 main() 并在 run-all 中显式 await，避免动态 import 的异步竞态。
 */
import { log, error, isMain } from './_shared.ts'

const steps = ['fetch-source', 'normalize', 'merge-curated', 'build-artifacts', 'verify'] as const

export async function main(): Promise<void> {
  const started = Date.now()
  for (const step of steps) {
    log('run-all', `—— ${step} ——`)
    try {
      const mod = await import(`./${step}.mts`)
      await mod.main()
    } catch (e) {
      error('run-all', `${step} 失败：${e instanceof Error ? e.message : String(e)}`)
      process.exit(1)
    }
  }
  log('run-all', `数据管线完成，总耗时 ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

if (isMain(import.meta.url)) {
  main().catch((e) => {
    error('run-all', e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
}
