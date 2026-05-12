import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, ChevronRight } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

import { useWorkSessions } from '@/hooks/useWorkSessions'
import { supabase } from '@/lib/supabase/client'

import type { WorkSessionStatus } from '@/types'

type SessionInfo = {
  orderCount: number
  supplierCount: number
  matchedCount: number
  totalTrackings: number
}

async function fetchSessionInfos(
  sessionIds: string[]
): Promise<Map<string, SessionInfo>> {
  if (sessionIds.length === 0) return new Map()

  const [orders, allocs, trackings] = await Promise.all([
    supabase.from('orders').select('work_session_id').in('work_session_id', sessionIds),
    supabase.from('allocations').select('work_session_id, supplier_id').in('work_session_id', sessionIds),
    supabase.from('trackings').select('work_session_id, status').in('work_session_id', sessionIds),
  ])

  const map = new Map<string, SessionInfo>()
  for (const id of sessionIds) {
    map.set(id, { orderCount: 0, supplierCount: 0, matchedCount: 0, totalTrackings: 0 })
  }

  for (const o of orders.data ?? []) {
    const info = map.get(o.work_session_id as string)
    if (info) info.orderCount++
  }

  const supplierSets = new Map<string, Set<string>>()
  for (const a of allocs.data ?? []) {
    const sid = a.work_session_id as string
    if (!supplierSets.has(sid)) supplierSets.set(sid, new Set())
    supplierSets.get(sid)!.add(a.supplier_id as string)
  }
  for (const [sid, set] of supplierSets) {
    const info = map.get(sid)
    if (info) info.supplierCount = set.size
  }

  for (const t of trackings.data ?? []) {
    const info = map.get(t.work_session_id as string)
    if (info) {
      info.totalTrackings++
      if (t.status === 'matched') info.matchedCount++
    }
  }

  return map
}

const STATUS_CONFIG: Record<
  WorkSessionStatus,
  { label: string; variant: 'info' | 'success' | 'muted'; clickable: boolean }
> = {
  active: { label: '진행중', variant: 'info', clickable: false },
  ordered: { label: '발주완료', variant: 'success', clickable: true },
  completed: { label: '완료', variant: 'muted', clickable: true },
}

export default function TrackingSessionSelector() {
  const navigate = useNavigate()
  const { sessions, loading } = useWorkSessions()
  const [infos, setInfos] = useState<Map<string, SessionInfo>>(new Map())

  const filteredSessions = sessions.filter(
    (s) => s.status === 'ordered' || s.status === 'completed' || s.status === 'active'
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
      <PageHeader title="운송장" />

      {filteredSessions.length === 0 ? (
        <EmptyState
          icon={<Truck size={32} />}
          title="운송장 처리 가능한 작업건이 없습니다"
          description="발주를 완료한 작업건에서 운송장 매칭을 진행할 수 있습니다"
        />
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((s) => {
            const config = STATUS_CONFIG[s.status]
            return (
              <button
                key={s.id}
                className={`flex w-full items-center gap-4 rounded-radius-md border border-line bg-card px-5 py-4 text-left shadow-level-1 transition-colors ${
                  config.clickable
                    ? 'hover:bg-gray-50 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                disabled={!config.clickable}
                onClick={() => {
                  if (config.clickable) {
                    navigate(`/tracking/${s.id}/upload`)
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-t-strong truncate" title={s.name}>
                      {s.name}
                    </span>
                    <StatusBadge variant={config.variant}>
                      {config.label}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-t-mute">
                    {!config.clickable && s.status === 'active' ? (
                      <span>발주를 먼저 완료해 주세요</span>
                    ) : (
                      <>
                        <span>{new Date(s.createdAt).toLocaleString('ko-KR')}</span>
                        {infos.has(s.id) && (
                          <>
                            <span>·</span>
                            <span>주문 {infos.get(s.id)!.orderCount}건</span>
                            <span>·</span>
                            <span>공급처 {infos.get(s.id)!.supplierCount}곳</span>
                            {infos.get(s.id)!.totalTrackings > 0 && (
                              <>
                                <span>·</span>
                                <span>
                                  운송장 {infos.get(s.id)!.matchedCount}/{infos.get(s.id)!.totalTrackings}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {config.clickable && (
                  <ChevronRight size={16} className="text-t-faint flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
