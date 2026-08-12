/**
 * 学习数据导入：校验并整库还原（清空后写入）。
 */
import { db, type SearchHistoryItem, type SettingRow } from '@/db'
import type { LibraryItem } from '@/types/library'
import type { DailyStat, StudyEvent } from '@/types/stats'
import type { BackupPayload } from './export'

export interface ImportSummary {
  library: number
  events: number
  dailyStats: number
  searchHistory: number
}

function isBackup(x: unknown): x is BackupPayload {
  if (!x || typeof x !== 'object') return false
  const b = x as Partial<BackupPayload>
  return (
    b.app === 'chengyu-app' &&
    Array.isArray(b.library) &&
    Array.isArray(b.events) &&
    Array.isArray(b.dailyStats) &&
    Array.isArray(b.searchHistory) &&
    Array.isArray(b.settings)
  )
}

export async function importAll(payload: unknown): Promise<ImportSummary> {
  if (!isBackup(payload)) throw new Error('文件不是有效的成语学习备份（app=chengyu-app）')

  await db.transaction(
    'rw',
    [db.library, db.events, db.dailyStats, db.searchHistory, db.settings],
    async () => {
      await db.library.clear()
      await db.events.clear()
      await db.dailyStats.clear()
      await db.searchHistory.clear()
      await db.settings.clear()
      await db.library.bulkAdd(payload.library as LibraryItem[])
      await db.events.bulkAdd(payload.events as StudyEvent[])
      await db.dailyStats.bulkAdd(payload.dailyStats as DailyStat[])
      await db.searchHistory.bulkAdd(payload.searchHistory as SearchHistoryItem[])
      if (payload.settings.length) await db.settings.bulkAdd(payload.settings as SettingRow[])
    },
  )

  return {
    library: payload.library.length,
    events: payload.events.length,
    dailyStats: payload.dailyStats.length,
    searchHistory: payload.searchHistory.length,
  }
}

/** 清空全部学习数据（重置） */
export async function resetAll(): Promise<void> {
  await db.transaction('rw', [db.library, db.events, db.dailyStats, db.searchHistory, db.settings], async () => {
    await Promise.all([
      db.library.clear(),
      db.events.clear(),
      db.dailyStats.clear(),
      db.searchHistory.clear(),
      db.settings.clear(),
    ])
  })
}
