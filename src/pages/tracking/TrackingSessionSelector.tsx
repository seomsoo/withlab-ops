import { useNavigate } from 'react-router-dom'
import { Truck, ChevronRight } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

import { useWorkSessions } from '@/hooks/useWorkSessions'

import type { WorkSessionStatus } from '@/types'

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

  const filteredSessions = sessions.filter(
    (s) => s.status === 'ordered' || s.status === 'completed' || s.status === 'active'
  )

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
                    <span className="text-[15px] font-bold text-t-strong truncate">
                      {s.name}
                    </span>
                    <StatusBadge variant={config.variant}>
                      {config.label}
                    </StatusBadge>
                  </div>
                  <div className="mt-1 text-xs text-t-mute">
                    {!config.clickable && s.status === 'active'
                      ? '발주를 먼저 완료해 주세요'
                      : `생성: ${new Date(s.createdAt).toLocaleString('ko-KR')}`}
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
