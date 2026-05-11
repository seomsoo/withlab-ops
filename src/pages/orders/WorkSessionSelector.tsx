import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, ChevronRight } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CreateWorkSessionDialog } from '@/components/work-session/CreateWorkSessionDialog'

import { useWorkSessions } from '@/hooks/useWorkSessions'

import type { WorkSessionStatus } from '@/types'

const STATUS_CONFIG: Record<
  WorkSessionStatus,
  { label: string; variant: 'info' | 'success' | 'muted' }
> = {
  active: { label: '진행중', variant: 'info' },
  ordered: { label: '발주완료', variant: 'success' },
  completed: { label: '완료', variant: 'muted' },
}

export default function WorkSessionSelector() {
  const navigate = useNavigate()
  const { sessions, loading, createSession } = useWorkSessions()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (loading) {
    return (
      <>
        <PageHeader title="발주서" />
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="발주서"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} />
            새 작업건
          </Button>
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="작업건이 없습니다"
          description="새 작업건을 만들어 주문 업로드를 시작하세요"
        />
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const config = STATUS_CONFIG[s.status]
            return (
              <button
                key={s.id}
                className="flex w-full items-center gap-4 rounded-radius-md border border-line bg-card px-5 py-4 text-left shadow-level-1 transition-colors hover:bg-gray-50 dark:hover:bg-[var(--color-surface-hover)]"
                onClick={() => navigate(`/orders/${s.id}/upload`)}
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
                    생성: {new Date(s.createdAt).toLocaleString('ko-KR')}
                    {s.completedAt &&
                      ` · 완료: ${new Date(s.completedAt).toLocaleString('ko-KR')}`}
                  </div>
                </div>
                <ChevronRight size={16} className="text-t-faint flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      <CreateWorkSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={createSession}
        onCreated={(session) => navigate(`/orders/${session.id}/upload`)}
      />
    </>
  )
}
