import { buildOrderIndex } from './orderIndex'

import type {
  ParsedTracking,
  StandardOrder,
  UnmatchedTracking,
  DuplicatedTracking,
  InvalidTracking,
} from '@/types'

export type DirectMatchedTracking = ParsedTracking & {
  status: 'matched'
  orderId: string
  order: StandardOrder
}

export type DirectMatchingResult = {
  matched: DirectMatchedTracking[]
  unmatched: UnmatchedTracking[]
  duplicated: DuplicatedTracking[]
  invalid: InvalidTracking[]
}

export type DirectMatchingInput = {
  parsedTrackings: ParsedTracking[]
  orders: StandardOrder[]
  alreadyMatchedOrderIds?: Set<string>
}

export function runDirectMatching(input: DirectMatchingInput): DirectMatchingResult {
  const { parsedTrackings, orders, alreadyMatchedOrderIds } = input

  const { exact: ordersByMatchingKey, fallback: ordersByOrderNo } = buildOrderIndex(orders)

  const matchedOrderIds = new Set<string>(alreadyMatchedOrderIds)

  const matched: DirectMatchedTracking[] = []
  const unmatched: UnmatchedTracking[] = []
  const duplicated: DuplicatedTracking[] = []
  const invalid: InvalidTracking[] = []

  for (const pt of parsedTrackings) {
    if (pt.rawOrderKey.trim() === '' || pt.trackingNumber.trim() === '') {
      invalid.push({
        ...pt,
        status: 'invalid',
        invalidReason: '필수값 누락',
      })
      continue
    }

    const trimmedKey = pt.rawOrderKey.trim()
    let matchingOrders = ordersByMatchingKey.get(trimmedKey)
    if (!matchingOrders || matchingOrders.length === 0) {
      matchingOrders = ordersByOrderNo.get(trimmedKey)
    }

    if (!matchingOrders || matchingOrders.length === 0) {
      unmatched.push({
        ...pt,
        status: 'unmatched',
        invalidReason: '해당 주문 없음',
      })
      continue
    }

    if (matchingOrders.length > 1) {
      unmatched.push({
        ...pt,
        status: 'unmatched',
        invalidReason: '동일 주문키가 여러 주문에 존재',
      })
      continue
    }

    const order = matchingOrders[0]!

    if (matchedOrderIds.has(order.id)) {
      duplicated.push({
        ...pt,
        status: 'duplicated',
        invalidReason: '이미 운송장 있음',
        allocationId: '',
      })
      continue
    }

    matchedOrderIds.add(order.id)
    matched.push({
      ...pt,
      status: 'matched',
      orderId: order.id,
      order,
    })
  }

  return { matched, unmatched, duplicated, invalid }
}
