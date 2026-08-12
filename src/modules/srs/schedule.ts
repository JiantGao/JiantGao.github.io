/**
 * 间隔重复（Leitner-lite）调度。
 * 掌握盒子 box 0-5；新词 box=0（当天到期，计入「今日新学」）。
 */
import { startOfDay } from '@/utils/date'

export const INTERVAL_DAYS = [0, 1, 3, 7, 15, 30]

export type ReviewGrade = 'ok' | 'miss' | 'again'

/** 复习反馈后的盒子变化：记得升级 / 模糊不变 / 忘记降级 */
export function nextBox(box: number, grade: ReviewGrade): number {
  if (grade === 'ok') return Math.min(box + 1, 5)
  if (grade === 'miss') return box
  return Math.max(box - 1, 0)
}

/** 给定盒子的下次到期时间（当天 0 点） */
export function calcDueForBox(box: number, baseTs: number): number {
  return startOfDay(baseTs).getTime() + INTERVAL_DAYS[box] * 86400000
}

/** 复习反馈后的到期时间 */
export function calcDueAfter(box: number, grade: ReviewGrade, baseTs: number): number {
  return calcDueForBox(nextBox(box, grade), baseTs)
}

/** 今日 23:59:59 截止 */
export function todayDueDeadline(): number {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}
