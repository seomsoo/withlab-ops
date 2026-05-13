import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getCourierMappings,
  createCourierMapping,
  updateCourierMapping,
  deleteCourierMapping,
} from '@/lib/supabase/courierMappings'

import type { CourierMapping } from '@/types'
import type { CourierMappingFormData } from '@/lib/schemas'

export function useCourierMappings() {
  const [mappings, setMappings] = useState<CourierMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCourierMappings()
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
        const data = await getCourierMappings()
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
    async (data: CourierMappingFormData) => {
      try {
        await createCourierMapping(data)
        toast.success('택배사 매핑을 추가했습니다')
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
    async (id: string, data: CourierMappingFormData) => {
      try {
        await updateCourierMapping(id, data)
        toast.success('택배사 매핑을 수정했습니다')
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
        await deleteCourierMapping(id)
        toast.success('택배사 매핑을 삭제했습니다')
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
