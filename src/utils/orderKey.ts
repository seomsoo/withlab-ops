import type { StandardOrder } from '@/types'
import { cellToString } from '@/utils/excel'

export function buildCoupangOrderKey(
  shipmentBoxId: string,
  optionId: string
): string {
  return `${shipmentBoxId}:${optionId}`
}

/** 이전 버전에서 저장한 묶음배송번호 키도 상품 단위로 비교한다. */
export function getOrderDeduplicationKey(
  order: Pick<StandardOrder, 'platform' | 'matchingKey' | 'raw'>
): string {
  if (order.platform === 'coupang') {
    const boxId = cellToString(order.raw['묶음배송번호'])
    const optionId = cellToString(order.raw['옵션ID'])
    if (boxId && optionId) return buildCoupangOrderKey(boxId, optionId)
  }
  return order.matchingKey
}
