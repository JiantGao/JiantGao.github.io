/**
 * 学习数据导出：全量打包（library / events / dailyStats / searchHistory / settings）为 JSON。
 * 原生（APK）环境：写入应用缓存并调起系统分享，让用户保存到任意位置；
 * 浏览器/PWA 环境：沿用 <a download> 触发浏览器下载。
 */
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
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

/** 导出备份文件（原生分享 / 浏览器下载） */
export async function downloadJSON(data: unknown, filename: string): Promise<void> {
  const json = JSON.stringify(data, null, 2)

  if (Capacitor.isNativePlatform()) {
    // 写入应用缓存目录，得到本地文件 uri
    const fileUrl = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
    })
    // 调起系统分享面板，用户可发到微信/网盘、存到文件管理或“保存到文件”
    await Share.share({
      title: filename,
      text: `成语学习数据备份（${filename}）`,
      files: [fileUrl.uri],
    })
    return
  }

  // 浏览器/PWA：触发下载
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
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