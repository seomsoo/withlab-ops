import { describe, it, expect } from 'vitest'

import { normalizeProductName, normalizeWeight } from './normalizer'

describe('normalizeProductName', () => {
  it('이모지 제거', () => {
    expect(normalizeProductName('⭐️가정용 성주참외')).toBe(
      '가정용 성주참외'
    )
  })

  it('대괄호 마케팅 문구 제거', () => {
    expect(normalizeProductName('[타임특가] 고당도 제주 한라봉')).toBe(
      '고당도 제주 한라봉'
    )
    expect(normalizeProductName('[노마진특가][오늘특가] 참외')).toBe('참외')
  })

  it('괄호 안 규격 정보 보존', () => {
    expect(
      normalizeProductName('가정용 성주참외 랜덤과 5kg(9-36과 내외)')
    ).toBe('가정용 성주참외 랜덤과 5kg 9-36과 내외')
  })

  it('특수문자 제거', () => {
    expect(normalizeProductName('◆가정용◆ 참외')).toBe('가정용 참외')
  })

  it('다중 공백 → 단일 공백', () => {
    expect(normalizeProductName('참외   5kg')).toBe('참외 5kg')
  })

  it('소문자 변환', () => {
    expect(normalizeProductName('KG Pack')).toBe('kg pack')
  })

  it('복합 케이스: 쿠팡 상품명', () => {
    expect(
      normalizeProductName('⭐️가정용 성주참외 랜덤과 5kg(9-36과 내외)')
    ).toBe('가정용 성주참외 랜덤과 5kg 9-36과 내외')
  })

  it('복합 케이스: 타임특가 상품', () => {
    expect(
      normalizeProductName('[타임특가] 고당도 제주 한라봉')
    ).toBe('고당도 제주 한라봉')
  })

  it('빈 문자열', () => {
    expect(normalizeProductName('')).toBe('')
  })

  it('trim 처리', () => {
    expect(normalizeProductName('  참외  ')).toBe('참외')
  })
})

describe('normalizeWeight', () => {
  it('기본 kg 추출', () => {
    expect(normalizeWeight('참외 5kg')).toBe('5kg')
  })

  it('소수점 무게', () => {
    expect(normalizeWeight('사과 2.5kg')).toBe('2.5kg')
  })

  it('키로 → kg 변환 (aliases)', () => {
    const aliases = { kg: ['키로', 'KG', '킬로'] }
    expect(normalizeWeight('참외 소과 5키로', aliases)).toBe('5kg')
  })

  it('킬로 → kg 변환 (aliases)', () => {
    const aliases = { kg: ['키로', 'KG', '킬로'] }
    expect(normalizeWeight('사과 10킬로', aliases)).toBe('10kg')
  })

  it('무게 없는 경우 null', () => {
    expect(normalizeWeight('참외 가정용')).toBeNull()
  })

  it('대문자 KG', () => {
    expect(normalizeWeight('사과 5KG')).toBe('5kg')
  })

  it('공백 있는 무게', () => {
    expect(normalizeWeight('참외 5 kg')).toBe('5kg')
  })
})
