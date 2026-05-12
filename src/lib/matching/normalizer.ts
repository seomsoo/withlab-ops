import emojiRegex from 'emoji-regex'

const EMOJI_PATTERN = emojiRegex()

const VARIATION_SELECTOR_REGEX = /[\u{FE00}-\u{FE0F}]/gu

const DINGBAT_REGEX = /[☆◆★●○◎♡♥△▽▲▼◇□■♠♣♦♤♧♢❣✨✩✪✫✬✭✮✯✰✿❀❁☀☁☂☃☄♨]/g

const BRACKET_MARKETING_REGEX = /\[([^\]]*)\]/g

const PAREN_REGEX = /\(([^)]*)\)/g

const MULTI_SPACE_REGEX = /\s{2,}/g

const SPECIAL_CHARS_REGEX = /[~!@#$%^&*+=|<>?;:"'`]/g

export function normalizeProductName(name: string): string {
  let result = name

  result = result.replace(EMOJI_PATTERN, ' ')

  result = result.replace(VARIATION_SELECTOR_REGEX, '')

  result = result.replace(DINGBAT_REGEX, ' ')

  result = result.replace(SPECIAL_CHARS_REGEX, ' ')

  result = result.replace(BRACKET_MARKETING_REGEX, ' ')

  result = result.replace(PAREN_REGEX, (_match, inner: string) => ` ${inner} `)

  result = result.replace(MULTI_SPACE_REGEX, ' ')

  result = result.toLowerCase().trim()

  return result
}

const WEIGHT_REGEX = /(\d+(?:\.\d+)?)\s*kg/i

export function normalizeWeight(
  text: string,
  aliases?: Record<string, string[]>
): string | null {
  let normalized = text

  if (aliases) {
    for (const [unit, aliasList] of Object.entries(aliases)) {
      for (const alias of aliasList) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        normalized = normalized.replace(
          new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${escaped}`, 'gi'),
          `$1${unit}`
        )
      }
    }
  }

  const match = WEIGHT_REGEX.exec(normalized)
  if (!match) return null

  return `${match[1]}kg`
}
