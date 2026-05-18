import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, ChevronRight, Zap } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'

import { useWorkSessions } from '@/hooks/useWorkSessions'
import { supabase } from '@/lib/supabase/client'
import { fetchAllPages } from '@/lib/supabase/pagination'

import type { WorkSessionStatus } from '@/types'

type SessionInfo = {
  orderCount: number
  supplierCount: number
  allocationCount: number
  matchedCount: number
  totalTrackings: number
}

async function fetchSessionInfos(
  sessionIds: string[]
): Promise<Map<string, SessionInfo>> {
  if (sessionIds.length === 0) return new Map()

  const [orders, allocs, trackings] = await Promise.all([
    fetchAllPages<{ work_session_id: string }>(async (from, to) => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, work_session_id')
        .in('work_session_id', sessionIds)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: (data ?? []) as { work_session_id: string }[], error }
    }, '주문 세션 정보 조회 실패'),
    fetchAllPages<{ work_session_id: string; supplier_id: string }>(
      async (from, to) => {
        const { data, error } = await supabase
          .from('allocations')
          .select('id, work_session_id, supplier_id')
          .in('work_session_id', sessionIds)
          .order('id', { ascending: true })
          .range(from, to)
        return {
          data: (data ?? []) as {
            work_session_id: string
            supplier_id: string
          }[],
          error,
        }
      },
      '배정 세션 정보 조회 실패'
    ),
    fetchAllPages<{ work_session_id: string; status: string }>(
      async (from, to) => {
        const { data, error } = await supabase
          .from('trackings')
          .select('id, work_session_id, status')
          .in('work_session_id', sessionIds)
          .order('id', { ascending: true })
          .range(from, to)
        return {
          data: (data ?? []) as { work_session_id: string; status: string }[],
          error,
        }
      },
      '운송장 세션 정보 조회 실패'
    ),
  ])

  const map = new Map<string, SessionInfo>()
  for (const id of sessionIds) {
    map.set(id, {
      orderCount: 0,
      supplierCount: 0,
      allocationCount: 0,
      matchedCount: 0,
      totalTrackings: 0,
    })
  }

  for (const o of orders) {
    const info = map.get(o.work_session_id)
    if (info) info.orderCount++
  }

  const supplierSets = new Map<string, Set<string>>()
  for (const a of allocs) {
    const sid = a.work_session_id
    if (!supplierSets.has(sid)) supplierSets.set(sid, new Set())
    supplierSets.get(sid)!.add(a.supplier_id)
    const info = map.get(sid)
    if (info) info.allocationCount++
  }
  for (const [sid, set] of supplierSets) {
    const info = map.get(sid)
    if (info) info.supplierCount = set.size
  }

  for (const t of trackings) {
    const info = map.get(t.work_session_id)
    if (info) {
      info.totalTrackings++
      if (t.status === 'matched') info.matchedCount++
    }
  }

  return map
}

const STATUS_DISPLAY: Record<
  WorkSessionStatus,
  { label: string; variant: 'info' | 'success' | 'muted' }
> = {
  active: { label: '진행중', variant: 'info' },
  ordered: { label: '발주완료', variant: 'success' },
  completed: { label: '완료', variant: 'muted' },
}

function isClickable(
  status: WorkSessionStatus,
  allocationCount: number
): boolean {
  if (status === 'active') return allocationCount > 0
  return status === 'ordered' || status === 'completed'
}

export default function TrackingSessionSelector() {
  const navigate = useNavigate()
  const { sessions, loading } = useWorkSessions()
  const [infos, setInfos] = useState<Map<string, SessionInfo>>(new Map())

  const filteredSessions = sessions.filter(
    (s) =>
      s.status === 'ordered' ||
      s.status === 'completed' ||
      s.status === 'active'
  )

  useEffect(() => {
    if (filteredSessions.length > 0) {
      void fetchSessionInfos(filteredSessions.map((s) => s.id)).then(setInfos)
    }
  }, [sessions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <>
        <PageHeader title="운송장" />
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="운송장"
        actions={
          <Button onClick={() => navigate('/tracking/simple')}>
            <Zap size={16} />
            간편 운송장
          </Button>
        }
      />

      {filteredSessions.length === 0 ? (
        <EmptyState
          icon={<Truck size={32} />}
          title="운송장 처리 가능한 작업건이 없습니다"
          description="주문을 업로드하고 배정한 작업건에서 운송장 매칭을 진행할 수 있습니다"
        />
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((s) => {
            const display = STATUS_DISPLAY[s.status]
            const allocCount = infos.get(s.id)?.allocationCount ?? 0
            const clickable = isClickable(s.status, allocCount)
            return (
              <button
                key={s.id}
                className={`flex w-full items-center gap-4 rounded-radius-md border border-line bg-card px-5 py-4 text-left shadow-level-1 transition-colors ${
                  clickable
                    ? 'hover:bg-gray-50 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                disabled={!clickable}
                onClick={() => {
                  if (clickable) {
                    navigate(`/tracking/${s.id}/upload`)
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[15px] font-bold text-t-strong truncate"
                      title={s.name}
                    >
                      {s.name}
                    </span>
                    <StatusBadge variant={display.variant}>
                      {display.label}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-t-mute">
                    {!clickable && s.status === 'active' ? (
                      <span>공급처 배정을 먼저 완료해 주세요</span>
                    ) : (
                      <>
                        <span>
                          {new Date(s.createdAt).toLocaleString('ko-KR')}
                        </span>
                        {infos.has(s.id) && (
                          <>
                            <span>·</span>
                            <span>주문 {infos.get(s.id)!.orderCount}건</span>
                            <span>·</span>
                            <span>
                              공급처 {infos.get(s.id)!.supplierCount}곳
                            </span>
                            {infos.get(s.id)!.totalTrackings > 0 && (
                              <>
                                <span>·</span>
                                <span>
                                  운송장 {infos.get(s.id)!.matchedCount}/
                                  {infos.get(s.id)!.totalTrackings}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {clickable && (
                  <ChevronRight
                    size={16}
                    className="text-t-faint flex-shrink-0"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
