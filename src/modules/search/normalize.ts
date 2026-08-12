/**
 * 查询归一化：识别汉字/拉丁拼音/混合，输出拼音归一形态。
 * 与 scripts/pinyin.ts 保持一致（前端独立实现，避免引入依赖）。
 */

const TONE_MAP: Record<string, string> = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a',
  ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u',
  ǖ: 'u', ǘ: 'u', ǚ: 'u', ǜ: 'u', ü: 'u', Ü: 'u',
  Ā: 'a', Á: 'a', Ǎ: 'a', À: 'a',
  Ē: 'e', É: 'e', Ě: 'e', È: 'e',
  Ī: 'i', Í: 'i', Ǐ: 'i', Ì: 'i',
  Ō: 'o', Ó: 'o', Ǒ: 'o', Ò: 'o',
  Ū: 'u', Ú: 'u', Ǔ: 'u', Ù: 'u',
  ń: 'n', ň: 'n', ǹ: 'n', ḿ: 'm', ê: 'e',
}

/** 去声调、转小写、去空格，如 "shǒu zhū" → "shou zhu" */
export function stripTones(input: string): string {
  let out = input.toLowerCase()
  for (const [from, to] of Object.entries(TONE_MAP)) out = out.split(from).join(to)
  out = out.replace(/[^a-z\s]/g, ' ')
  out = out.replace(/\s+/g, ' ').trim()
  return out
}

/** 判断字符串是否含 CJK 汉字 */
export function hasHan(text: string): boolean {
  return /[一-鿿]/.test(text)
}

export interface NormalizedQuery {
  raw: string
  hasHan: boolean
  hasLatin: boolean
  /** 拼音归一（去调、去空格、小写） */
  qPlain: string
}

export function normalizeQuery(q: string): NormalizedQuery | null {
  const raw = q.trim()
  if (!raw) return null
  const isHan = hasHan(raw)
  const isLatin = /[a-zA-Z]/.test(raw)
  if (!isHan && !isLatin) return null
  return {
    raw,
    hasHan: isHan,
    hasLatin: isLatin,
    qPlain: stripTones(raw).replace(/\s+/g, ''),
  }
}
