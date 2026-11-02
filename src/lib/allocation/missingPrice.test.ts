import { describe, it, expect } from 'vitest'

import { getMissingPriceReason } from './missingPrice'

import type { SupplierProduct } from '@/types'

function makeProduct(overrides: Partial<SupplierProduct> = {}): SupplierProduct {
  return {
    id: 'sp-1',
    supplierId: 'supplier-1',
    productCode: '',
    productName: '참외 5kg',
    optionName: '',
    category: '',
    price: 10000,
    stockStatus: 'available',
    stockRaw: '',
    courier: '',
    extra: {},
    uploadedAt: '2026-11-02T00:00:00Z',
    ...overrides,
  }
}

const allocation = {
  supplierId: 'supplier-1',
  supplierProductName: '참외 5kg',
}

describe('getMissingPriceReason', () => {
  it('배정 공급처의 상품 목록이 없으면 no_catalog', () => {
    const others = [makeProduct({ supplierId: 'supplier-2' })]
    expect(getMissingPriceReason(allocation, others)).toBe('no_catalog')
  })

  it('상품 목록에 없는 상품이면 no_match', () => {
    const products = [makeProduct({ productName: '사과 5kg' })]
    expect(getMissingPriceReason(allocation, products)).toBe('no_match')
  })

  it('같은 상품명이 여러 개라 특정할 수 없으면 no_match', () => {
    const products = [makeProduct({ id: 'a' }), makeProduct({ id: 'b' })]
    expect(getMissingPriceReason(allocation, products)).toBe('no_match')
  })

  it('상품은 찾았지만 가격이 비어 있으면 no_catalog_price', () => {
    const products = [makeProduct({ price: null })]
    expect(getMissingPriceReason(allocation, products)).toBe('no_catalog_price')
  })

  it('상품 목록에 가격이 있는데 배정에 없으면 outdated', () => {
    expect(getMissingPriceReason(allocation, [makeProduct()])).toBe('outdated')
  })
})
