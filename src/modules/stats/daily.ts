import { db } from '@/db'
import type { DailyStat } from '@/types/stats'

/** 按天累加学习秒数 */
export async function addStudySeconds(date: string, secs: number): Promise<void> {
  if (secs <= 0) return
  const row = await db.dailyStats.get(date)
  await db.dailyStats.put({
    date,
    studySeconds: (row?.studySeconds ?? 0) + secs,
    reviews: row?.reviews ?? 0,
    views: row?.views ?? 0,
    newCount: row?.newCount ?? 0,
    masteredCount: row?.masteredCount ?? 0,
  })
}

/** 按天累加计数项（复习/查看/新增/已掌握） */
export async function bumpDailyStat(
  date: string,
  patch: Partial<Pick<DailyStat, 'reviews' | 'views' | 'newCount' | 'masteredCount'>>,
): Promise<void> {
  const row = await db.dailyStats.get(date)
  await db.dailyStats.put({
    date,
    studySeconds: row?.studySeconds ?? 0,
    reviews: (row?.reviews ?? 0) + (patch.reviews ?? 0),
    views: (row?.views ?? 0) + (patch.views ?? 0),
    newCount: (row?.newCount ?? 0) + (patch.newCount ?? 0),
    masteredCount: (row?.masteredCount ?? 0) + (patch.masteredCount ?? 0),
  })
}
