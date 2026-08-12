/**
 * 学习时长追踪：仅在页面可见时计时，写入 dailyStats.studySeconds。
 * 用 startTracking / stopTracking 控制；配合 useStudyTracking 组合式函数使用。
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { todayStr } from '@/utils/date'
import { addStudySeconds } from './daily'

let activeKey: string | null = null
let lastFlushAt = 0
let wasVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
let timer: number | null = null
const FLUSH_MS = 15_000

function flush(): void {
  if (!activeKey) return
  const now = Date.now()
  const el = now - lastFlushAt
  lastFlushAt = now
  if (wasVisible && el > 0) {
    void addStudySeconds(todayStr(), Math.floor(el / 1000))
  }
}

function onVisibilityChange(): void {
  const vis = document.visibilityState === 'visible'
  if (vis === wasVisible) return
  flush() // 仅当 wasVisible 时会计入
  wasVisible = vis
}

export function startTracking(key: string): void {
  stopTracking()
  activeKey = key
  lastFlushAt = Date.now()
  wasVisible = document.visibilityState === 'visible'
  timer = window.setInterval(flush, FLUSH_MS)
  document.addEventListener('visibilitychange', onVisibilityChange)
}

export function stopTracking(): void {
  flush()
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
  activeKey = null
}

/** 在当前页面组件启用学习时长统计 */
export function useStudyTracking(key: string): void {
  onMounted(() => startTracking(key))
  onBeforeUnmount(() => stopTracking())
}
