# 成语学习（Chengyu App）

基于**搜索行为自动构建个性化成语学习库**的离线移动应用（PWA）。

## 核心功能

- **成语搜索**：汉字 / 全拼 / 首字母简拼 / 部分词语模糊检索（全量离线，约 30,895 条）
- **成语详情**：本义及引申义、出处典故、拼音标注、例句、近义词、反义词、常见误用提示（常用成语精编）
- **个性化学习库**：自动收录搜索过的成语，按时间/掌握程度排序，支持笔记、掌握标记、收藏、移除恢复
- **学习进度**：学习时长、已掌握成语数、复习频率等指标与图表（柱状/折线/环形）
- **间隔复习**：Leitner SRS 闪卡，记得/模糊/忘记三档反馈
- **离线可用**：词典随包预缓存，首次打开后全量离线；学习数据存于 IndexedDB
- **数据管理**：导出 / 导入备份 JSON、重置、清空历史

## 技术栈

Vue 3 + TypeScript + Vite + Pinia + Vue Router + Dexie(IndexedDB) + Vant 4 + 自绘 SVG 图表 + vite-plugin-pwa

## 数据

- 全量词典：30,895 条（`pwxcoo/chinese-xinhua`，含拼音/释义/出处/例句）
- 精编内容：常用成语深度精编（≥3 例句 / 近反义词 / 误用提示），见 `data/curated/`
- 产物：详情分 8 块按需加载 + 紧凑搜索索引（约 13.5MB raw / 4.6MB gz）

## 质量验证

- 数据管线 `data:verify`：结构一致性 + 抽样搜索冒烟 + 性能基准（索引解析 ~7ms，搜索 ~7ms/次）
- 端到端（Playwright + Edge）：搜索/详情/学习库/复习/统计/设置在线 40+ 项通过；离线 8 项通过

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
