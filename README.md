# 成语学习（Chengyu App）

基于**搜索行为自动构建个性化成语学习库**的离线移动应用（PWA）。

## 核心功能

- **成语搜索**：汉字 / 全拼 / 首字母简拼 / 部分词语模糊检索（全量离线）
- **成语详情**：本义及引申义、出处典故、拼音标注、≥3 个不同语境例句、近义词、反义词、常见误用提示
- **个性化学习库**：自动收录搜索过的成语，按时间/掌握程度排序，支持笔记、掌握标记、收藏、移除恢复
- **学习进度**：学习时长、已掌握成语数、复习频率等指标与图表
- **离线可用**：词典随包预缓存，首次打开后全量离线；学习数据存于 IndexedDB

## 技术栈

Vue 3 + TypeScript + Vite + Pinia + Vue Router + Dexie(IndexedDB) + Vant 4 + vite-plugin-pwa

## 开发

```bash
npm install
npm run dev        # 开发（浏览器移动模拟）
npm run data:all   # 构建成语词典数据（取数→规范化→合并精编→产物）
npm run build      # 类型检查 + 数据构建 + 生产构建（含 PWA）
npm run preview    # 预览生产构建
npm run data:verify
```

## 目录

- `scripts/` 数据构建流水线（Node+TS）
- `data/` 源数据与精编内容（`data/curated/` 为人工精编源）
- `src/` 应用源码（`src/data/generated/` 为构建产物）
