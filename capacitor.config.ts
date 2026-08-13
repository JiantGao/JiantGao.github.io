import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.jiantgao.chengyu',
  appName: '成语学习',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      // 原生确保 WebView 不绘制到状态栏/摄像头下方（配合主题 edge-to-edge 退出）
      overlaysWebView: false,
      style: 'LIGHT',
    },
  },
}

export default config
