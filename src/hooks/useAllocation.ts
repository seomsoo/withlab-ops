import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  createAllocations,
  getAllocations,
  updateGroupSupplier,
  replaceAllocationsForGroup,
  getUnallocatedOrders,
} from '@/lib/supabase/allocations'
import { getProductMappings, switchDefaultSupplier, createAutoProductMapping } from '@/lib/supabase/productMappings'
import { getNameMappings } from '@/lib/supabase/nameMappings'
import { getAllSuppliers } from '@/lib/supabase/suppliers'
import { getAllSupplierProducts } from '@/lib/supabase/supplierProducts'
import { autoAllocate, findNameMapping } from '@/lib/allocation/autoAllocator'
import { getOrders } from '@/lib/supabase/orders'

import type { AllocationWithOrder } from '@/lib/supabase/allocations'
import type { PendingAllocation } from '@/lib/allocation/autoAllocator'
import type { StandardOrder, Platform } from '@/types'

export function useAllocation(workSessionId: string) {
  const [allocations, setAllocations] = useState<AllocationWithOrder[]>([])
  const [unallocatedOrders, setUnallocatedOrders] = useState<StandardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const fetchAllocations = useCallback(async () => {
    if (!workSessionId) return
    try {
      setLoading(true)
      const data = await getAllocations(workSessionId)
      setAllocations(data)
      const unalloc = await getUnallocatedOrders(workSessionId)
      setUnallocatedOrders(unalloc)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '배정 데이터 조회 실패'
      )
    } finally {
      setLoading(false)
    }
  }, [workSessionId])

  useEffect(() => {
    let alive = true
    void (async () => {
      if (!workSessionId) return
      try {
        setLoading(true)
        const data = await getAllocations(workSessionId)
        if (!alive) return
        setAllocations(data)
        const unalloc = await getUnallocatedOrders(workSessionId)
        if (!alive) return
        setUnallocatedOrders(unalloc)
      } catch (err) {
        if (!alive) return
        toast.error(
          err instanceof Error ? err.message : '배정 데이터 조회 실패'
        )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [workSessionId])

  const runAutoAllocation = useCallback(async () => {
    if (!workSessionId) return
    try {
      setRunning(true)
      const [orders, productMappingsRaw, nameMappingsRaw, suppliers, supplierProducts] =
        await Promise.all([
          getOrders(workSessionId),
          getProductMappings(),
          getNameMappings(),
          getAllSuppliers(),
          getAllSupplierProducts(),
        ])

      if (orders.length === 0) {
        toast.info('업로드된 주문이 없습니다')
        return
      }

      const result = autoAllocate({
        orders,
        productMappings: productMappingsRaw,
        nameMappings: nameMappingsRaw,
        suppliers,
        supplierProducts,
      })

      if (result.allocated.length > 0) {
        await createAllocations(workSessionId, result.allocated)
      }

      await fetchAllocations()

      const unmatchedCount = result.unmatched.length
      if (unmatchedCount > 0) {
        toast.warning(
          `자동 배정 완료 (미분류 ${unmatchedCount}건)`
        )
      } else {
        toast.success('자동 배정 완료')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '자동 배정 실패'
      )
      throw err
    } finally {
      setRunning(false)
    }
  }, [workSessionId, fetchAllocations])

  const handleUpdateGroupSupplier = useCallback(
    async (
      orderIds: string[],
      newSupplierId: string,
      platform: Platform,
      productName: string,
      optionName: string,
      isTemporaryOverride: boolean
    ) => {
      try {
        const nameMappingsAll = await getNameMappings()
        const nameResult = findNameMapping(
          platform,
          productName,
          optionName,
          newSupplierId,
          nameMappingsAll
        )

        await updateGroupSupplier({
          workSessionId,
          orderIds,
          newSupplierId,
          supplierProductName: nameResult.supplierProductName,
          supplierProductCode: nameResult.supplierProductCode,
          isTemporaryOverride,
          nameMappingApplied: nameResult.applied,
        })

        if (!isTemporaryOverride) {
          await switchDefaultSupplier({
            platform,
            productName,
            optionName,
            newSupplierId,
          })
        }

        await fetchAllocations()
        toast.success('공급처가 변경되었습니다')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '공급처 변경 실패'
        )
        throw err
      }
    },
    [workSessionId, fetchAllocations]
  )

  const assignUnmatched = useCallback(
    async (orderId: string, supplierId: string) => {
      try {
        const order = unallocatedOrders.find((o) => o.id === orderId)
        if (!order) throw new Error('주문을 찾을 수 없습니다')

        const nameMappingsAll = await getNameMappings()
        const nameResult = findNameMapping(
          order.platform,
          order.productName,
          order.optionName,
          supplierId,
          nameMappingsAll
        )

        const pending: PendingAllocation = {
          orderId,
          supplierId,
          supplierProductName: nameResult.supplierProductName,
          supplierProductCode: nameResult.supplierProductCode,
          allocatedQuantity: order.quantity,
          isTemporaryOverride: false,
          nameMappingApplied: nameResult.applied,
          smartAllocationApplied: false,
        }
        await createAllocations(workSessionId, [pending])

        try {
          await createAutoProductMapping({
            platform: order.platform,
            productName: order.productName,
            optionName: order.optionName,
            supplierId,
          })
        } catch {
          // unique constraint → mapping already exists
        }

        await fetchAllocations()
        toast.success('배정 완료')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '배정 실패'
        )
        throw err
      }
    },
    [workSessionId, unallocatedOrders, fetchAllocations]
  )

  const distributeGroup = useCallback(
    async (
      orderIds: string[],
      distributions: { supplierId: string; count: number }[],
      platform: Platform,
      productName: string,
      optionName: string
    ) => {
      try {
        const allocs = allocations.filter((a) => orderIds.includes(a.orderId))
        const orderedIds = allocs.map((a) => a.orderId)

        const nameMappingsAll = await getNameMappings()

        const nameCache = new Map<string, ReturnType<typeof findNameMapping>>()
        for (const dist of distributions) {
          if (!nameCache.has(dist.supplierId)) {
            nameCache.set(
              dist.supplierId,
              findNameMapping(platform, productName, optionName, dist.supplierId, nameMappingsAll)
            )
          }
        }

        let idx = 0
        const newAllocations: PendingAllocation[] = []
        for (const dist of distributions) {
          const nameResult = nameCache.get(dist.supplierId)!
          for (let i = 0; i < dist.count; i++) {
            const oid = orderedIds[idx]
            if (!oid) break
            const existingAlloc = allocs.find((a) => a.orderId === oid)
            newAllocations.push({
              orderId: oid,
              supplierId: dist.supplierId,
              supplierProductName: nameResult.supplierProductName,
              supplierProductCode: nameResult.supplierProductCode,
              allocatedQuantity: existingAlloc?.order.quantity ?? 1,
              isTemporaryOverride: false,
              nameMappingApplied: nameResult.applied,
              smartAllocationApplied: false,
            })
            idx++
          }
        }

        await replaceAllocationsForGroup(workSessionId, orderIds, newAllocations)
        await fetchAllocations()
        toast.success('분배가 적용되었습니다')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '분배 실패'
        )
        throw err
      }
    },
    [workSessionId, allocations, fetchAllocations]
  )

  return {
    allocations,
    unallocatedOrders,
    loading,
    running,
    runAutoAllocation,
    updateGroupSupplier: handleUpdateGroupSupplier,
    assignUnmatched,
    distributeGroup,
    refetch: fetchAllocations,
  }
}
