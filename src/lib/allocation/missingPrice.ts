import { findSupplierProduct } from '@/lib/allocation/autoAllocator'

import type { SupplierProduct } from '@/types'

export type MissingPriceReason =
  | 'no_catalog'
  | 'no_match'
  | 'no_catalog_price'
  | 'outdated'

export const MISSING_PRICE_MESSAGES: Record<MissingPriceReason, string> = {
  no_catalog:
    '이 공급처의 상품 목록이 없습니다. 상품 목록을 갱신한 뒤 발주 상품을 선택해주세요.',
  no_match:
    '상품 목록에서 발주 상품을 하나로 찾지 못했습니다. 발주 상품을 눌러 직접 선택해주세요.',
  no_catalog_price:
    '상품 목록에 이 상품의 가격이 없습니다. 공급처 파일을 확인한 뒤 상품 목록을 갱신해주세요.',
  outdated:
    '상품 목록에는 가격이 있지만 배정에 반영되지 않았습니다. 발주 상품을 눌러 다시 선택해주세요.',
}

/** 배정에 단가가 저장되지 않은 이유를 현재 상품 목록 기준으로 판별한다. */
export function getMissingPriceReason(
  allocation: {
    supplierId: string
    supplierProductName: string
    supplierProductCode?: string
  },
  supplierProducts: SupplierProduct[]
): MissingPriceReason {
  const hasCatalog = supplierProducts.some(
    (sp) => sp.supplierId === allocation.supplierId
  )
  if (!hasCatalog) return 'no_catalog'

  const product = findSupplierProduct(
    allocation.supplierId,
    allocation.supplierProductName,
    allocation.supplierProductCode,
    supplierProducts
  )
  if (!product) return 'no_match'
  return product.price == null ? 'no_catalog_price' : 'outdated'
}
