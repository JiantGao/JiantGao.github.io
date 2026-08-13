/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  /** 数据源 URL（可选） */
  readonly DATA_SOURCE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** 应用版本号（由 vite define 注入，来自 package.json） */
declare const __APP_VERSION__: string
