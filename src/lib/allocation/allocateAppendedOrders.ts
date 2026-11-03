import { autoAllocate } from '@/lib/allocation/autoAllocator'
import {
  createAllocations,
  getAllocations,
  getUnallocatedOrders,
} from '@/lib/supabase/allocations'
import { getFruitDictionaries } from '@/lib/supabase/fruitDictionary'
import { getNameMappings } from '@/lib/supabase/nameMappings'
import { getProductMappings } from '@/lib/supabase/productMappings'
import { getAllSupplierProducts } from '@/lib/supabase/supplierProducts'
import { getAllSuppliers } from '@/lib/supabase/suppliers'

export async function getUnallocatedOrderIds(
  workSessionId: string
): Promise<Set<string>> {
  const orders = await getUnallocatedOrders(workSessionId)
  return new Set(orders.map((order) => order.id))
}

/**
 * 추가 업로드로 새로 들어온 주문만 자동 배정한다.
 * 사용자가 공급처별 삭제로 비운 주문이 되살아나지 않도록 업로드 전 미배정 주문은 제외한다.
 * 아직 배정 전인 작업건은 배정 단계에서 한꺼번에 처리한다.
 */
export async function allocateAppendedOrders(
  workSessionId: string,
  unallocatedBefore: Set<string>
): Promise<number> {
  const [allocations, unallocated] = await Promise.all([
    getAllocations(workSessionId),
    getUnallocatedOrders(workSessionId),
  ])
  if (allocations.length === 0) return 0

  const orders = unallocated.filter((order) => !unallocatedBefore.has(order.id))
  if (orders.length === 0) return 0

  const [
    productMappings,
    nameMappings,
    suppliers,
    supplierProducts,
    fruitDictionary,
  ] = await Promise.all([
    getProductMappings(),
    getNameMappings(),
    getAllSuppliers(),
    getAllSupplierProducts(),
    getFruitDictionaries(),
  ])

  const { allocated } = autoAllocate({
    orders,
    productMappings,
    nameMappings,
    suppliers,
    supplierProducts,
    fruitDictionary,
  })
  if (allocated.length > 0) await createAllocations(workSessionId, allocated)
  return allocated.length
}
