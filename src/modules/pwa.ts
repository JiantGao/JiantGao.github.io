/** PWA 安装引导：捕获 beforeinstallprompt，提供安装入口 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
  })
}

export function canInstall(): boolean {
  return deferred !== null
}

/** 触发系统安装弹窗，返回是否被接受 */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const ev = deferred
  deferred = null
  try {
    await ev.prompt()
    const choice = await ev.userChoice
    return choice.outcome === 'accepted'
  } catch {
    return false
  }
}
