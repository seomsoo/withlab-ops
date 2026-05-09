import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getSuppliers,
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/lib/supabase/suppliers'

import type { Supplier } from '@/types'
import type { SupplierFormData } from '@/lib/schemas'

export function useSuppliers(includeInactive = false) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = includeInactive
        ? await getAllSuppliers()
        : await getSuppliers()
      setSuppliers(data)
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [includeInactive])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const data = includeInactive
          ? await getAllSuppliers()
          : await getSuppliers()
        if (alive) {
          setSuppliers(data)
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
  }, [includeInactive])

  const create = useCallback(
    async (data: SupplierFormData) => {
      try {
        await createSupplier(data)
        toast.success('공급처를 추가했습니다')
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
    async (id: string, data: SupplierFormData) => {
      try {
        await updateSupplier(id, data)
        toast.success('공급처를 수정했습니다')
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
        await deleteSupplier(id)
        toast.success('공급처를 비활성화했습니다')
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

  return { suppliers, loading, error, refetch, create, update, remove }
}
