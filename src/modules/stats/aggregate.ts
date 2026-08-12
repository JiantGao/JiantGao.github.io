/**
 * 学习统计聚合：从 dailyStats / events / library 计算图表序列与 KPI。
 */
import { db } from '@/db'
import { formatDate, startOfDay } from '@/utils/date'
import type { DailyStat, SeriesPoint } from '@/types/stats'

const DAY = 86400000

export function dayStart(ts: number): number {
  return startOfDay(ts).getTime()
}

/** 近 N 天日期序列（含今天），旧 → 新 */
export function recentDates(days: number): number[] {
  const today = dayStart(Date.now())
  return Array.from({ length: days }, (_, i) => today - (days - 1 - i) * DAY)
}

/** 生成每日序列；valueFn 对缺失日期返回默认 */
async function buildSeries(
  days: number,
  valueFn: (row: DailyStat | undefined, t: number) => number,
): Promise<SeriesPoint[]> {
  const rows = await db.dailyStats.toArray()
  const map = new Map(rows.map((r) => [r.date, r]))
  return recentDates(days).map((t) => ({
    label: fmtLabel(t),
    value: valueFn(map.get(formatDate(t)), t),
  }))
}

function fmtLabel(t: number): string {
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 每日学习时长序列（单位：分钟） */
export async function getStudySeries(days: number): Promise<SeriesPoint[]> {
  return buildSeries(days, (row) => Math.round((row?.studySeconds ?? 0) / 60))
}

/** 每日复习次数序列 */
export async function getReviewSeries(days: number): Promise<SeriesPoint[]> {
  return buildSeries(days, (row) => row?.reviews ?? 0)
}

/** 已掌握数量增长序列（取每日快照，向前填充） */
export async function getMasteryGrowth(days: number): Promise<SeriesPoint[]> {
  const rows = await db.dailyStats.toArray()
  const map = new Map(rows.map((r) => [r.date, r]))
  let last = 0
  return recentDates(days).map((t) => {
    const row = map.get(formatDate(t))
    if (row && row.masteredCount > 0) last = row.masteredCount
    return { label: fmtLabel(t), value: last }
  })
}

/** 当前累计掌握数（今日快照） */
export async function getTodayMastered(): Promise<number> {
  const row = await db.dailyStats.get(formatDate(Date.now()))
  return row?.masteredCount ?? 0
}

/** 累计复习次数 */
export async function getTotalReviews(): Promise<number> {
  const rows = await db.dailyStats.toArray()
  return rows.reduce((s, r) => s + (r.reviews ?? 0), 0)
}

/** 累计新增成语数 */
export async function getTotalNew(): Promise<number> {
  const rows = await db.dailyStats.toArray()
  return rows.reduce((s, r) => s + (r.newCount ?? 0), 0)
}

/** 今日学习时长（秒） */
export async function getTodaySeconds(): Promise<number> {
  const row = await db.dailyStats.get(formatDate(Date.now()))
  return row?.studySeconds ?? 0
}

/** 近 N 天学习时长合计（秒） */
export async function getTotalSeconds(days: number): Promise<number> {
  const rows = await db.dailyStats.toArray()
  const set = new Set(recentDates(days).map((t) => formatDate(t)))
  return rows.filter((r) => set.has(r.date)).reduce((s, r) => s + (r.studySeconds ?? 0), 0)
}
