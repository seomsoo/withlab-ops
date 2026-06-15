import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'

import { detectPlatform } from './platformDetector'

describe('detectPlatform', () => {
  it('쿠팡 파일 감지', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['번호', '묶음배송번호', '주문번호', '택배사'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Delivery')

    expect(detectPlatform(wb)).toBe('coupang')
  })

  it('쿠팡 파일 감지: 헤더가 1행 아래로 내려간 양식', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['다운로드 안내'],
      ['번호', '묶음배송번호', '주문번호', '택배사'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Delivery')

    expect(detectPlatform(wb)).toBe('coupang')
  })

  it('쿠팡 파일 감지: Delivery가 아닌 시트명', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['번호', '묶음배송번호', '주문번호', '택배사'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '주문배송관리')

    expect(detectPlatform(wb)).toBe('coupang')
  })

  it('토스 파일 감지', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['일시 정보', '주문 정보'],
      ['주문일시', '주문번호', '주문상품번호'],
      ['수정 불가'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '주문내역')

    expect(detectPlatform(wb)).toBe('toss')
  })

  it('토스 파일 감지: 헤더가 1행인 새 양식', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['주문번호', '주문상품번호', '주문상태', '상품명', '주문건수', '주문일시'],
      ['수정 불가', '수정 불가', '수정 가능', '수정 불가', '수정 불가', '수정 불가'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '주문내역')

    expect(detectPlatform(wb)).toBe('toss')
  })

  it('알 수 없는 파일 → null', () => {
    const ws = XLSX.utils.aoa_to_sheet([['random', 'data']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    expect(detectPlatform(wb)).toBeNull()
  })
})
