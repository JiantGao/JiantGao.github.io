import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onNeedRefresh() {
    // autoUpdate 模式下，新 SW 接管后提示刷新
    window.dispatchEvent(new CustomEvent('sw-need-refresh'))
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('sw-offline-ready'))
  },
})
