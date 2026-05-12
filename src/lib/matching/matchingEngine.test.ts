import { describe, it, expect } from 'vitest'

import { runMatching } from './matchingEngine'

import type {
  ParsedTracking,
  StandardOrder,
  Allocation,
  Tracking,
} from '@/types'

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

function makeAllocation(overrides: Partial<Allocation> = {}): Allocation {
  return {
    id: 'alloc-1',
    orderId: 'order-1',
    supplierId: 'supplier-1',
    supplierProductName: '사과',
    allocatedQuantity: 1,
    status: 'ordered',
    isTemporaryOverride: false,
    nameMappingApplied: false,
    smartAllocationApplied: false,
    createdAt: '2026-05-01',
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

function makeTracking(overrides: Partial<Tracking> = {}): Tracking {
  return {
    id: 'tracking-1',
    allocationId: 'alloc-1',
    status: 'matched',
    ignored: false,
    trackingCompany: 'CJ대한통운',
    trackingNumber: '1234567890',
    sourceSupplierId: 'supplier-1',
    rawOrderKey: 'MK001',
    raw: {},
    rawRowNumber: 2,
    uploadedAt: '2026-05-01',
    ...overrides,
  }
}

describe('matchingEngine', () => {
  it('1:1 매칭 성공 — rawOrderKey = order.matchingKey', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking()],
      orders: [makeOrder()],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.matched).toHaveLength(1)
    expect(result.matched[0]!.allocationId).toBe('alloc-1')
    expect(result.matched[0]!.orderId).toBe('order-1')
  })

  it('여러 건 매칭 — 복수 운송장 + 복수 주문', () => {
    const result = runMatching({
      parsedTrackings: [
        makeParsedTracking({ rawOrderKey: 'MK001' }),
        makeParsedTracking({ rawOrderKey: 'MK002', rawRowNumber: 3 }),
      ],
      orders: [
        makeOrder({ id: 'order-1', matchingKey: 'MK001' }),
        makeOrder({ id: 'order-2', matchingKey: 'MK002' }),
      ],
      allocations: [
        makeAllocation({ id: 'alloc-1', orderId: 'order-1' }),
        makeAllocation({ id: 'alloc-2', orderId: 'order-2' }),
      ],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.matched).toHaveLength(2)
  })

  it('unmatched: 주문 없음 — rawOrderKey에 해당하는 주문이 없는 경우', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: 'UNKNOWN' })],
      orders: [makeOrder()],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.unmatched).toHaveLength(1)
    expect(result.unmatched[0]!.invalidReason).toBe('해당 주문 없음')
  })

  it('unmatched: 배정 없음 — 주문은 있지만 해당 공급처 배정이 없는 경우', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking()],
      orders: [makeOrder()],
      allocations: [makeAllocation({ supplierId: 'other-supplier' })],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.unmatched).toHaveLength(1)
    expect(result.unmatched[0]!.invalidReason).toBe('해당 공급처 배정 없음')
  })

  it('unmatched: sourceSupplierId가 다른 allocation은 매칭 안 됨', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking()],
      orders: [makeOrder()],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'different-supplier',
    })

    expect(result.unmatched).toHaveLength(1)
    expect(result.unmatched[0]!.invalidReason).toBe('해당 공급처 배정 없음')
  })

  it('duplicated: 이미 매칭됨 — existingTrackings에 같은 allocationId', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking()],
      orders: [makeOrder()],
      allocations: [makeAllocation()],
      existingTrackings: [makeTracking({ allocationId: 'alloc-1', status: 'matched' })],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.duplicated).toHaveLength(1)
    expect(result.duplicated[0]!.invalidReason).toBe('이미 운송장 있음')
  })

  it('duplicated: 현재 배치 내 중복 — 같은 rawOrderKey 2회 등장', () => {
    const result = runMatching({
      parsedTrackings: [
        makeParsedTracking({ rawOrderKey: 'MK001', rawRowNumber: 2 }),
        makeParsedTracking({ rawOrderKey: 'MK001', rawRowNumber: 3 }),
      ],
      orders: [makeOrder()],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.matched).toHaveLength(1)
    expect(result.duplicated).toHaveLength(1)
    expect(result.duplicated[0]!.invalidReason).toBe('이미 운송장 있음')
  })

  it('invalid: rawOrderKey 빈 문자열', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: '' })],
      orders: [makeOrder()],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]!.invalidReason).toBe('필수값 누락')
  })

  it('invalid: trackingNumber 빈 문자열', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking({ trackingNumber: '' })],
      orders: [makeOrder()],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]!.invalidReason).toBe('필수값 누락')
  })

  it('공백 trim 후 매칭 — " 12345 " = "12345"', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: '  MK001  ' })],
      orders: [makeOrder({ matchingKey: 'MK001' })],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.matched).toHaveLength(1)
  })

  it('쿠팡 matchingKey(주문번호)로 매칭', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: '31100187326921' })],
      orders: [makeOrder({ platform: 'coupang', matchingKey: '31100187326921' })],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.matched).toHaveLength(1)
  })

  it('토스 matchingKey(주문상품번호)로 매칭', () => {
    const result = runMatching({
      parsedTrackings: [makeParsedTracking({ rawOrderKey: 'TOSS-ITEM-001' })],
      orders: [makeOrder({ platform: 'toss', matchingKey: 'TOSS-ITEM-001' })],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.matched).toHaveLength(1)
  })

  it('혼합: matched + unmatched + duplicated + invalid 혼합 결과', () => {
    const result = runMatching({
      parsedTrackings: [
        makeParsedTracking({ rawOrderKey: 'MK001', rawRowNumber: 2 }),
        makeParsedTracking({ rawOrderKey: 'UNKNOWN', rawRowNumber: 3 }),
        makeParsedTracking({ rawOrderKey: 'MK001', rawRowNumber: 4 }),
        makeParsedTracking({ rawOrderKey: '', rawRowNumber: 5 }),
      ],
      orders: [makeOrder()],
      allocations: [makeAllocation()],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.matched).toHaveLength(1)
    expect(result.unmatched).toHaveLength(1)
    expect(result.duplicated).toHaveLength(1)
    expect(result.invalid).toHaveLength(1)
  })

  it('하나의 공급처 파일에 쿠팡/토스 주문이 섞여도 매칭됨', () => {
    const result = runMatching({
      parsedTrackings: [
        makeParsedTracking({ rawOrderKey: 'COUPANG-001', rawRowNumber: 2 }),
        makeParsedTracking({ rawOrderKey: 'TOSS-ITEM-001', rawRowNumber: 3 }),
      ],
      orders: [
        makeOrder({ id: 'order-c', platform: 'coupang', matchingKey: 'COUPANG-001' }),
        makeOrder({ id: 'order-t', platform: 'toss', matchingKey: 'TOSS-ITEM-001' }),
      ],
      allocations: [
        makeAllocation({ id: 'alloc-c', orderId: 'order-c' }),
        makeAllocation({ id: 'alloc-t', orderId: 'order-t' }),
      ],
      existingTrackings: [],
      sourceSupplierId: 'supplier-1',
    })

    expect(result.matched).toHaveLength(2)
  })
})
