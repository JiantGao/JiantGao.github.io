import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Capacitor } from '@capacitor/core'
import App from './App.vue'
import router from './router'
import './styles/reset.css'
import './styles/tokens.css'
import './registerSW'

// 原生端（APK）：顶部安全区由 MainActivity 的 WebView 垫高处理，
// 这里禁用 CSS env() 顶部内边距，避免双重下移。网页端（PWA）不受影响。
if (Capacitor.isNativePlatform()) {
  document.documentElement.style.setProperty('--cy-safe-top', '0px')
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
