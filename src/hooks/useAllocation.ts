import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  createAllocations,
  getAllocations,
  updateGroupSupplier,
  updateGroupSupplierProduct,
  replaceAllocationsForGroup,
  getUnallocatedOrders,
  deleteAllAllocations,
} from '@/lib/supabase/allocations'
import { getProductMappings, switchDefaultSupplier, createProductMappingsBulk } from '@/lib/supabase/productMappings'
import { getNameMappings } from '@/lib/supabase/nameMappings'
import { getAllSuppliers } from '@/lib/supabase/suppliers'
import { getAllSupplierProducts } from '@/lib/supabase/supplierProducts'
import { autoAllocate, findNameMapping } from '@/lib/allocation/autoAllocator'
import { extractAttributes } from '@/lib/matching/attributeExtractor'
import { getOrders } from '@/lib/supabase/orders'
import { getFruitDictionaries } from '@/lib/supabase/fruitDictionary'

import type { AllocationWithOrder } from '@/lib/supabase/allocations'
import type { PendingAllocation, SuggestedAllocation } from '@/lib/allocation/autoAllocator'
import type { StandardOrder, Platform, SupplierProduct } from '@/types'

export function useAllocation(workSessionId: string, initialOverrides?: Map<string, string>) {
  const [allocations, setAllocations] = useState<AllocationWithOrder[]>([])
  const [unallocatedOrders, setUnallocatedOrders] = useState<StandardOrder[]>([])
  const [suggested, setSuggested] = useState<SuggestedAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const resolveSupplierProductName = useCallback(
    async (
      _platform: Platform,
      productName: string,
      optionName: string,
      supplierId: string
    ): Promise<SupplierProduct | null> => {
      try {
        const [spAll, dictAll] = await Promise.all([
          getAllSupplierProducts(),
          getFruitDictionaries(),
        ])
        if (dictAll.length === 0) return null
        const attrs = extractAttributes(productName, optionName, dictAll, true)
        if (!attrs.fruit) return null
        const forSupplier = spAll.filter((sp) => sp.supplierId === supplierId)
        let bestSp: SupplierProduct | null = null
        let bestScore = 0
        for (const sp of forSupplier) {
          const spAttrs = extractAttributes(sp.productName, '', dictAll)
          if (!spAttrs.fruit || spAttrs.fruit !== attrs.fruit) continue
          let score = 0.4
          if (attrs.weight && spAttrs.weight && attrs.weight === spAttrs.weight) score += 0.25
          if (attrs.grade && spAttrs.grade && attrs.grade === spAttrs.grade) score += 0.2
          if (attrs.size && spAttrs.size && attrs.size === spAttrs.size) score += 0.15
          if (score > bestScore) {
            bestScore = score
            bestSp = sp
          }
        }
        return bestSp
      } catch {
        return null
      }
    },
    []
  )

  const fetchAllocations = useCallback(async () => {
    if (!workSessionId) return
    try {
      const data = await getAllocations(workSessionId)
      setAllocations(data)
      const unalloc = await getUnallocatedOrders(workSessionId)
      setUnallocatedOrders(unalloc)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '배정 데이터 조회 실패'
      )
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

        if (unalloc.length > 0 && data.length === 0 && initialOverrides && initialOverrides.size > 0) {
          const [orders, productMappingsRaw, nameMappingsRaw, suppliers, supplierProducts, fruitDictionary] =
            await Promise.all([
              getOrders(workSessionId),
              getProductMappings(),
              getNameMappings(),
              getAllSuppliers(),
              getAllSupplierProducts(),
              getFruitDictionaries(),
            ])
          if (!alive) return
          const result = autoAllocate({
            orders,
            productMappings: productMappingsRaw,
            nameMappings: nameMappingsRaw,
            suppliers,
            supplierProducts,
            fruitDictionary,
            keywordOverrides: initialOverrides,
          })
          if (result.allocated.length > 0) {
            await createAllocations(workSessionId, result.allocated)
          }
          if (!alive) return
          const freshData = await getAllocations(workSessionId)
          if (!alive) return
          setAllocations(freshData)
          const freshUnalloc = await getUnallocatedOrders(workSessionId)
          if (!alive) return
          setUnallocatedOrders(freshUnalloc)
          setSuggested(result.suggested)
        } else if (unalloc.length > 0 && data.length > 0) {
          const [productMappingsRaw, nameMappingsRaw, suppliers, supplierProducts, fruitDictionary] =
            await Promise.all([
              getProductMappings(),
              getNameMappings(),
              getAllSuppliers(),
              getAllSupplierProducts(),
              getFruitDictionaries(),
            ])
          if (!alive) return
          const result = autoAllocate({
            orders: unalloc,
            productMappings: productMappingsRaw,
            nameMappings: nameMappingsRaw,
            suppliers,
            supplierProducts,
            fruitDictionary,
          })
          setSuggested(result.suggested)
        }
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
  }, [workSessionId, initialOverrides])

  const runAutoAllocation = useCallback(async (keywordOverrides?: Map<string, string>) => {
    if (!workSessionId) return
    try {
      setRunning(true)
      const [orders, productMappingsRaw, nameMappingsRaw, suppliers, supplierProducts, fruitDictionary] =
        await Promise.all([
          getOrders(workSessionId),
          getProductMappings(),
          getNameMappings(),
          getAllSuppliers(),
          getAllSupplierProducts(),
          getFruitDictionaries(),
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
        fruitDictionary,
        keywordOverrides,
      })

      if (result.allocated.length > 0) {
        await createAllocations(workSessionId, result.allocated)
      }

      await fetchAllocations()
      setSuggested(result.suggested)

      const unmatchedCount = result.unmatched.length
      const suggestedCount = result.suggested.length
      if (unmatchedCount > 0) {
        const parts = [`미분류 ${unmatchedCount - suggestedCount}건`]
        if (suggestedCount > 0) parts.push(`추천 ${suggestedCount}건`)
        toast.warning(`자동 배정 완료 (${parts.join(', ')})`)
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

  const resetAndRerun = useCallback(async (keywordOverrides?: Map<string, string>) => {
    if (!workSessionId) return
    try {
      setRunning(true)
      await deleteAllAllocations(workSessionId)
      setAllocations([])
      setSuggested([])

      const [orders, productMappingsRaw, nameMappingsRaw, suppliers, supplierProducts, fruitDictionary] =
        await Promise.all([
          getOrders(workSessionId),
          getProductMappings(),
          getNameMappings(),
          getAllSuppliers(),
          getAllSupplierProducts(),
          getFruitDictionaries(),
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
        fruitDictionary,
        keywordOverrides,
      })

      if (result.allocated.length > 0) {
        await createAllocations(workSessionId, result.allocated)
      }

      await fetchAllocations()
      setSuggested(result.suggested)
      toast.success('재배정 완료')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '재배정 실패')
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

        let resolvedProductName = nameResult.supplierProductName
        let resolvedProductCode = nameResult.supplierProductCode
        let resolvedPrice: number | undefined
        if (!nameResult.applied) {
          const resolved = await resolveSupplierProductName(
            platform, productName, optionName, newSupplierId
          )
          if (resolved) {
            resolvedProductName = resolved.productName
            resolvedProductCode = resolved.productCode || undefined
            resolvedPrice = resolved.price ?? undefined
          }
        }

        await updateGroupSupplier({
          workSessionId,
          orderIds,
          newSupplierId,
          supplierProductName: resolvedProductName,
          supplierProductCode: resolvedProductCode,
          supplierPrice: resolvedPrice,
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
    [workSessionId, fetchAllocations, resolveSupplierProductName]
  )

  const assignUnmatched = useCallback(
    async (orderIds: string[], supplierId: string) => {
      try {
        const nameMappingsAll = await getNameMappings()
        const pendingAllocations: PendingAllocation[] = []
        const mappingItems: Array<{ platform: Platform; productName: string; optionName: string; supplierId: string }> = []

        for (const orderId of orderIds) {
          const order = unallocatedOrders.find((o) => o.id === orderId)
          if (!order) continue

          const nameResult = findNameMapping(
            order.platform,
            order.productName,
            order.optionName,
            supplierId,
            nameMappingsAll
          )

          let resolvedProductName = nameResult.supplierProductName
          let resolvedProductCode = nameResult.supplierProductCode
          let resolvedPrice: number | undefined
          if (!nameResult.applied) {
            const resolved = await resolveSupplierProductName(
              order.platform, order.productName, order.optionName, supplierId
            )
            if (resolved) {
              resolvedProductName = resolved.productName
              resolvedProductCode = resolved.productCode || undefined
              resolvedPrice = resolved.price ?? undefined
            }
          }

          pendingAllocations.push({
            orderId,
            supplierId,
            supplierProductName: resolvedProductName,
            supplierProductCode: resolvedProductCode,
            allocatedQuantity: order.quantity,
            isTemporaryOverride: false,
            nameMappingApplied: nameResult.applied,
            smartAllocationApplied: false,
            supplierPrice: resolvedPrice,
          })

          mappingItems.push({
            platform: order.platform,
            productName: order.productName,
            optionName: order.optionName,
            supplierId,
          })
        }

        if (pendingAllocations.length > 0) {
          await createAllocations(workSessionId, pendingAllocations)
        }

        if (mappingItems.length > 0) {
          const seen = new Set<string>()
          const deduped = mappingItems.filter((item) => {
            const key = `${item.platform}::${item.productName}::${item.optionName}::${item.supplierId}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          try {
            await createProductMappingsBulk(deduped)
          } catch (err) {
            console.error('매핑 자동 저장 실패:', err)
            toast.warning('배정은 완료했지만 매핑 자동 저장에 실패했습니다')
          }
        }

        await fetchAllocations()
        toast.success(`${pendingAllocations.length}건 배정 완료`)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '배정 실패'
        )
        throw err
      }
    },
    [workSessionId, unallocatedOrders, fetchAllocations, resolveSupplierProductName]
  )

  const applySuggested = useCallback(
    async (orderIds: string[]) => {
      try {
        const pendingAllocations: PendingAllocation[] = []
        const mappingItems: Array<{ platform: Platform; productName: string; optionName: string; supplierId: string }> = []

        for (const orderId of orderIds) {
          const sug = suggested.find((s) => s.orderId === orderId)
          if (!sug || sug.candidates.length === 0) continue
          const best = sug.candidates[0]!
          const order = unallocatedOrders.find((o) => o.id === orderId)
          if (!order) continue

          pendingAllocations.push({
            orderId,
            supplierId: best.supplier.id,
            supplierProductName: best.supplierProduct.productName,
            supplierProductCode: best.supplierProduct.productCode || undefined,
            allocatedQuantity: order.quantity,
            isTemporaryOverride: false,
            nameMappingApplied: false,
            smartAllocationApplied: true,
            supplierPrice: best.supplierProduct.price ?? undefined,
            allocationReason: `추천 적용 (score: ${best.score.toFixed(2)})`,
          })

          mappingItems.push({
            platform: order.platform,
            productName: order.productName,
            optionName: order.optionName,
            supplierId: best.supplier.id,
          })
        }

        if (pendingAllocations.length > 0) {
          await createAllocations(workSessionId, pendingAllocations)
        }

        if (mappingItems.length > 0) {
          const seen = new Set<string>()
          const deduped = mappingItems.filter((item) => {
            const key = `${item.platform}::${item.productName}::${item.optionName}::${item.supplierId}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          try {
            await createProductMappingsBulk(deduped)
          } catch (err) {
            console.error('매핑 자동 저장 실패:', err)
            toast.warning('추천 적용은 완료했지만 매핑 자동 저장에 실패했습니다')
          }
        }

        setSuggested((prev) => prev.filter((s) => !orderIds.includes(s.orderId)))
        await fetchAllocations()
        toast.success(`추천 ${pendingAllocations.length}건 적용 완료`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '추천 적용 실패')
        throw err
      }
    },
    [workSessionId, suggested, unallocatedOrders, fetchAllocations]
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
        const resolvedCache = new Map<string, { productName: string; productCode: string | undefined; price: number | undefined }>()
        for (const dist of distributions) {
          if (!nameCache.has(dist.supplierId)) {
            const nr = findNameMapping(platform, productName, optionName, dist.supplierId, nameMappingsAll)
            nameCache.set(dist.supplierId, nr)
            if (!nr.applied) {
              const resolved = await resolveSupplierProductName(
                platform, productName, optionName, dist.supplierId
              )
              if (resolved) {
                resolvedCache.set(dist.supplierId, {
                  productName: resolved.productName,
                  productCode: resolved.productCode || undefined,
                  price: resolved.price ?? undefined,
                })
              }
            }
          }
        }

        let idx = 0
        const newAllocations: PendingAllocation[] = []
        for (const dist of distributions) {
          const nameResult = nameCache.get(dist.supplierId)!
          const resolved = resolvedCache.get(dist.supplierId)
          for (let i = 0; i < dist.count; i++) {
            const oid = orderedIds[idx]
            if (!oid) break
            const existingAlloc = allocs.find((a) => a.orderId === oid)
            newAllocations.push({
              orderId: oid,
              supplierId: dist.supplierId,
              supplierProductName: resolved?.productName ?? nameResult.supplierProductName,
              supplierProductCode: resolved?.productCode ?? nameResult.supplierProductCode,
              allocatedQuantity: existingAlloc?.order.quantity ?? 1,
              isTemporaryOverride: false,
              nameMappingApplied: nameResult.applied,
              smartAllocationApplied: false,
              supplierPrice: resolved?.price,
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
    [workSessionId, allocations, fetchAllocations, resolveSupplierProductName]
  )

  const changeSupplierProduct = useCallback(
    async (
      orderIds: string[],
      supplierProductName: string,
      supplierProductCode?: string,
      supplierPrice?: number
    ) => {
      try {
        await updateGroupSupplierProduct({
          workSessionId,
          orderIds,
          supplierProductName,
          supplierProductCode,
          supplierPrice,
        })
        await fetchAllocations()
        toast.success('발주 상품이 변경되었습니다')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '상품 변경 실패'
        )
        throw err
      }
    },
    [workSessionId, fetchAllocations]
  )

  return {
    allocations,
    unallocatedOrders,
    suggested,
    loading,
    running,
    runAutoAllocation,
    resetAndRerun,
    updateGroupSupplier: handleUpdateGroupSupplier,
    assignUnmatched,
    applySuggested,
    distributeGroup,
    changeSupplierProduct,
    refetch: fetchAllocations,
  }
}
