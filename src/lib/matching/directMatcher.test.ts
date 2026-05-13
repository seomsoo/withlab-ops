import { describe, it, expect } from 'vitest'

import { runDirectMatching } from './directMatcher'

import type { ParsedTracking, StandardOrder } from '@/types'

function makeOrder(overrides: Partial<StandardOrder> = {}): StandardOrder {
  return {
    id: 'order-1',
    platform: 'coupang',
    orderNo: 'ORD001',
    orderItemNo: 'ITEM001',
    matchingKey: 'MK001',
    orderDate: '2026-05-01',
    productName: '사과 3kg',
    optionName: '',
    displayProductName: '사과 3kg',
    quantity: 1,
    buyerName: '구매자',
    buyerPhone: '010-0000-0000',
    buyerPhoneDigits: '01000000000',
    recipientName: '홍길동',
    recipientPhone: '010-1111-1111',
    recipientPhoneDigits: '01011111111',
    zipCode: '12345',
    address: '서울시 강남구',
    deliveryMessage: '',
    raw: {},
    rawValues: [],
    rawRowNumber: 2,
    ...overrides,
  }
}

function makeParsedTracking(overrides: Partial<ParsedTracking> = {}): ParsedTracking {
  return {
    rawOrderKey: 'MK001',
    trackingCompany: 'CJ대한통운',
    trackingNumber: '1234567890',
    raw: {},
    rawRowNumber: 2,
    ...overrides,
  }
}

describe('directMatcher', () => {
  it('정상 매칭 — order 데이터 포함', () => {
    const result = runDirectMatching({
      parsedTrackings: [makeParsedTracking()],
      orders: [makeOrder()],
    })

    expect(result.matched).toHaveLength(1)
    expect(result.matched[0]!.orderId).toBe('order-1')
    expect(result.matched[0]!.order.productName).toBe('사과 3kg')
  })

  it('invalid — rawOrderKey 빈값', () => {
    const result = runDirectMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: '' })],
      orders: [makeOrder()],
    })

    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]!.invalidReason).toBe('필수값 누락')
  })

  it('invalid — trackingNumber 빈값', () => {
    const result = runDirectMatching({
      parsedTrackings: [makeParsedTracking({ trackingNumber: '' })],
      orders: [makeOrder()],
    })

    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]!.invalidReason).toBe('필수값 누락')
  })

  it('unmatched — 주문 없는 키', () => {
    const result = runDirectMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: 'UNKNOWN' })],
      orders: [makeOrder()],
    })

    expect(result.unmatched).toHaveLength(1)
    expect(result.unmatched[0]!.invalidReason).toBe('해당 주문 없음')
  })

  it('duplicated — 동일 orderId 중복', () => {
    const result = runDirectMatching({
      parsedTrackings: [
        makeParsedTracking({ rawOrderKey: 'MK001', rawRowNumber: 2 }),
        makeParsedTracking({ rawOrderKey: 'MK001', rawRowNumber: 3 }),
      ],
      orders: [makeOrder()],
    })

    expect(result.matched).toHaveLength(1)
    expect(result.duplicated).toHaveLength(1)
    expect(result.duplicated[0]!.invalidReason).toBe('이미 운송장 있음')
  })

  it('unmatched — 같은 matchingKey가 여러 order에 존재 (ambiguous)', () => {
    const result = runDirectMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: 'MK001' })],
      orders: [
        makeOrder({ id: 'order-1', matchingKey: 'MK001', platform: 'coupang' }),
        makeOrder({ id: 'order-2', matchingKey: 'MK001', platform: 'toss' }),
      ],
    })

    expect(result.unmatched).toHaveLength(1)
    expect(result.unmatched[0]!.invalidReason).toBe('동일 주문키가 여러 주문에 존재')
  })

  it('복수 주문 + 복수 운송장 혼합', () => {
    const result = runDirectMatching({
      parsedTrackings: [
        makeParsedTracking({ rawOrderKey: 'MK001', rawRowNumber: 2 }),
        makeParsedTracking({ rawOrderKey: 'MK002', rawRowNumber: 3 }),
        makeParsedTracking({ rawOrderKey: 'UNKNOWN', rawRowNumber: 4 }),
        makeParsedTracking({ rawOrderKey: '', rawRowNumber: 5 }),
      ],
      orders: [
        makeOrder({ id: 'order-1', matchingKey: 'MK001' }),
        makeOrder({ id: 'order-2', matchingKey: 'MK002' }),
      ],
    })

    expect(result.matched).toHaveLength(2)
    expect(result.unmatched).toHaveLength(1)
    expect(result.invalid).toHaveLength(1)
  })

  it('공백 trim 후 매칭', () => {
    const result = runDirectMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: '  MK001  ' })],
      orders: [makeOrder({ matchingKey: 'MK001' })],
    })

    expect(result.matched).toHaveLength(1)
  })

  it('alreadyMatchedOrderIds — 이전 파일에서 매칭된 주문은 중복 처리', () => {
    const result = runDirectMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: 'MK001' })],
      orders: [makeOrder({ id: 'order-1', matchingKey: 'MK001' })],
      alreadyMatchedOrderIds: new Set(['order-1']),
    })

    expect(result.matched).toHaveLength(0)
    expect(result.duplicated).toHaveLength(1)
    expect(result.duplicated[0]!.invalidReason).toBe('이미 운송장 있음')
  })

  it('alreadyMatchedOrderIds — 다른 주문은 정상 매칭', () => {
    const result = runDirectMatching({
      parsedTrackings: [
        makeParsedTracking({ rawOrderKey: 'MK001', rawRowNumber: 2 }),
        makeParsedTracking({ rawOrderKey: 'MK002', rawRowNumber: 3 }),
      ],
      orders: [
        makeOrder({ id: 'order-1', matchingKey: 'MK001' }),
        makeOrder({ id: 'order-2', matchingKey: 'MK002' }),
      ],
      alreadyMatchedOrderIds: new Set(['order-1']),
    })

    expect(result.matched).toHaveLength(1)
    expect(result.matched[0]!.orderId).toBe('order-2')
    expect(result.duplicated).toHaveLength(1)
    expect(result.duplicated[0]!.rawOrderKey).toBe('MK001')
  })
})
