import { extractAttributes } from './attributeExtractor'

import type { ProductAttributes } from './attributeExtractor'
import type { FruitDictionary, Supplier, SupplierProduct } from '@/types'

export type MatchCandidate = {
  supplierProduct: SupplierProduct
  supplier: Supplier
  score: number
  matchedAttributes: string[]
}

const WEIGHTS = {
  fruit: 0.4,
  weight: 0.25,
  grade: 0.2,
  size: 0.15,
} as const

export function findCandidatesByAttributes(
  platformAttrs: ProductAttributes,
  supplierProducts: SupplierProduct[],
  suppliers: Supplier[],
  dictionary: FruitDictionary[]
): MatchCandidate[] {
  if (platformAttrs.fruit == null) return []

  const supplierMap = new Map(suppliers.map((s) => [s.id, s]))
  const candidates: MatchCandidate[] = []

  for (const sp of supplierProducts) {
    const supplier = supplierMap.get(sp.supplierId)
    if (!supplier?.isActive) continue
    if (sp.stockStatus === 'soldout') continue

    const spAttrs = extractAttributes(sp.productName, sp.optionName, dictionary)

    const { score, matched } = computeScore(platformAttrs, spAttrs)

    if (score > 0) {
      candidates.push({
        supplierProduct: sp,
        supplier,
        score,
        matchedAttributes: matched,
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)

  return candidates
}

function computeScore(
  platform: ProductAttributes,
  supplier: ProductAttributes
): { score: number; matched: string[] } {
  const matched: string[] = []
  let score = 0

  if (platform.fruit == null || supplier.fruit == null) {
    return { score: 0, matched }
  }

  if (platform.fruit !== supplier.fruit) {
    return { score: 0, matched }
  }

  score += WEIGHTS.fruit
  matched.push('fruit')

  if (platform.weight != null && supplier.weight != null) {
    if (platform.weight === supplier.weight) {
      score += WEIGHTS.weight
      matched.push('weight')
    }
  } else if (platform.weight == null && supplier.weight == null) {
    score += WEIGHTS.weight
    matched.push('weight')
  }

  if (platform.grade != null && supplier.grade != null) {
    if (platform.grade === supplier.grade) {
      score += WEIGHTS.grade
      matched.push('grade')
    }
  } else if (platform.grade == null && supplier.grade == null) {
    score += WEIGHTS.grade
    matched.push('grade')
  }

  if (platform.size != null && supplier.size != null) {
    if (platform.size === supplier.size) {
      score += WEIGHTS.size
      matched.push('size')
    }
  } else if (platform.size == null && supplier.size == null) {
    score += WEIGHTS.size
    matched.push('size')
  }

  return { score, matched }
}

export const AUTO_APPLY_THRESHOLD = 0.8
export const SUGGEST_THRESHOLD = 0.5
export const MIN_GAP = 0.15

export function shouldAutoApply(candidates: MatchCandidate[]): boolean {
  if (candidates.length === 0) return false
  const best = candidates[0]!
  if (best.score < AUTO_APPLY_THRESHOLD) return false
  if (!best.matchedAttributes.includes('fruit')) return false
  if (!best.matchedAttributes.includes('weight')) return false

  if (candidates.length >= 2) {
    const second = candidates[1]!
    if (best.score - second.score < MIN_GAP) return false
  }

  return true
}
