/**
 * 拼音处理工具（构建期使用；与前端 src/modules/search/normalize.ts 保持一致）。
 */

/** 带声调字符 → 无调字符 */
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

/** 去掉拼音声调并转小写，如 "shǒu zhū dài tù" → "shou zhu dai tu" */
export function stripTones(input: string): string {
  let out = input.toLowerCase()
  for (const [from, to] of Object.entries(TONE_MAP)) {
    out = out.split(from).join(to)
  }
  // 过滤掉非 [a-z ] 字符（防御异常字节）
  out = out.replace(/[^a-z\s]/g, ' ')
  out = out.replace(/\s+/g, ' ').trim()
  return out
}

/** 计算首字母简拼，如 "shǒu zhū dài tù" → "szdt" */
export function computeAbbrev(pinyin: string): string {
  const plain = stripTones(pinyin)
  if (!plain) return ''
  return plain
    .split(' ')
    .filter(Boolean)
    .map((syl) => syl[0])
    .join('')
}
