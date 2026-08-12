/** 词典单条成语（全量详情记录，来自构建产物 details.*.json） */
export interface Idiom {
  /** 全局序号，兼作分块定位 */
  id: number
  /** 成语本体，如「守株待兔」 */
  word: string
  /** 拼音（含声调），如「shǒu zhū dài tù」 */
  pinyin: string
  /** 拼音缩写（源字段），如「shou zhu dai tu」 */
  abbreviation: string
  /** 去声调拼音，如「shou zhu dai tu」 */
  pinyinPlain: string
  /** 首字母简拼，如「szdt」 */
  abbrev: string
  /** 释义 */
  explanation: string
  /** 出处 / 典故 */
  derivation: string
  /** 例句（源数据最多1条） */
  example: string
  /** 标签 */
  tags: string[]
  /** 字数 */
  len: number
  /** 热度（由精编 tier 折算，6-tier；基础条目为 0） */
  hot: number
  /** 精编数据（可选，来自 data/curated/*.json） */
  curated?: CuratedInfo
}

/** 精编数据：核心常用成语的深度内容 */
export interface CuratedInfo {
  /** 常用度档位 1-5 */
  tier: number
  /** 多个不同语境的例句（至少3条） */
  examples: string[]
  /** 近义词 */
  synonyms: string[]
  /** 反义词 */
  antonyms: string[]
  /** 常见误用提示 */
  misuse: string
  /** 释义补充：本义与引申义说明等 */
  notes: string
}

/** 搜索索引的紧凑记录：[word, pinyinPlain, abbrev, hot, id] */
export type IndexRecord = [string, string, string, number, number]

/** 搜索结果项 */
export interface SearchResultItem {
  id: number
  word: string
  pinyin: string
  pinyinPlain: string
  abbrev: string
  hot: number
  len: number
  score: number
}
