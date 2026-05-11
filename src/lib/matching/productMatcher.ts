import type { SupplierProduct } from '@/types'

export type MatchSuggestion = {
  supplierProduct: SupplierProduct
  score: number
  matchType: 'exact' | 'fuzzy'
}

export function suggestMatches(
  platformProductName: string,
  platformOptionName: string,
  supplierProducts: SupplierProduct[],
  options?: { threshold?: number; maxResults?: number }
): MatchSuggestion[] {
  const threshold = options?.threshold ?? 0.3
  const maxResults = options?.maxResults ?? 5

  if (supplierProducts.length === 0) return []

  const platformText = normalizeProductText(
    platformProductName + ' ' + platformOptionName
  )
  const platformTokens = tokenize(platformText)

  const results: MatchSuggestion[] = []

  for (const sp of supplierProducts) {
    const supplierText = normalizeProductText(
      sp.productName + ' ' + sp.optionName
    )
    const supplierTokens = tokenize(supplierText)

    const isExact =
      platformText === supplierText || jaccardSimilarity(platformTokens, supplierTokens) === 1.0

    const score = jaccardSimilarity(platformTokens, supplierTokens)

    if (score >= threshold) {
      results.push({
        supplierProduct: sp,
        score,
        matchType: isExact ? 'exact' : 'fuzzy',
      })
    }
  }

  results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    return a.supplierProduct.productName.localeCompare(
      b.supplierProduct.productName
    )
  })

  return results.slice(0, maxResults)
}

export function normalizeProductText(text: string): string {
  let result = text
  result = result.replace(/\[[^\]]*\]/g, '')
  result = result.replace(/㎏/g, 'kg')
  result = result.replace(/키로/g, 'kg')
  result = result.replace(/\s+/g, ' ')
  return result.trim()
}

export function tokenize(text: string): Set<string> {
  const lower = text.toLowerCase()
  const raw = lower.split(/[\s,./]+/).filter((t) => t.length > 0)

  const merged: string[] = []
  let i = 0
  while (i < raw.length) {
    const current = raw[i]!
    const next = raw[i + 1]

    if (/^\d+$/.test(current) && next && /^[a-z가-힣]+$/.test(next)) {
      merged.push(current + next)
      i += 2
    } else {
      merged.push(current)
      i++
    }
  }

  return new Set(merged)
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1.0

  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }

  const union = a.size + b.size - intersection
  if (union === 0) return 1.0

  return intersection / union
}
