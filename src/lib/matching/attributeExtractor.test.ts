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
    weightMapping: {},
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
    weightMapping: {},
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
    weightMapping: {},
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

  describe('겹치는 키워드와 과일별 속성', () => {
    const makeEntry = (
      category: string,
      keywords: string[],
      sizeSynonyms: FruitDictionary['sizeSynonyms'] = [],
      weightMapping: FruitDictionary['weightMapping'] = {}
    ): FruitDictionary => ({
      id: category,
      category,
      keywords,
      gradeSynonyms: [],
      sizeSynonyms,
      weightAliases: { kg: ['키로', 'KG', '킬로'] },
      weightMapping,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    })

    const GAM_DICT = [
      makeEntry('감', ['감', '햇감', '단감']),
      makeEntry(
        '감귤',
        ['감귤', '귤'],
        [
          { canonical: '대과', aliases: ['중대', '혼합'] },
          { canonical: '로얄과', aliases: ['로얄', '꼬마'] },
        ],
        { '2kg': '3kg' }
      ),
      makeEntry('대봉감', ['대봉감']),
      makeEntry('사과', ['사과', '감홍'], [
        { canonical: '소과', aliases: ['꼬마'] },
      ]),
    ]

    it.each([
      ['제주 감귤', '감귤'],
      ['제주 햇감귤', '감귤'],
      ['대봉감 5kg', '대봉감'],
      ['달콤한 단감', '감'],
      ['문경 감홍사과', '사과'],
    ])('%s → %s', (name, fruit) => {
      expect(extractAttributes(name, '', GAM_DICT).fruit).toBe(fruit)
    })

    it('겹치지 않는 서로 다른 과일은 fruit null', () => {
      expect(extractAttributes('감귤 사과 세트', '', GAM_DICT).fruit).toBeNull()
    })

    it('크기는 판정된 과일의 사전에서만 찾는다', () => {
      const result = extractAttributes('제주 감귤', '1박스 꼬마', GAM_DICT)
      expect(result.size).toBe('로얄과')
    })

    it('중량과 크기는 상품명보다 옵션을 우선한다', () => {
      const result = extractAttributes(
        '제주감귤5kg 로얄과',
        '1개 3kg 중대',
        GAM_DICT
      )
      expect(result.weight).toBe('3kg')
      expect(result.size).toBe('대과')
    })

    it('옵션의 대괄호 안에 적힌 크기도 읽는다', () => {
      const result = extractAttributes('제주 감귤', '1박스 5kg [로얄과]', GAM_DICT)
      expect(result.size).toBe('로얄과')
    })

    it('크기 없는 감귤 주문은 대과로 본다', () => {
      const order = extractAttributes('제주 감귤', '1박스 10kg', GAM_DICT, true)
      expect(order.size).toBe('대과')
    })

    it('공급처 상품에는 기본 크기를 적용하지 않는다', () => {
      const product = extractAttributes('제주 감귤 10kg', '', GAM_DICT)
      expect(product.size).toBeNull()
    })

    it('주문 중량은 사전의 변환표를 적용한다', () => {
      const order = extractAttributes('제주 감귤', '1박스 2kg', GAM_DICT, true)
      expect(order.weight).toBe('3kg')
    })
  })
})
