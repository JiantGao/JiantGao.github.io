/**
 * 顶部安全区运行时校准（APK / Capacitor 原生端）。
 * env(safe-area-inset-top) 在 Android WebView 中可能返回 0，导致内容被状态栏/摄像头遮挡；
 * 这里在原生端读取状态栏真实高度，动态覆盖 --cy-safe-top。
 * 网页端（PWA）继续使用 CSS env()，无需处理。
 */
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'

export async function applySafeAreaTop(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const info = await StatusBar.getInfo()
    if (info.overlays && info.height > 0) {
      // 物理像素 → CSS 像素
      const cssPx = info.height / window.devicePixelRatio
      document.documentElement.style.setProperty('--cy-safe-top', `${cssPx}px`)
    }
  } catch {
    /* 读取失败则保留 CSS env() 兜底 */
  }
}
