import { describe, it, expect } from 'vitest'

import { extractAttributes } from './attributeExtractor'

import type { FruitDictionary } from '@/types'

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
    gradeSynonyms: [
      { canonical: '가정용', aliases: ['못난이', '랜덤'] },
    ],
    sizeSynonyms: [],
    weightAliases: { kg: ['키로', 'KG', '킬로'] },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: '3',
    category: '한라봉',
    keywords: ['한라봉'],
    gradeSynonyms: [],
    sizeSynonyms: [],
    weightAliases: { kg: ['키로', 'KG', '킬로'] },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
]

describe('extractAttributes', () => {
  it('쿠팡: 가정용 참외', () => {
    const result = extractAttributes(
      '산지직송 성주 꿀참외 고당도 가정용',
      '1박스 특가혼합과 5kg',
      DICT
    )
    expect(result.fruit).toBe('참외')
    expect(result.weight).toBe('5kg')
    expect(result.grade).toBe('가정용')
  })

  it('토스: 가정용 참외', () => {
    const result = extractAttributes(
      '성주 꿀참외, 가정용 참외',
      '1박스, 5kg',
      DICT
    )
    expect(result.fruit).toBe('참외')
    expect(result.weight).toBe('5kg')
    expect(result.grade).toBe('가정용')
  })

  it('A업체: 이모지 + 괄호 포함', () => {
    const result = extractAttributes(
      '⭐️가정용 성주참외 랜덤과 5kg(9-36과 내외)',
      '',
      DICT
    )
    expect(result.fruit).toBe('참외')
    expect(result.weight).toBe('5kg')
    expect(result.grade).toBe('가정용')
  })

  it('B업체: 소과 + 키로', () => {
    const result = extractAttributes(
      '참외 소과 5키로',
      '',
      DICT
    )
    expect(result.fruit).toBe('참외')
    expect(result.weight).toBe('5kg')
    expect(result.size).toBe('소과')
  })

  it('사과: 세척사과', () => {
    const result = extractAttributes(
      '껍질채먹는 간편한 세척사과',
      '1개 5kg(24-28과 내외)',
      DICT
    )
    expect(result.fruit).toBe('사과')
    expect(result.weight).toBe('5kg')
  })

  it('한라봉: 타임특가', () => {
    const result = extractAttributes(
      '[타임특가] 고당도 제주 한라봉',
      '1개 10kg',
      DICT
    )
    expect(result.fruit).toBe('한라봉')
    expect(result.weight).toBe('10kg')
  })

  it('다중 과일 키워드 → fruit null (ambiguous)', () => {
    const result = extractAttributes(
      '참외 사과 혼합 세트',
      '5kg',
      DICT
    )
    expect(result.fruit).toBeNull()
  })

  it('과일 키워드 없음 → fruit null', () => {
    const result = extractAttributes(
      '유기농 야채 세트',
      '5kg',
      DICT
    )
    expect(result.fruit).toBeNull()
  })

  it('비활성 사전은 무시', () => {
    const inactiveDict: FruitDictionary[] = [
      {
        ...DICT[0]!,
        isActive: false,
      },
    ]
    const result = extractAttributes(
      '성주 참외 5kg',
      '',
      inactiveDict
    )
    expect(result.fruit).toBeNull()
  })

  it('등급: 랜덤 → 가정용', () => {
    const result = extractAttributes(
      '참외 랜덤과',
      '5kg',
      DICT
    )
    expect(result.grade).toBe('가정용')
  })

  it('무게 없는 상품', () => {
    const result = extractAttributes(
      '참외 가정용',
      '1박스',
      DICT
    )
    expect(result.fruit).toBe('참외')
    expect(result.weight).toBeNull()
    expect(result.grade).toBe('가정용')
  })
})
