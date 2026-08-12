import Dexie, { type Table } from 'dexie'
import type { LibraryItem } from '@/types/library'
import type { DailyStat, StudyEvent } from '@/types/stats'

/** 搜索历史条目 */
export interface SearchHistoryItem {
  query: string
  count: number
  lastAt: number
}

/** 设置键值 */
export interface SettingRow {
  key: string
  value: unknown
}

class ChengyuDB extends Dexie {
  library!: Table<LibraryItem, string>
  events!: Table<StudyEvent, number>
  dailyStats!: Table<DailyStat, string>
  searchHistory!: Table<SearchHistoryItem, string>
  settings!: Table<SettingRow, string>

  constructor() {
    super('chengyu-db')
    this.version(1).stores({
      library:
        'word, addedAt, updatedAt, mastery, favorite, isRemoved, searchCount, box, dueDate, abbreviation, pinyin',
      events: '++id, date, ts, word, type, outcome',
      dailyStats: 'date, studySeconds',
      searchHistory: 'query, count, lastAt',
      settings: 'key',
    })
  }
}

export const db = new ChengyuDB()
