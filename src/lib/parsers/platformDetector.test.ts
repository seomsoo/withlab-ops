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

  it('토스 파일 감지', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['안내문구'],
      ['그룹헤더'],
      ['주문일시', '주문번호', '주문상품번호'],
      ['수정 불가'],
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
