import { describe, it, expect } from 'vitest'

import {
  findCandidatesByAttributes,
  shouldAutoApply,
  AUTO_APPLY_THRESHOLD,
} from './attributeMatcher'
import { extractAttributes } from './attributeExtractor'

import type { FruitDictionary, Supplier, SupplierProduct } from '@/types'

const DICT: FruitDictionary[] = [
  {
    id: '1',
    category: '참외',
    keywords: ['참외'],
    gradeSynonyms: [
      { canonical: '가정용', aliases: ['못난이', '랜덤', '렌덤', '혼합', '흠과'] },
      { canonical: '선물용', aliases: ['프리미엄', '특선'] },
    ],
    sizeSynonyms: [
      { canonical: '소과', aliases: ['소'] },
      { canonical: '대과', aliases: ['대', '왕'] },
    ],
    weightAliases: { kg: ['키로', 'KG', '킬로'] },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: '2',
    category: '사과',
    keywords: ['사과'],
    gradeSynonyms: [],
    sizeSynonyms: [],
    weightAliases: { kg: ['키로', 'KG', '킬로'] },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
]

const SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'A농장', isActive: true, createdAt: '', updatedAt: '' },
  { id: 's2', name: 'B농장', isActive: true, createdAt: '', updatedAt: '' },
]

function makeSp(
  id: string,
  supplierId: string,
  productName: string,
  optionName = ''
): SupplierProduct {
  return {
    id,
    supplierId,
    productCode: '',
    productName,
    optionName,
    category: '',
    price: 10000,
    stockStatus: 'available',
    stockRaw: '',
    courier: '',
    extra: {},
    uploadedAt: '',
  }
}

describe('findCandidatesByAttributes', () => {
  it('동일 과일+무게+등급 → 높은 score', () => {
    const sps = [makeSp('sp1', 's1', '참외 가정용 5kg')]
    const attrs = extractAttributes('참외 가정용', '5kg', DICT)
    const result = findCandidatesByAttributes(attrs, sps, SUPPLIERS, DICT)

    expect(result).toHaveLength(1)
    expect(result[0]!.score).toBeGreaterThanOrEqual(AUTO_APPLY_THRESHOLD)
    expect(result[0]!.matchedAttributes).toContain('fruit')
    expect(result[0]!.matchedAttributes).toContain('weight')
    expect(result[0]!.matchedAttributes).toContain('grade')
  })

  it('fruit 불일치 → score 0', () => {
    const sps = [makeSp('sp1', 's1', '사과 가정용 5kg')]
    const attrs = extractAttributes('참외 가정용', '5kg', DICT)
    const result = findCandidatesByAttributes(attrs, sps, SUPPLIERS, DICT)

    expect(result).toHaveLength(0)
  })

  it('fruit null (ambiguous) → 빈 배열', () => {
    const sps = [makeSp('sp1', 's1', '참외 가정용 5kg')]
    const attrs = extractAttributes('참외 사과 혼합', '5kg', DICT)
    // platform fruit is null because ambiguous
    expect(attrs.fruit).toBeNull()
    const result = findCandidatesByAttributes(attrs, sps, SUPPLIERS, DICT)
    expect(result).toHaveLength(0)
  })

  it('score DESC 정렬', () => {
    const sps = [
      makeSp('sp1', 's1', '참외 5kg'),
      makeSp('sp2', 's2', '참외 가정용 5kg'),
    ]
    const attrs = extractAttributes('참외 가정용', '5kg', DICT)
    const result = findCandidatesByAttributes(attrs, sps, SUPPLIERS, DICT)

    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result[0]!.score).toBeGreaterThanOrEqual(result[1]!.score)
  })

  it('비활성 공급처 제외', () => {
    const inactiveSuppliers: Supplier[] = [
      { ...SUPPLIERS[0]!, isActive: false },
    ]
    const sps = [makeSp('sp1', 's1', '참외 가정용 5kg')]
    const attrs = extractAttributes('참외 가정용', '5kg', DICT)
    const result = findCandidatesByAttributes(attrs, sps, inactiveSuppliers, DICT)

    expect(result).toHaveLength(0)
  })
})

describe('shouldAutoApply', () => {
  it('score ≥ 0.8 + fruit/weight 매칭 + gap ≥ 0.15 → true', () => {
    const candidates = [
      {
        supplierProduct: makeSp('sp1', 's1', ''),
        supplier: SUPPLIERS[0]!,
        score: 1.0,
        matchedAttributes: ['fruit', 'weight', 'grade', 'size'],
      },
      {
        supplierProduct: makeSp('sp2', 's2', ''),
        supplier: SUPPLIERS[1]!,
        score: 0.4,
        matchedAttributes: ['fruit'],
      },
    ]
    expect(shouldAutoApply(candidates)).toBe(true)
  })

  it('score < 0.8 → false', () => {
    const candidates = [
      {
        supplierProduct: makeSp('sp1', 's1', ''),
        supplier: SUPPLIERS[0]!,
        score: 0.65,
        matchedAttributes: ['fruit', 'weight'],
      },
    ]
    expect(shouldAutoApply(candidates)).toBe(false)
  })

  it('1위/2위 gap < 0.15 → false', () => {
    const candidates = [
      {
        supplierProduct: makeSp('sp1', 's1', ''),
        supplier: SUPPLIERS[0]!,
        score: 0.85,
        matchedAttributes: ['fruit', 'weight', 'grade'],
      },
      {
        supplierProduct: makeSp('sp2', 's2', ''),
        supplier: SUPPLIERS[1]!,
        score: 0.80,
        matchedAttributes: ['fruit', 'weight', 'grade'],
      },
    ]
    expect(shouldAutoApply(candidates)).toBe(false)
  })

  it('weight 미매칭 → false', () => {
    const candidates = [
      {
        supplierProduct: makeSp('sp1', 's1', ''),
        supplier: SUPPLIERS[0]!,
        score: 0.85,
        matchedAttributes: ['fruit', 'grade', 'size'],
      },
    ]
    expect(shouldAutoApply(candidates)).toBe(false)
  })

  it('빈 배열 → false', () => {
    expect(shouldAutoApply([])).toBe(false)
  })

  it('단일 후보 + 조건 충족 → true (gap 조건 자동 통과)', () => {
    const candidates = [
      {
        supplierProduct: makeSp('sp1', 's1', ''),
        supplier: SUPPLIERS[0]!,
        score: 1.0,
        matchedAttributes: ['fruit', 'weight', 'grade', 'size'],
      },
    ]
    expect(shouldAutoApply(candidates)).toBe(true)
  })
})
