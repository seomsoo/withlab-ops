import { buildOrderIndex } from './orderIndex'

import type {
  ParsedTracking,
  StandardOrder,
  Allocation,
  Tracking,
  MatchingResult,
  MatchedTracking,
  UnmatchedTracking,
  DuplicatedTracking,
  InvalidTracking,
} from '@/types'

export type MatchingInput = {
  parsedTrackings: ParsedTracking[]
  orders: StandardOrder[]
  allocations: Allocation[]
  existingTrackings: Tracking[]
  sourceSupplierId: string
}

export function runMatching(input: MatchingInput): MatchingResult {
  const { parsedTrackings, orders, allocations, existingTrackings, sourceSupplierId } = input

  const { exact: ordersByMatchingKey, fallback: ordersByOrderNo } = buildOrderIndex(orders)

  const MATCHABLE_STATUSES: Allocation['status'][] = ['pending', 'ordered']
  const allocationByOrderAndSupplier = new Map<string, Allocation>()
  for (const alloc of allocations) {
    if (!MATCHABLE_STATUSES.includes(alloc.status)) continue
    const key = `${alloc.orderId}:${alloc.supplierId}`
    allocationByOrderAndSupplier.set(key, alloc)
  }

  const existingMatchedAllocIds = new Set<string>()
  for (const t of existingTrackings) {
    if (t.status === 'matched' && t.allocationId) {
      existingMatchedAllocIds.add(t.allocationId)
    }
  }

  const batchMatchedAllocIds = new Set<string>()

  const matched: MatchedTracking[] = []
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
    const allocKey = `${order.id}:${sourceSupplierId}`
    const allocation = allocationByOrderAndSupplier.get(allocKey)
    if (!allocation) {
      unmatched.push({
        ...pt,
        status: 'unmatched',
        invalidReason: '해당 공급처 배정 없음',
      })
      continue
    }

    if (existingMatchedAllocIds.has(allocation.id) || batchMatchedAllocIds.has(allocation.id)) {
      duplicated.push({
        ...pt,
        status: 'duplicated',
        invalidReason: '이미 운송장 있음',
        allocationId: allocation.id,
      })
      continue
    }

    batchMatchedAllocIds.add(allocation.id)
    matched.push({
      ...pt,
      status: 'matched',
      allocationId: allocation.id,
      orderId: order.id,
    })
  }

  return { matched, unmatched, duplicated, invalid }
}
