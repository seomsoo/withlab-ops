import { useState, useCallback, useEffect } from 'react'

import { getWorkSession } from '@/lib/supabase/workSessions'

import type { WorkSession } from '@/types'

export function useWorkSession(sessionId: string | undefined) {
  const [session, setSession] = useState<WorkSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!sessionId) {
      setSession(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await getWorkSession(sessionId)
      setSession(data)
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '오류가 발생했습니다'
      setError(message)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return

    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const data = await getWorkSession(sessionId)
        if (alive) {
          setSession(data)
          setError(null)
        }
      } catch (err) {
        if (alive) {
          const message =
            err instanceof Error ? err.message : '오류가 발생했습니다'
          setError(message)
          setSession(null)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [sessionId])

  return { session, loading, error, refetch }
}
