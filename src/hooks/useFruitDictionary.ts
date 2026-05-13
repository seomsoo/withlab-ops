import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getFruitDictionaries,
  createFruitDictionary,
  updateFruitDictionary,
  softDeleteFruitDictionary,
  hardDeleteFruitDictionary,
} from '@/lib/supabase/fruitDictionary'

import type { FruitDictionary, SynonymGroup } from '@/types'

export function useFruitDictionary(activeOnly = true) {
  const [dictionaries, setDictionaries] = useState<FruitDictionary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getFruitDictionaries(activeOnly)
      setDictionaries(data)
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [activeOnly])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const data = await getFruitDictionaries(activeOnly)
        if (alive) {
          setDictionaries(data)
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
  }, [activeOnly])

  const create = useCallback(
    async (input: Omit<FruitDictionary, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const created = await createFruitDictionary(input)
        setDictionaries((prev) => [...prev, created])
        toast.success('과일 사전을 추가했습니다')
        return created
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
        throw err
      }
    },
    []
  )

  const update = useCallback(
    async (
      id: string,
      input: {
        category?: string
        keywords?: string[]
        gradeSynonyms?: SynonymGroup[]
        sizeSynonyms?: SynonymGroup[]
        weightAliases?: Record<string, string[]>
        weightMapping?: Record<string, string>
        isActive?: boolean
      }
    ) => {
      try {
        const updated = await updateFruitDictionary(id, input)
        setDictionaries((prev) =>
          prev.map((d) => (d.id === id ? updated : d))
        )
        toast.success('과일 사전을 수정했습니다')
        return updated
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
        throw err
      }
    },
    []
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await softDeleteFruitDictionary(id)
        setDictionaries((prev) => prev.filter((d) => d.id !== id))
        toast.success('과일 사전을 삭제했습니다')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
        throw err
      }
    },
    []
  )

  const hardRemove = useCallback(
    async (id: string) => {
      try {
        await hardDeleteFruitDictionary(id)
        setDictionaries((prev) => prev.filter((d) => d.id !== id))
        toast.success('과일 사전을 완전삭제했습니다')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
        throw err
      }
    },
    []
  )

  return { dictionaries, loading, error, refetch, create, update, remove, hardRemove }
}
