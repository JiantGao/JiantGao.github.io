/** 学习事件类型 */
export type StudyEventType = 'view' | 'review' | 'mastery' | 'practice'

/** 复习反馈 */
export type ReviewOutcome = 'ok' | 'miss' | 'again'

/** 学习事件（append-only） */
export interface StudyEvent {
  id?: number
  /** 事件时间 ms */
  ts: number
  /** 日期 YYYY-MM-DD */
  date: string
  /** 关联成语 */
  word: string
  type: StudyEventType
  outcome: ReviewOutcome | 'skip' | ''
  /** 本次停留时长秒（view 类事件） */
  durationSec?: number
}

/** 按天聚合的学习统计 */
export interface DailyStat {
  date: string
  /** 累计学习秒数 */
  studySeconds: number
  /** 复习次数 */
  reviews: number
  /** 查看次数 */
  views: number
  /** 新增成语数 */
  newCount: number
  /** 已掌握累计数（mastery>=3） */
  masteredCount: number
}

/** 图表序列数据点 */
export interface SeriesPoint {
  label: string
  value: number
}
