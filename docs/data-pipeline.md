# 数据流水线

成语词典数据的构建流程（`npm run data:all`）。

## 数据源

- 主源：[pwxcoo/chinese-xinhua](https://github.com/pwxcoo/chinese-xinhua) 的 `data/idiom.json`
- 镜像：jsdelivr CDN、gitee 镜像
- 规模：30,895 条；字段 `word / pinyin / abbreviation(简拼) / explanation / derivation / example`
- 说明：源数据 `example` 字段可能为「无」（约占 60%）；无 `tags` 字段；无近反义词（由精编补充）

## 流程

```
fetch-source    下载 idiom.json（三源回退 + sha256 校验缓存）→ data/source/
normalize       去重/校验/派生 pinyinPlain、abbrev、len、id → data/normalized/
merge-curated   校验并合并 data/curated/curated-*.json（未知词硬失败）→ data/normalized/
build-artifacts 分块详情 + 搜索索引 + meta + 精编清单 → src/data/generated/
verify          结构一致性 + 抽样搜索冒烟 + 体积报告
```

## 产物（src/data/generated/）

| 文件 | 内容 |
|---|---|
| `index.json` | 紧凑搜索索引 `[word, pinyinPlain, abbrev, hot, id]`，约 1.5MB raw / 568KB gz |
| `details.000~007.json` | 全量详情，CHUNK_SIZE=4096 分 8 块，前端按需懒加载 |
| `meta.json` | 版本号（基于源 sha）、总数、分块数、精编数 |
| `curated.manifest.json` | 精编词清单 |

## 精编数据（data/curated/）

人工维护 `curated-*.json`，字段：`word / tier(1-5) / examples(≥3) / synonyms / antonyms / misuse / notes`。
校验规则：
- `word` 必须存在于全量词典（否则构建硬失败）
- tier 1-5；tier1 需 examples ≥ 3
- 热度 `hot = 6 - tier`，参与搜索结果排序

## 体积

全量产物约 13.45MB raw / 4.55MB gz（详情分块按需加载，首屏不解析）。
