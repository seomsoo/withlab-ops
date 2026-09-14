import { describe, expect, it } from 'vitest'
import type { Allocation, StandardOrder } from '@/types'
import { getOrderDeduplicationKey } from '@/utils/orderKey'
import { runDirectMatching } from './directMatcher'
import { runMatching } from './matchingEngine'

function makeOrder(optionId: string, legacy = false): StandardOrder {
  return {
    id: optionId,
    platform: 'coupang',
    orderNo: 'ORDER-1',
    orderItemNo: legacy ? 'BOX-1' : `BOX-1:${optionId}`,
    matchingKey: legacy ? 'BOX-1' : `BOX-1:${optionId}`,
    orderDate: '',
    productName: optionId,
    optionName: '',
    displayProductName: optionId,
    quantity: 1,
    buyerName: '',
    buyerPhone: '',
    buyerPhoneDigits: '',
    recipientName: '테스트',
    recipientPhone: '01012345678',
    recipientPhoneDigits: '01012345678',
    zipCode: '12345',
    address: '테스트 주소',
    deliveryMessage: '',
    raw: { 묶음배송번호: 'BOX-1', 옵션ID: optionId },
    rawValues: [],
    rawRowNumber: 2,
  }
}

describe.each(['direct', 'allocated'] as const)(
  '쿠팡 상품별 운송장 매칭: %s',
  (mode) => {
    function match(orders: StandardOrder[], keys: string[]) {
      const parsedTrackings = keys.map((key, index) => ({
        rawOrderKey: key,
        trackingCompany: 'CJ대한통운',
        trackingNumber: `TRACK-${index}`,
        raw: {},
        rawRowNumber: index + 2,
      }))
      if (mode === 'direct')
        return runDirectMatching({ orders, parsedTrackings })
      const allocations: Allocation[] = orders.map((order) => ({
        id: `ALLOC-${order.id}`,
        orderId: order.id,
        supplierId: 'SUPPLIER-1',
        supplierProductName: order.productName,
        allocatedQuantity: 1,
        status: 'ordered',
        isTemporaryOverride: false,
        nameMappingApplied: false,
        smartAllocationApplied: false,
        createdAt: '',
      }))
      return runMatching({
        orders,
        parsedTrackings,
        allocations,
        existingTrackings: [],
        sourceSupplierId: 'SUPPLIER-1',
      })
    }

    it('같은 묶음의 두 상품에 서로 다른 운송장을 매칭한다', () => {
      const result = match(
        [makeOrder('APPLE'), makeOrder('PEACH')],
        ['BOX-1:APPLE', 'BOX-1:PEACH']
      )
      expect(result.matched.map((item) => item.orderId)).toEqual([
        'APPLE',
        'PEACH',
      ])
      expect(result.unmatched).toHaveLength(0)
      expect(result.duplicated).toHaveLength(0)
    })

    it('상품이 하나인 묶음은 기존 묶음번호 운송장도 매칭한다', () => {
      expect(match([makeOrder('APPLE')], ['BOX-1']).matched[0]!.orderId).toBe(
        'APPLE'
      )
    })

    it.each([false, true])(
      '묶음번호만으로 여러 상품 중 하나를 임의 매칭하지 않는다 (이전 주문: %s)',
      (legacy) => {
        const result = match(
          [makeOrder('APPLE', legacy), makeOrder('PEACH')],
          ['BOX-1']
        )
        expect(result.matched).toHaveLength(0)
        expect(result.unmatched[0]!.invalidReason).toBe(
          '동일 주문키가 여러 주문에 존재'
        )
      }
    )

    it('이전 주문도 원본 옵션ID로 상품 단위 매칭이 가능하다', () => {
      expect(
        match([makeOrder('APPLE', true)], ['BOX-1:APPLE']).matched[0]!.orderId
      ).toBe('APPLE')
    })
  }
)

it('추가 업로드 시 이전에 저장한 상품만 중복이고 다른 옵션은 새 주문이다', () => {
  const oldKey = getOrderDeduplicationKey(makeOrder('APPLE', true))
  expect(oldKey).toBe(getOrderDeduplicationKey(makeOrder('APPLE')))
  expect(oldKey).not.toBe(getOrderDeduplicationKey(makeOrder('PEACH')))
})

it('토스 주문상품번호는 쿠팡 원본 필드에 영향을 받지 않는다', () => {
  const order = {
    ...makeOrder('APPLE'),
    platform: 'toss' as const,
    matchingKey: 'TOSS-1',
  }
  expect(getOrderDeduplicationKey(order)).toBe('TOSS-1')
})
