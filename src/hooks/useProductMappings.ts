import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getProductMappings,
  createProductMapping,
  updateProductMapping,
  deleteProductMapping,
  switchDefaultSupplier,
} from '@/lib/supabase/productMappings'

import type { ProductMappingWithSupplier, ProductMappingFormData } from '@/lib/schemas'

export function useProductMappings() {
  const [mappings, setMappings] = useState<ProductMappingWithSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getProductMappings()
      setMappings(data)
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const data = await getProductMappings()
        if (alive) {
          setMappings(data)
          setError(null)
        }
      } catch (err) {
        if (alive) {
          const message =
            err instanceof Error ? err.message : '오류가 발생했습니다'
          setError(message)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const create = useCallback(
    async (data: ProductMappingFormData) => {
      try {
        await createProductMapping(data)
        toast.success('품목 매핑을 추가했습니다')
        await refetch()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        setError(message)
        toast.error(message)
        throw err
      }
    },
    [refetch]
  )

  const update = useCallback(
    async (id: string, data: ProductMappingFormData) => {
      try {
        await updateProductMapping(id, data)
        toast.success('품목 매핑을 수정했습니다')
        await refetch()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        setError(message)
        toast.error(message)
        throw err
      }
    },
    [refetch]
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteProductMapping(id)
        toast.success('품목 매핑을 삭제했습니다')
        await refetch()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        setError(message)
        toast.error(message)
        throw err
      }
    },
    [refetch]
  )

  const switchDefault = useCallback(
    async (mapping: ProductMappingWithSupplier) => {
      try {
        await switchDefaultSupplier({
          platform: mapping.platform,
          productName: mapping.productName,
          optionName: mapping.optionName,
          newSupplierId: mapping.supplierId,
        })
        toast.success(`기본 공급처를 ${mapping.supplierName}(으)로 변경했습니다`)
        await refetch()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '기본 공급처 변경 실패'
        toast.error(message)
        throw err
      }
    },
    [refetch]
  )

  return { mappings, loading, error, refetch, create, update, remove, switchDefault }
}
