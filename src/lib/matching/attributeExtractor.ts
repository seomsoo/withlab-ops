import { normalizeProductName, normalizeWeight } from './normalizer'

import type { FruitDictionary } from '@/types'

export type ProductAttributes = {
  fruit: string | null
  weight: string | null
  grade: string | null
  size: string | null
  raw: string
}

/** 크기가 적히지 않은 주문에 적용할 과일별 기본 크기 */
const DEFAULT_ORDER_SIZE: Record<string, string> = {
  감귤: '대과',
}

export function extractAttributes(
  name: string,
  option: string,
  dictionary: FruitDictionary[],
  isPlatformOrder = false
): ProductAttributes {
  const combined = `${name} ${option}`
  const normalized = normalizeProductName(combined)

  const fruit = detectFruit(normalized, dictionary)
  const scoped = fruit
    ? dictionary.filter((entry) => entry.category === fruit)
    : dictionary

  // 상품명의 광고 문구보다 옵션이 실제 주문 내용에 가까우므로 옵션을 먼저 본다.
  // normalize는 대괄호 안을 지우므로 "[S-M 로얄과]"를 살리려고 옵션 원문을 쓴다.
  let weight =
    extractWeight(option, dictionary) ?? extractWeight(combined, dictionary)
  const grade = detectGrade(normalized, scoped)
  let size =
    detectSize(option.toLowerCase(), scoped) ?? detectSize(normalized, scoped)

  if (isPlatformOrder && fruit) {
    if (weight) weight = mapWeight(fruit, weight, dictionary) ?? weight
    size ??= DEFAULT_ORDER_SIZE[fruit] ?? null
  }

  return { fruit, weight, grade, size, raw: normalized }
}

function mapWeight(
  fruit: string,
  weight: string,
  dictionary: FruitDictionary[]
): string | null {
  for (const entry of dictionary) {
    if (!entry.isActive || entry.category !== fruit) continue
    const mapped = entry.weightMapping[weight]
    if (mapped) return mapped
  }
  return null
}

type KeywordHit = {
  category: string
  start: number
  end: number
}

function findKeywordHits(
  normalized: string,
  dictionary: FruitDictionary[]
): KeywordHit[] {
  const hits: KeywordHit[] = []

  for (const entry of dictionary) {
    if (!entry.isActive) continue
    for (const keyword of entry.keywords) {
      const term = keyword.toLowerCase()
      if (!term) continue
      let start = normalized.indexOf(term)
      while (start !== -1) {
        hits.push({
          category: entry.category,
          start,
          end: start + term.length,
        })
        start = normalized.indexOf(term, start + 1)
      }
    }
  }

  return hits
}

function outranks(a: KeywordHit, b: KeywordHit): boolean {
  const aLength = a.end - a.start
  const bLength = b.end - b.start
  return aLength > bLength || (aLength === bLength && a.end > b.end)
}

/**
 * 같은 글자에 겹친 키워드는 긴 쪽, 길이가 같으면 뒤쪽을 남긴다.
 * 예: "햇감귤"은 햇감·감귤이 겹치므로 핵심어가 뒤에 오는 감귤로 판정한다.
 */
function detectFruit(
  normalized: string,
  dictionary: FruitDictionary[]
): string | null {
  const hits = findKeywordHits(normalized, dictionary)
  const categories = new Set(
    hits
      .filter(
        (hit) =>
          !hits.some(
            (other) =>
              other.start < hit.end &&
              hit.start < other.end &&
              outranks(other, hit)
          )
      )
      .map((hit) => hit.category)
  )

  if (categories.size !== 1) return null
  const [fruit] = categories
  return fruit ?? null
}

function extractWeight(
  raw: string,
  dictionary: FruitDictionary[]
): string | null {
  const allAliases: Record<string, string[]> = {}
  for (const entry of dictionary) {
    if (!entry.isActive) continue
    for (const [unit, aliases] of Object.entries(entry.weightAliases)) {
      if (!allAliases[unit]) allAliases[unit] = []
      for (const a of aliases) {
        if (!allAliases[unit].includes(a)) {
          allAliases[unit].push(a)
        }
      }
    }
  }

  return normalizeWeight(raw, allAliases)
}

function detectGrade(
  normalized: string,
  dictionary: FruitDictionary[]
): string | null {
  for (const entry of dictionary) {
    if (!entry.isActive) continue
    for (const group of entry.gradeSynonyms) {
      const allTerms = [group.canonical, ...group.aliases]
      for (const term of allTerms) {
        if (normalized.includes(term.toLowerCase())) {
          return group.canonical
        }
      }
    }
  }
  return null
}

function detectSize(
  normalized: string,
  dictionary: FruitDictionary[]
): string | null {
  for (const entry of dictionary) {
    if (!entry.isActive) continue
    for (const group of entry.sizeSynonyms) {
      const allTerms = [group.canonical, ...group.aliases]
      for (const term of allTerms) {
        if (normalized.includes(term.toLowerCase())) {
          return group.canonical
        }
      }
    }
  }
  return null
}
