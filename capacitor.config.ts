import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.jiantgao.chengyu',
  appName: '成语学习',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
}

export default config
