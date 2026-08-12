/** 掌握程度档位 */
export type MasteryLevel = 0 | 1 | 2 | 3 | 4

/** 学习库条目（IndexedDB library 表） */
export interface LibraryItem {
  /** 主键 = 词典 word */
  word: string
  pinyin: string
  abbreviation: string
  /** 加入时间 ms */
  addedAt: number
  /** 最近修改时间 ms */
  updatedAt: number
  /** 掌握程度 0-4 */
  mastery: MasteryLevel
  /** 是否收藏 */
  favorite: 0 | 1
  /** 软删除（移除）标记 */
  isRemoved: 0 | 1
  /** 个人笔记 */
  note: string
  /** 搜索/查看次数 */
  searchCount: number
  /** 最近查看 ms */
  lastViewedAt: number
  /** SRS 盒子 0-5 */
  box: number
  /** 下次复习时间（当天0点）ms */
  dueDate: number
  /** 最近复习 ms */
  lastReviewedAt: number
}

/** 学习库筛选维度 */
export type LibraryTab = 'all' | 'favorite' | 'mastered' | 'todayDue' | 'removed'

/** 学习库排序方式 */
export type LibrarySort =
  | 'addedDesc' // 最近搜索/加入
  | 'masteryDesc' // 掌握程度
  | 'dueAsc' // 到期时间
  | 'pinyinAsc' // 拼音

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  0: '未标记',
  1: '认识',
  2: '熟悉',
  3: '掌握',
  4: '精通',
}
