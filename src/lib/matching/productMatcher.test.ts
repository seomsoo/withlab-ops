import { describe, it, expect } from 'vitest'
import { suggestMatches, normalizeProductText, tokenize } from './productMatcher'
import type { SupplierProduct } from '@/types'

function makeSP(
  overrides: Partial<SupplierProduct> & { productName: string }
): SupplierProduct {
  return {
    id: 'sp-' + Math.random().toString(36).slice(2, 8),
    supplierId: 'sup-1',
    productCode: '',
    optionName: '',
    category: '',
    price: null,
    stockStatus: 'available',
    stockRaw: '',
    courier: '',
    extra: {},
    uploadedAt: '2026-05-11',
    ...overrides,
  }
}

describe('suggestMatches', () => {
  it('1. 정확 일치: score 1.0, matchType exact', () => {
    const sp = makeSP({ productName: '한라봉 중과 5kg' })
    const results = suggestMatches('한라봉 중과 5kg', '', [sp])

    expect(results).toHaveLength(1)
    expect(results[0]!.score).toBe(1.0)
    expect(results[0]!.matchType).toBe('exact')
  })

  it('2. 높은 유사도: "한라봉 중과 5kg" ↔ "정품 한라봉 중과 5kg"', () => {
    const sp = makeSP({ productName: '정품 한라봉 중과 5kg' })
    const results = suggestMatches('한라봉 중과 5kg', '', [sp])

    expect(results).toHaveLength(1)
    expect(results[0]!.score).toBeGreaterThan(0.6)
  })

  it('3. 낮은 유사도: threshold 미달 → 제외', () => {
    const sp = makeSP({ productName: '애호박 2개입' })
    const results = suggestMatches('한라봉 중과 5kg', '', [sp])

    expect(results).toHaveLength(0)
  })

  it('4. threshold 적용: threshold=0.5면 score<0.5 제외', () => {
    const sp1 = makeSP({ productName: '한라봉 5kg' })
    const sp2 = makeSP({ productName: '딸기 500g' })
    const results = suggestMatches('한라봉 중과 5kg', '', [sp1, sp2], {
      threshold: 0.5,
    })

    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('5. maxResults 적용: maxResults=3이면 상위 3개만', () => {
    const products = Array.from({ length: 10 }, (_, i) =>
      makeSP({ productName: `한라봉 ${i}kg` })
    )
    const results = suggestMatches('한라봉', '', products, {
      maxResults: 3,
      threshold: 0.1,
    })

    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('6. 정렬: score 내림차순', () => {
    const sp1 = makeSP({ productName: '정품 한라봉 중과 5kg' })
    const sp2 = makeSP({ productName: '한라봉 중과 5kg' })
    const results = suggestMatches('한라봉 중과 5kg', '', [sp1, sp2])

    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results[0]!.score).toBeGreaterThanOrEqual(results[1]!.score)
  })

  it('7. 옵션명 포함 매칭', () => {
    const sp = makeSP({ productName: '한라봉 중과', optionName: '5kg' })
    const results = suggestMatches('한라봉', '중과 5kg', [sp])

    expect(results).toHaveLength(1)
    expect(results[0]!.score).toBeGreaterThan(0.5)
  })

  it('8. 빈 공급처 목록 → 빈 결과', () => {
    const results = suggestMatches('한라봉', '', [])
    expect(results).toHaveLength(0)
  })

  it('9. 숫자+단위 결합: "5 kg" → "5kg"', () => {
    const tokens = tokenize('5 kg')
    expect(tokens.has('5kg')).toBe(true)

    const sp = makeSP({ productName: '한라봉 5kg' })
    const results = suggestMatches('한라봉 5 kg', '', [sp])
    expect(results).toHaveLength(1)
    expect(results[0]!.score).toBe(1.0)
  })

  it('10. 대괄호 태그 제거: "[특가] 한라봉 5kg" ↔ "한라봉 5kg"', () => {
    const sp = makeSP({ productName: '한라봉 5kg' })
    const results = suggestMatches('[특가] 한라봉 5kg', '', [sp])

    expect(results).toHaveLength(1)
    expect(results[0]!.score).toBe(1.0)
  })

  it('11. 단위 통일: "5㎏" ↔ "5kg"', () => {
    const normalized = normalizeProductText('한라봉 5㎏')
    expect(normalized).toBe('한라봉 5kg')

    const sp = makeSP({ productName: '한라봉 5kg' })
    const results = suggestMatches('한라봉 5㎏', '', [sp])
    expect(results).toHaveLength(1)
    expect(results[0]!.score).toBe(1.0)
  })

  it('12. 동점 안정 정렬: score 동일 시 productName 오름차순', () => {
    const sp1 = makeSP({ productName: '한라봉 B' })
    const sp2 = makeSP({ productName: '한라봉 A' })
    const results = suggestMatches('한라봉', '', [sp1, sp2], { threshold: 0.1 })

    if (results.length >= 2 && results[0]!.score === results[1]!.score) {
      expect(
        results[0]!.supplierProduct.productName.localeCompare(
          results[1]!.supplierProduct.productName
        )
      ).toBeLessThanOrEqual(0)
    }
  })
})
