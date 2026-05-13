import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import { getOrders } from '@/lib/supabase/orders'
import { getAllSuppliers } from '@/lib/supabase/suppliers'
import { getProductMappings } from '@/lib/supabase/productMappings'
import { getAllSupplierProducts } from '@/lib/supabase/supplierProducts'
import { getFruitDictionaries } from '@/lib/supabase/fruitDictionary'
import {
  getYesterdayAllocations,
  getAllocationFrequency,
} from '@/lib/supabase/allocationHistory'
import { buildItemSummaries, extractSimpleKeyword } from '@/lib/allocation/itemSummary'
import { extractAttributes } from '@/lib/matching/attributeExtractor'

import type {
  Supplier,
  ItemSummary,
  SupplierRecommendation,
  FruitDictionary,
  ProductMapping,
  SupplierProduct,
} from '@/types'
import type {
  HistoryEntry,
  FrequencyEntry,
} from '@/lib/supabase/allocationHistory'

export function useItemReview(workSessionId: string) {
  const [items, setItems] = useState<ItemSummary[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [
        orders,
        allSuppliers,
        productMappings,
        supplierProducts,
        fruitDictionary,
        yesterdayMap,
        frequencyMap,
      ] = await Promise.all([
        getOrders(workSessionId),
        getAllSuppliers(),
        getProductMappings(),
        getAllSupplierProducts(),
        getFruitDictionaries(),
        getYesterdayAllocations(workSessionId),
        getAllocationFrequency(),
      ])

      setSuppliers(allSuppliers.filter((s) => s.isActive))

      // 품목 검토는 UI 그룹핑 용도이므로 비활성 사전도 포함
      const allActiveDictionary = fruitDictionary.map((d) =>
        d.isActive ? d : { ...d, isActive: true }
      )

      const summaries = buildItemSummaries(orders, fruitDictionary)

      const enriched = summaries.map((summary) =>
        enrichRecommendations(
          summary,
          allSuppliers,
          productMappings,
          supplierProducts,
          allActiveDictionary,
          yesterdayMap,
          frequencyMap
        )
      )

      setItems(enriched)
    } catch (err) {
      console.error('품목 검토 로딩 실패:', err)
      toast.error(err instanceof Error ? err.message : '품목 검토 로딩 실패')
    } finally {
      setLoading(false)
    }
  }, [workSessionId])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const [
          orders,
          allSuppliers,
          productMappings,
          supplierProducts,
          fruitDictionary,
          yesterdayMap,
          frequencyMap,
        ] = await Promise.all([
          getOrders(workSessionId),
          getAllSuppliers(),
          getProductMappings(),
          getAllSupplierProducts(),
          getFruitDictionaries(),
          getYesterdayAllocations(workSessionId),
          getAllocationFrequency(),
        ])
        if (!alive) return

        setSuppliers(allSuppliers.filter((s) => s.isActive))

        const allActiveDictionary = fruitDictionary.map((d) =>
          d.isActive ? d : { ...d, isActive: true }
        )

        const summaries = buildItemSummaries(orders, fruitDictionary)

        const enriched = summaries.map((summary) =>
          enrichRecommendations(
            summary,
            allSuppliers,
            productMappings,
            supplierProducts,
            allActiveDictionary,
            yesterdayMap,
            frequencyMap
          )
        )

        setItems(enriched)
      } catch (err) {
        if (alive) {
          console.error('품목 검토 로딩 실패:', err)
          toast.error(
            err instanceof Error ? err.message : '품목 검토 로딩 실패'
          )
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [workSessionId])

  const selectSupplier = useCallback(
    (keyword: string, supplierId: string | null) => {
      setItems((prev) =>
        prev.map((item) =>
          item.keyword === keyword
            ? { ...item, selectedSupplierId: supplierId, saveAsDefault: false }
            : item
        )
      )
    },
    []
  )

  const toggleSaveAsDefault = useCallback(
    (keyword: string, save: boolean) => {
      setItems((prev) =>
        prev.map((item) =>
          item.keyword === keyword ? { ...item, saveAsDefault: save } : item
        )
      )
    },
    []
  )

  const getKeywordOverrides = useCallback((): Map<string, string> => {
    const overrides = new Map<string, string>()
    for (const item of items) {
      if (item.selectedSupplierId) {
        overrides.set(item.keyword, item.selectedSupplierId)
      }
    }
    return overrides
  }, [items])

  const getDefaultSaveTargets = useCallback((): Array<{
    keyword: string
    supplierId: string
  }> => {
    return items
      .filter((item) => item.saveAsDefault && item.selectedSupplierId)
      .map((item) => ({
        keyword: item.keyword,
        supplierId: item.selectedSupplierId!,
      }))
  }, [items])

  return {
    items,
    suppliers,
    loading,
    selectSupplier,
    toggleSaveAsDefault,
    getKeywordOverrides,
    getDefaultSaveTargets,
    refetch: load,
  }
}

