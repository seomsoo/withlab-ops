import { describe, it, expect } from 'vitest'
import { autoAllocate } from './autoAllocator'
import type { StandardOrder, ProductMapping, NameMapping, Supplier } from '@/types'

function makeOrder(overrides: Partial<StandardOrder> = {}): StandardOrder {
  return {
    id: 'order-1',
    platform: 'coupang',
    orderNo: 'ORD-001',
    orderItemNo: 'ITEM-001',
    matchingKey: 'ORD-001',
    orderDate: '2026-05-10',
    productName: '참외 5kg',
    optionName: '가정용',
    quantity: 3,
    buyerName: '홍길동',
    buyerPhone: '010-1234-5678',
    buyerPhoneDigits: '01012345678',
    recipientName: '김철수',
    recipientPhone: '010-9876-5432',
    recipientPhoneDigits: '01098765432',
    zipCode: '12345',
    address: '서울시 강남구 역삼동 123',
    deliveryMessage: '부재시 문앞',
    raw: {},
    rawValues: [],
    rawRowNumber: 5,
    ...overrides,
  }
}

function makeMapping(overrides: Partial<ProductMapping> = {}): ProductMapping {
  return {
    id: 'pm-1',
    platform: 'coupang',
    productName: '참외 5kg',
    optionName: '가정용',
    supplierId: 'sup-A',
    isDefault: true,
    priority: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeNameMapping(overrides: Partial<NameMapping> = {}): NameMapping {
  return {
    id: 'nm-1',
    platform: 'coupang',
    platformProductName: '참외 5kg',
    platformOptionName: '가정용',
    supplierId: 'sup-A',
    supplierProductName: '성주참외 5kg 가정',
    supplierProductCode: 'CF-5K-H',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 'sup-A',
    name: 'A업체',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('autoAllocate', () => {
  it('1. 기본 배정: 매핑이 있는 주문을 올바른 공급처에 배정', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [makeMapping()],
      nameMappings: [],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated).toHaveLength(1)
    expect(result.allocated[0]!.supplierId).toBe('sup-A')
    expect(result.unmatched).toHaveLength(0)
  })

  it('2. 미분류: 매핑이 없는 주문은 unmatched', () => {
    const result = autoAllocate({
      orders: [makeOrder({ productName: '수박' })],
      productMappings: [makeMapping()],
      nameMappings: [],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated).toHaveLength(0)
    expect(result.unmatched).toHaveLength(1)
    expect(result.unmatched[0]!.reason).toBe('매핑 없음')
  })

  it('3. platform 우선순위: exact platform이 common보다 우선', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [
        makeMapping({ id: 'pm-common', platform: 'common', supplierId: 'sup-B' }),
        makeMapping({ id: 'pm-exact', platform: 'coupang', supplierId: 'sup-A' }),
      ],
      nameMappings: [],
      suppliers: [makeSupplier(), makeSupplier({ id: 'sup-B', name: 'B업체' })],
    })

    expect(result.allocated[0]!.supplierId).toBe('sup-A')
  })

  it('4. common fallback: exact가 없으면 common 매핑 사용', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [
        makeMapping({ id: 'pm-common', platform: 'common', supplierId: 'sup-B' }),
      ],
      nameMappings: [],
      suppliers: [makeSupplier({ id: 'sup-B', name: 'B업체' })],
    })

    expect(result.allocated[0]!.supplierId).toBe('sup-B')
  })

  it('5. common은 exact 없을 때만: exact platform이 있으면 common 무시', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [
        makeMapping({
          id: 'pm-common',
          platform: 'common',
          supplierId: 'sup-B',
          priority: 0,
        }),
        makeMapping({
          id: 'pm-exact',
          platform: 'coupang',
          supplierId: 'sup-A',
          priority: 99,
        }),
      ],
      nameMappings: [],
      suppliers: [makeSupplier(), makeSupplier({ id: 'sup-B', name: 'B업체' })],
    })

    expect(result.allocated[0]!.supplierId).toBe('sup-A')
  })

  it('6. isDefault 우선: 같은 품목에 여러 공급처, isDefault=true 우선', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [
        makeMapping({ id: 'pm-1', supplierId: 'sup-A', isDefault: false, priority: 0 }),
        makeMapping({ id: 'pm-2', supplierId: 'sup-B', isDefault: true, priority: 0 }),
      ],
      nameMappings: [],
      suppliers: [makeSupplier(), makeSupplier({ id: 'sup-B', name: 'B업체' })],
    })

    expect(result.allocated[0]!.supplierId).toBe('sup-B')
  })

  it('7. priority 순서: isDefault=true가 여러 개일 때 priority 낮은 것 우선', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [
        makeMapping({ id: 'pm-1', supplierId: 'sup-A', isDefault: true, priority: 5 }),
        makeMapping({ id: 'pm-2', supplierId: 'sup-B', isDefault: true, priority: 1 }),
      ],
      nameMappings: [],
      suppliers: [makeSupplier(), makeSupplier({ id: 'sup-B', name: 'B업체' })],
    })

    expect(result.allocated[0]!.supplierId).toBe('sup-B')
  })

  it('8. 상품명 변환 + nameMappingApplied=true', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [makeMapping()],
      nameMappings: [makeNameMapping()],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated[0]!.supplierProductName).toBe('성주참외 5kg 가정')
    expect(result.allocated[0]!.supplierProductCode).toBe('CF-5K-H')
    expect(result.allocated[0]!.nameMappingApplied).toBe(true)
  })

  it('9. 상품명 fallback + nameMappingApplied=false', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [makeMapping()],
      nameMappings: [],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated[0]!.supplierProductName).toBe('참외 5kg')
    expect(result.allocated[0]!.supplierProductCode).toBeUndefined()
    expect(result.allocated[0]!.nameMappingApplied).toBe(false)
  })

  it('10. NameMapping platform 우선순위: exact가 common보다 우선', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [makeMapping()],
      nameMappings: [
        makeNameMapping({
          id: 'nm-common',
          platform: 'common',
          supplierProductName: '공용 참외',
        }),
        makeNameMapping({
          id: 'nm-exact',
          platform: 'coupang',
          supplierProductName: '쿠팡 참외',
        }),
      ],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated[0]!.supplierProductName).toBe('쿠팡 참외')
  })

  it('11. 빈 주문 목록: 둘 다 빈 배열', () => {
    const result = autoAllocate({
      orders: [],
      productMappings: [makeMapping()],
      nameMappings: [],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated).toHaveLength(0)
    expect(result.unmatched).toHaveLength(0)
  })

  it('12. 빈 매핑 목록: 전부 unmatched', () => {
    const result = autoAllocate({
      orders: [makeOrder(), makeOrder({ id: 'order-2' })],
      productMappings: [],
      nameMappings: [],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated).toHaveLength(0)
    expect(result.unmatched).toHaveLength(2)
  })

  it('13. 옵션명 포함 매칭: productName + optionName 조합', () => {
    const result = autoAllocate({
      orders: [makeOrder({ optionName: '선물용' })],
      productMappings: [
        makeMapping({ id: 'pm-1', optionName: '가정용', supplierId: 'sup-A' }),
        makeMapping({ id: 'pm-2', optionName: '선물용', supplierId: 'sup-B' }),
      ],
      nameMappings: [],
      suppliers: [makeSupplier(), makeSupplier({ id: 'sup-B', name: 'B업체' })],
    })

    expect(result.allocated[0]!.supplierId).toBe('sup-B')
  })

  it('14. 옵션명 빈 문자열 매칭: optionName="" 매핑과 매칭', () => {
    const result = autoAllocate({
      orders: [makeOrder({ optionName: '' })],
      productMappings: [makeMapping({ optionName: '' })],
      nameMappings: [],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated).toHaveLength(1)
    expect(result.allocated[0]!.supplierId).toBe('sup-A')
  })

  it('15. 비활성 공급처 매핑도 자동 배정에 포함', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [makeMapping()],
      nameMappings: [],
      suppliers: [makeSupplier({ isActive: false })],
    })

    expect(result.allocated).toHaveLength(1)
    expect(result.allocated[0]!.supplierId).toBe('sup-A')
  })

  it('16. 스냅샷 저장: supplierProductName/supplierProductCode 포함', () => {
    const result = autoAllocate({
      orders: [makeOrder()],
      productMappings: [makeMapping()],
      nameMappings: [makeNameMapping()],
      suppliers: [makeSupplier()],
    })

    const alloc = result.allocated[0]!
    expect(alloc.supplierProductName).toBe('성주참외 5kg 가정')
    expect(alloc.supplierProductCode).toBe('CF-5K-H')
  })

  it('17-1. 옵션명 와일드카드: optionName="" 매핑이 비어있지 않은 옵션에도 적용', () => {
    const result = autoAllocate({
      orders: [makeOrder({ optionName: '선물용' })],
      productMappings: [makeMapping({ optionName: '' })],
      nameMappings: [],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated).toHaveLength(1)
    expect(result.allocated[0]!.supplierId).toBe('sup-A')
  })

  it('17-2. 옵션명 와일드카드: exact 옵션 매핑이 있으면 와일드카드보다 우선', () => {
    const result = autoAllocate({
      orders: [makeOrder({ optionName: '선물용' })],
      productMappings: [
        makeMapping({ id: 'pm-1', optionName: '', supplierId: 'sup-A' }),
        makeMapping({ id: 'pm-2', optionName: '선물용', supplierId: 'sup-B' }),
      ],
      nameMappings: [],
      suppliers: [makeSupplier(), makeSupplier({ id: 'sup-B', name: 'B업체' })],
    })

    expect(result.allocated[0]!.supplierId).toBe('sup-B')
  })

  it('18. allocatedQuantity === order.quantity', () => {
    const result = autoAllocate({
      orders: [makeOrder({ quantity: 7 })],
      productMappings: [makeMapping()],
      nameMappings: [],
      suppliers: [makeSupplier()],
    })

    expect(result.allocated[0]!.allocatedQuantity).toBe(7)
  })
})
