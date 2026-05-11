import { useState, useCallback } from 'react'
import { toast } from 'sonner'

import { getSupplierProducts } from '@/lib/supabase/supplierProducts'
import { suggestMatches } from '@/lib/matching/productMatcher'

import type { SupplierProduct, Platform } from '@/types'
import type { MatchSuggestion } from '@/lib/matching/productMatcher'

export type BulkSuggestion = {
  platformProductName: string
  platformOptionName: string
  platform: Platform | 'common'
  supplierId: string
  topMatch: MatchSuggestion | null
}

export function useMatchSuggestions() {
  const [loading, setLoading] = useState(false)

  const getSuggestions = useCallback(
    async (
      supplierId: string,
      platformProductName: string,
      platformOptionName: string
    ): Promise<MatchSuggestion[]> => {
      try {
        setLoading(true)
        const products = await getSupplierProducts(supplierId)
        return suggestMatches(
          platformProductName,
          platformOptionName,
          products
        )
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '매칭 제안 조회 실패'
        )
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const suggestAll = useCallback(
    async (
      items: {
        platformProductName: string
        platformOptionName: string
        platform: Platform | 'common'
        supplierId: string
      }[],
      allProducts?: SupplierProduct[]
    ): Promise<BulkSuggestion[]> => {
      try {
        setLoading(true)

        let productsMap: Map<string, SupplierProduct[]>
        if (allProducts) {
          productsMap = new Map<string, SupplierProduct[]>()
          for (const p of allProducts) {
            const list = productsMap.get(p.supplierId) ?? []
            list.push(p)
            productsMap.set(p.supplierId, list)
          }
        } else {
          const supplierIds = [...new Set(items.map((i) => i.supplierId))]
          const fetched = await Promise.all(
            supplierIds.map(async (sid) => ({
              sid,
              products: await getSupplierProducts(sid),
            }))
          )
          productsMap = new Map(fetched.map((f) => [f.sid, f.products]))
        }

        return items.map((item) => {
          const products = productsMap.get(item.supplierId) ?? []
          const matches = suggestMatches(
            item.platformProductName,
            item.platformOptionName,
            products
          )
          return {
            platformProductName: item.platformProductName,
            platformOptionName: item.platformOptionName,
            platform: item.platform,
            supplierId: item.supplierId,
            topMatch: matches[0] ?? null,
          }
        })
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '일괄 매칭 제안 조회 실패'
        )
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    getSuggestions,
    suggestAll,
  }
}