function enrichRecommendations(
  summary: ItemSummary,
  allSuppliers: Supplier[],
  productMappings: ProductMapping[],
  supplierProducts: SupplierProduct[],
  fruitDictionary: FruitDictionary[],
  yesterdayMap: Map<string, HistoryEntry>,
  frequencyMap: Map<string, FrequencyEntry[]>
): ItemSummary {
  const recommendations: SupplierRecommendation[] = []
  const seen = new Set<string>()

  const defaultMapping = productMappings.find((m) => {
    if (!m.isDefault) return false
    const attrs = extractAttributes(m.productName, m.optionName, fruitDictionary)
    return attrs.fruit === summary.keyword || m.productName === summary.keyword || extractSimpleKeyword(m.productName) === summary.keyword
  })

  if (defaultMapping) {
    const supplier = allSuppliers.find((s) => s.id === defaultMapping.supplierId)
    if (supplier && supplier.isActive) {
      recommendations.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        reason: 'default',
      })
      seen.add(supplier.id)
    }
  }

  for (const [productName, entry] of yesterdayMap) {
    const attrs = extractAttributes(productName, '', fruitDictionary)
    if ((attrs.fruit === summary.keyword || productName === summary.keyword || extractSimpleKeyword(productName) === summary.keyword) && !seen.has(entry.supplierId)) {
      const supplier = allSuppliers.find((s) => s.id === entry.supplierId)
      if (supplier && supplier.isActive) {
        recommendations.push({
          supplierId: entry.supplierId,
          supplierName: entry.supplierName,
          reason: 'yesterday',
        })
        seen.add(entry.supplierId)
        break
      }
    }
  }

  for (const [productName, entries] of frequencyMap) {
    const attrs = extractAttributes(productName, '', fruitDictionary)
    if (attrs.fruit === summary.keyword || productName === summary.keyword || extractSimpleKeyword(productName) === summary.keyword) {
      for (const entry of entries) {
        if (!seen.has(entry.supplierId)) {
          const supplier = allSuppliers.find((s) => s.id === entry.supplierId)
          if (supplier && supplier.isActive) {
            recommendations.push({
              supplierId: entry.supplierId,
              supplierName: entry.supplierName,
              reason: 'frequency',
              detail: `${entry.count}회 사용`,
            })
            seen.add(entry.supplierId)
            break
          }
        }
      }
    }
  }

  const matchingProducts = supplierProducts.filter((sp) => {
    const attrs = extractAttributes(sp.productName, '', fruitDictionary)
    return (attrs.fruit === summary.keyword || extractSimpleKeyword(sp.productName) === summary.keyword) && sp.price != null && sp.stockStatus !== 'soldout'
  })

  if (matchingProducts.length > 0) {
    matchingProducts.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    const cheapest = matchingProducts[0]!
    if (!seen.has(cheapest.supplierId)) {
      const supplier = allSuppliers.find((s) => s.id === cheapest.supplierId)
      if (supplier && supplier.isActive) {
        recommendations.push({
          supplierId: cheapest.supplierId,
          supplierName: supplier.name,
          reason: 'lowest_price',
          detail: `₩${cheapest.price!.toLocaleString('ko-KR')}`,
        })
        seen.add(cheapest.supplierId)
      }
    }
  }

  return {
    ...summary,
    recommendations,
    selectedSupplierId: null,
  }
}
