import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getWorkSessions,
  createWorkSession,
  deleteWorkSession,
} from '@/lib/supabase/workSessions'

import type { WorkSession } from '@/types'

export function useWorkSessions() {
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [loading, setLoading] = useState(true)

  const refreshSessions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getWorkSessions()
      setSessions(data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '오류가 발생했습니다'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const data = await getWorkSessions()
        if (alive) setSessions(data)
      } catch (err) {
        if (alive) {
          const message =
            err instanceof Error ? err.message : '오류가 발생했습니다'
          toast.error(message)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const createSession = useCallback(
    async (name: string): Promise<WorkSession> => {
      try {
        const session = await createWorkSession(name)
        toast.success('작업건을 생성했습니다')
        await refreshSessions()
        return session
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
        throw err
      }
    },
    [refreshSessions]
  )

  const removeSession = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteWorkSession(id)
        toast.success('작업건이 삭제되었습니다')
        await refreshSessions()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '삭제에 실패했습니다'
        toast.error(message)
        throw err
      }
    },
    [refreshSessions]
  )

  return { sessions, loading, createSession, removeSession, refreshSessions }
}
