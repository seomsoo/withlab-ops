import { useState, useCallback, useEffect } from 'react'

import {
  getRecentWorkSessions,
  getDashboardStats,
} from '@/lib/supabase/dashboard'

import type {
  DashboardWorkSession,
  DashboardStats,
} from '@/lib/supabase/dashboard'

export function useDashboard() {
  const [recentSessions, setRecentSessions] = useState<DashboardWorkSession[]>(
    []
  )
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [sessions, dashStats] = await Promise.all([
        getRecentWorkSessions(5),
        getDashboardStats(),
      ])
      setRecentSessions(sessions)
      setStats(dashStats)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '대시보드 데이터를 불러올 수 없습니다'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        setError(null)
        const [sessions, dashStats] = await Promise.all([
          getRecentWorkSessions(5),
          getDashboardStats(),
        ])
        if (alive) {
          setRecentSessions(sessions)
          setStats(dashStats)
        }
      } catch (err) {
        if (alive) {
          setError(
            err instanceof Error
              ? err.message
              : '대시보드 데이터를 불러올 수 없습니다'
          )
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return { recentSessions, stats, loading, error, refetch }
}
