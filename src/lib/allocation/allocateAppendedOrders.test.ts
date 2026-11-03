import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createAllocations,
  getAllocations,
  getUnallocatedOrders,
} from '@/lib/supabase/allocations'
import { allocateAppendedOrders } from './allocateAppendedOrders'
import { autoAllocate } from './autoAllocator'

import type { AllocationWithOrder } from '@/lib/supabase/allocations'
import type { StandardOrder } from '@/types'

vi.mock('./autoAllocator', () => ({ autoAllocate: vi.fn() }))
vi.mock('@/lib/supabase/allocations', () => ({
  createAllocations: vi.fn(),
  getAllocations: vi.fn(),
  getUnallocatedOrders: vi.fn(),
}))
vi.mock('@/lib/supabase/fruitDictionary', () => ({
  getFruitDictionaries: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/supabase/nameMappings', () => ({
  getNameMappings: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/supabase/productMappings', () => ({
  getProductMappings: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/supabase/supplierProducts', () => ({
  getAllSupplierProducts: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/supabase/suppliers', () => ({
  getAllSuppliers: vi.fn().mockResolvedValue([]),
}))

// as 사용 사유: 대상 선별에 쓰는 id만 필요한 테스트 데이터
const order = (id: string) => ({ id }) as StandardOrder
const allocation = { id: 'a1' } as AllocationWithOrder
const pending = { orderId: 'new' } as Parameters<
  typeof createAllocations
>[1][number]

describe('allocateAppendedOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(autoAllocate).mockReturnValue({
      allocated: [pending],
      suggested: [],
      unmatched: [],
    })
  })

  it('업로드 전부터 미배정이던 주문은 건드리지 않고 새 주문만 배정한다', async () => {
    vi.mocked(getAllocations).mockResolvedValue([allocation])
    vi.mocked(getUnallocatedOrders).mockResolvedValue([
      order('old'),
      order('new'),
    ])

    const count = await allocateAppendedOrders('session', new Set(['old']))

    expect(vi.mocked(autoAllocate).mock.calls[0]?.[0].orders).toEqual([
      order('new'),
    ])
    expect(createAllocations).toHaveBeenCalledWith('session', [pending])
    expect(count).toBe(1)
  })

  it('아직 배정 전인 작업건은 배정 단계에 맡긴다', async () => {
    vi.mocked(getAllocations).mockResolvedValue([])
    vi.mocked(getUnallocatedOrders).mockResolvedValue([order('new')])

    expect(await allocateAppendedOrders('session', new Set())).toBe(0)
    expect(autoAllocate).not.toHaveBeenCalled()
  })

  it('새 주문이 없으면 배정하지 않는다', async () => {
    vi.mocked(getAllocations).mockResolvedValue([allocation])
    vi.mocked(getUnallocatedOrders).mockResolvedValue([order('old')])

    expect(await allocateAppendedOrders('session', new Set(['old']))).toBe(0)
    expect(createAllocations).not.toHaveBeenCalled()
  })
})
