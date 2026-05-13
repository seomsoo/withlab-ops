import { normalizeProductName, normalizeWeight } from './normalizer'

import type { FruitDictionary } from '@/types'

export type ProductAttributes = {
  fruit: string | null
  weight: string | null
  grade: string | null
  size: string | null
  raw: string
}

export function extractAttributes(
  name: string,
  option: string,
  dictionary: FruitDictionary[],
  applyWeightMapping = false
): ProductAttributes {
  const combined = `${name} ${option}`
  const normalized = normalizeProductName(combined)

  const fruit = detectFruit(normalized, dictionary)
  let weight = extractWeight(combined, dictionary)
  const grade = detectGrade(normalized, dictionary)
  const size = detectSize(normalized, dictionary)

  if (applyWeightMapping && fruit && weight) {
    weight = mapWeight(fruit, weight, dictionary) ?? weight
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

function detectFruit(
  normalized: string,
  dictionary: FruitDictionary[]
): string | null {
  const matches: string[] = []

  for (const entry of dictionary) {
    if (!entry.isActive) continue
    for (const keyword of entry.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matches.push(entry.category)
        break
      }
    }
  }

  if (matches.length === 1) return matches[0]!
  if (matches.length > 1) return null
  return null
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
