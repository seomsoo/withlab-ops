import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getNameMappings,
  createNameMapping,
  updateNameMapping,
  deleteNameMapping,
} from '@/lib/supabase/nameMappings'

import type { NameMappingWithSupplier, NameMappingFormData } from '@/lib/schemas'

export function useNameMappings() {
  const [mappings, setMappings] = useState<NameMappingWithSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getNameMappings()
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
        const data = await getNameMappings()
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
    async (data: NameMappingFormData) => {
      try {
        await createNameMapping(data)
        toast.success('상품명 변환 매핑을 추가했습니다')
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
    async (id: string, data: NameMappingFormData) => {
      try {
        await updateNameMapping(id, data)
        toast.success('상품명 변환 매핑을 수정했습니다')
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
        await deleteNameMapping(id)
        toast.success('상품명 변환 매핑을 삭제했습니다')
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

  return { mappings, loading, error, refetch, create, update, remove }
}
