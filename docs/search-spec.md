# 搜索规范（search-spec.md）

与 `src/modules/search/score.ts` 保持一致，用于验收。

## 查询归一化

- 含 CJK → 汉字查询
- 纯拉丁 → 拼音查询（去声调、去空格、小写、`ü→u`）
- 混合 → 汉字与拼音双条件 AND（各得分数后 `-20` 加权）

## 打分权重

### 汉字查询
| 规则 | 分数 |
|---|---|
| `word === q` 精确 | 1000 |
| `word.startsWith(q)` 前缀 | 900 − len(q)×5 |
| `word.includes(q)` 子串 | 800 − 命中位置×10 |
| 顺次子序列（q 每字按序出现） | 400 |

### 拼音查询
| 规则 | 分数 |
|---|---|
| `abbrev === q` 简拼精确 | 750 |
| `pinyinPlain去空格 === q` 全拼精确 | 700 |
| `abbrev.startsWith(q)` 简拼前缀 | 650 − len(q)×3 |
| `pinyinPlain去空格.startsWith(q)` 全拼前缀 | 600 − len(q)×3 |
| `pinyinPlain去空格.includes(q)` 全拼子串 | 500 − 位置×5 |
| 音节前缀 | 450 |
| `abbrev.includes(q)` 简拼包含 | 350 |

## 排序

`score 降序 → hot 降序（精编热度）→ len 升序（短词优先）→ 拼音字典序`

## 交互

- 输入 200ms 防抖；IME 组合输入期间（compositionstart ~ compositionend）不触发搜索
- 结果 Top-100 截断
- 打开结果详情或按回车才写入搜索历史（上限 50 条）
