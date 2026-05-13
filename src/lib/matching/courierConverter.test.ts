import { describe, it, expect } from 'vitest'

import { convertCourierName } from './courierConverter'

import type { CourierMapping } from '@/types'

function makeMapping(overrides: Partial<CourierMapping> = {}): CourierMapping {
  return {
    id: 'cm-1',
    sourceName: 'CJ대한통운',
    coupangName: '씨제이대한통운',
    tossName: 'CJ대한통운(토스)',
    createdAt: '2026-05-01',
    ...overrides,
  }
}

describe('convertCourierName', () => {
  it('매핑 있을 때 쿠팡 택배사명 반환', () => {
    const result = convertCourierName(
      'CJ대한통운',
      'coupang',
      [makeMapping()]
    )

    expect(result.name).toBe('씨제이대한통운')
    expect(result.isMapped).toBe(true)
  })

  it('매핑 있을 때 토스 택배사명 반환', () => {
    const result = convertCourierName(
      'CJ대한통운',
      'toss',
      [makeMapping()]
    )

    expect(result.name).toBe('CJ대한통운(토스)')
    expect(result.isMapped).toBe(true)
  })

  it('매핑 없으면 원본명 반환 + isMapped=false', () => {
    const result = convertCourierName(
      '알 수 없는 택배',
      'coupang',
      [makeMapping()]
    )

    expect(result.name).toBe('알 수 없는 택배')
    expect(result.isMapped).toBe(false)
  })

  it('여러 택배사 매핑 중 정확한 것만 선택', () => {
    const mappings = [
      makeMapping({ id: 'cm-1', sourceName: 'CJ대한통운', coupangName: '씨제이', tossName: 'CJ' }),
      makeMapping({ id: 'cm-2', sourceName: '한진택배', coupangName: '한진', tossName: '한진(토스)' }),
    ]

    const result = convertCourierName('한진택배', 'coupang', mappings)
    expect(result.name).toBe('한진')
    expect(result.isMapped).toBe(true)
  })

  it('빈 매핑 목록이면 원본 반환', () => {
    const result = convertCourierName('CJ대한통운', 'coupang', [])

    expect(result.name).toBe('CJ대한통운')
    expect(result.isMapped).toBe(false)
  })
})
