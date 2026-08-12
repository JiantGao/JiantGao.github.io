/** 日期工具（本地时区） */

export function startOfDay(ts: number): Date {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 当天结束毫秒数 */
export function endOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** YYYY-MM-DD（本地时区） */
export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 今日 YYYY-MM-DD */
export function todayStr(): string {
  return formatDate(Date.now())
}

/** 友好显示：今天/昨天/M月D日 */
export function friendlyDate(ts: number): string {
  const now = new Date()
  const dayStart = startOfDay(now.getTime()).getTime()
  const diffDays = Math.floor((dayStart - startOfDay(ts).getTime()) / 86400000)
  if (diffDays <= 0) return '今天'
  if (diffDays === 1) return '昨天'
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
