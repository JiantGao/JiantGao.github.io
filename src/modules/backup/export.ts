/**
 * 学习数据导出：全量打包（library / events / dailyStats / searchHistory / settings）为 JSON。
 */
import { db } from '@/db'
import { formatDate } from '@/utils/date'

export interface BackupPayload {
  app: 'chengyu-app'
  version: 1
  exportedAt: number
  library: unknown[]
  events: unknown[]
  dailyStats: unknown[]
  searchHistory: unknown[]
  settings: unknown[]
}

export async function exportAll(): Promise<BackupPayload> {
  return {
    app: 'chengyu-app',
    version: 1,
    exportedAt: Date.now(),
    library: await db.library.toArray(),
    events: await db.events.toArray(),
    dailyStats: await db.dailyStats.toArray(),
    searchHistory: await db.searchHistory.toArray(),
    settings: await db.settings.toArray(),
  }
}

/** 触发浏览器下载 JSON 文件 */
export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 延迟回收，避免下载被取消
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function backupFilename(): string {
  return `chengyu-backup-${formatDate(Date.now())}.json`
}
