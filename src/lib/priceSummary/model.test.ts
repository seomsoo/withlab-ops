import { describe, expect, it } from 'vitest'
import { buildPriceRow, money, priceFileName } from './model'
import type { PriceOrder } from './model'
const order: PriceOrder = {
  id: 'o1',
  raw_row_number: 2,
  created_at: '',
  platform: 'coupang',
  quantity: 3,
  raw: {
    등록상품명: '사과',
    등록옵션명: '1kg',
    결제액: '30,000',
    우편번호: '01234',
    주문번호: '00123',
    택배사: '택배',
    주문일: '2026-10-29 12:00:00',
  },
  allocations: [
    {
      supplier_price: 9000,
      supplier_product_name: '사과',
      suppliers: { name: '공급처' },
    },
  ],
}
describe('가격정리 데이터', () => {
  it('단가는 수량을 곱하고 판매금액은 그대로 보존한다', () => {
    const r = buildPriceRow(order)
    expect(r.cells[11]).toBe(27000)
    expect(r.cells[12]).toBe(30000)
    expect(r.cells[9]).toBe('01234')
    expect(r.cells[3]).toBe('00123')
    expect(r.cells[0]).toBe('')
    expect(r.cells[1]).toBe('')
    expect(r.issues).toEqual([])
  })
  it('미배정 주문도 유지하고 가격만 비운다', () => {
    const r = buildPriceRow({ ...order, allocations: [] })
    expect(r.cells[5]).toBe('사과')
    expect(r.cells[11]).toBeNull()
    expect(r.issues).toHaveLength(1)
  })
  it('0원과 누락을 구분한다', () => {
    expect(money(0)).toBe(0)
    expect(money('')).toBeNull()
    expect(money('오류')).toBeNull()
    expect(money(-1)).toBeNull()
  })
  it('토스 원본 열을 읽는다', () => {
    const r = buildPriceRow({
      ...order,
      platform: 'toss',
      raw: {
        상품명: '배',
        옵션명: '2kg',
        주문금액: 25000,
        '수령인 연락처': '010-0000-0000',
        송장번호: '000123',
        택배사: '택배',
      },
    })
    expect(r.cells[5]).toBe('배')
    expect(r.cells[12]).toBe(25000)
    expect(r.cells[1]).toBe('000123')
    expect(r.cells[0]).toBe('')
  })
  it('최초 파일의 확장자만 바꾼다', () => {
    expect(priceFileName('쿠팡.10월.XLS')).toBe('쿠팡.10월_가격정리.xlsx')
  })
})
