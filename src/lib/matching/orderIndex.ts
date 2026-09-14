import type { StandardOrder } from '@/types'
import { cellToString } from '@/utils/excel'
import { getOrderDeduplicationKey } from '@/utils/orderKey'

export function buildOrderIndex(orders: StandardOrder[]) {
  const exact = new Map<string, StandardOrder[]>()
  const fallback = new Map<string, StandardOrder[]>()
  const add = (
    index: Map<string, StandardOrder[]>,
    key: string,
    order: StandardOrder
  ) => {
    if (!key) return
    const entries = index.get(key) ?? []
    if (!entries.includes(order)) entries.push(order)
    index.set(key, entries)
  }

  for (const order of orders) {
    const key = order.matchingKey.trim()
    add(exact, key, order)
    add(exact, getOrderDeduplicationKey(order), order)
    add(fallback, order.orderNo.trim(), order)
    if (order.platform === 'coupang') {
      // 묶음번호만 돌아온 운송장은 모든 상품을 후보로 남긴다.
      // 이전 키의 주문이 함께 있어도 첫 상품에 잘못 매칭하지 않는다.
      add(exact, cellToString(order.raw['묶음배송번호']), order)
    }
  }

  return { exact, fallback }
}
