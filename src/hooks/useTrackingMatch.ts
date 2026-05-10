import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import {
  getTrackings,
  getTrackingStats,
  getTrackingImports,
  updateTrackingMatch,
  overwriteTrackingMatch,
} from '@/lib/supabase/trackings'

import type { Tracking, TrackingStats, TrackingStatus, InvalidRow } from '@/types'

export function useTrackingMatch(workSessionId: string) {
  const [trackings, setTrackings] = useState<Tracking[]>([])
  const [parserInvalidRows, setParserInvalidRows] = useState<InvalidRow[]>([])
  const [stats, setStats] = useState<TrackingStats>({
    total: 0,
    matched: 0,
    unmatched: 0,
    duplicated: 0,
    invalid: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<TrackingStatus | 'all'>('all')

  const fetchData = useCallback(async () => {
    const [trackingData, statsData, imports] = await Promise.all([
      getTrackings(workSessionId),
      getTrackingStats(workSessionId),
      getTrackingImports(workSessionId),
    ])
    setTrackings(trackingData)
    setStats(statsData)
    setParserInvalidRows(imports.flatMap((i) => i.invalidRows ?? []))
  }, [workSessionId])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [trackingData, statsData, imports] = await Promise.all([
          getTrackings(workSessionId),
          getTrackingStats(workSessionId),
          getTrackingImports(workSessionId),
        ])
        if (!alive) return
        setTrackings(trackingData)
        setStats(statsData)
        setParserInvalidRows(imports.flatMap((i) => i.invalidRows ?? []))
      } catch (err) {
        if (!alive) return
        toast.error(err instanceof Error ? err.message : '오류가 발생했습니다')
      } finally {
        if (alive) setIsLoading(false)
      }
    })()
    return () => { alive = false }
  }, [workSessionId])

  const manualMatch = useCallback(
    async (trackingId: string, allocationId: string) => {
      try {
        await updateTrackingMatch(trackingId, allocationId)
        await fetchData()
        toast.success('수동 매칭 완료')
      } catch (err) {
        if (err instanceof Error && err.message.includes('이미 운송장이 연결')) {
          throw err
        }
        toast.error(err instanceof Error ? err.message : '수동 매칭 실패')
        throw err
      }
    },
    [fetchData]
  )

  const overwriteMatch = useCallback(
    async (trackingId: string, allocationId: string) => {
      try {
        await overwriteTrackingMatch(trackingId, allocationId)
        await fetchData()
        toast.success('수동 매칭 완료 (기존 운송장 대체)')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '수동 매칭 실패')
        throw err
      }
    },
    [fetchData]
  )

  const checkExistingMatch = useCallback(
    (allocationId: string): Tracking | undefined => {
      return trackings.find(
        (t) => t.allocationId === allocationId && t.status === 'matched'
      )
    },
    [trackings]
  )

  const filteredTrackings = useMemo(() => {
    if (filter === 'all') return trackings
    return trackings.filter((t) => t.status === filter)
  }, [trackings, filter])

  return {
    trackings,
    parserInvalidRows,
    stats,
    isLoading,
    manualMatch,
    overwriteMatch,
    checkExistingMatch,
    filteredTrackings,
    filter,
    setFilter,
  }
}
