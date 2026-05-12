import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, ChevronRight, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  const { sessions, loading, createSession, removeSession } = useWorkSessions()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

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
              <div
                key={s.id}
                className="flex w-full items-center gap-4 rounded-radius-md border border-line bg-card px-5 py-4 shadow-level-1 transition-colors hover:bg-gray-50 dark:hover:bg-[var(--color-surface-hover)]"
              >
                <button
                  className="flex flex-1 items-center gap-4 min-w-0 text-left"
                  onClick={() => navigate(`/orders/${s.id}/upload`)}
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
                    <div className="mt-1 text-xs text-t-mute">
                      생성: {new Date(s.createdAt).toLocaleString('ko-KR')}
                      {s.completedAt &&
                        ` · 완료: ${new Date(s.completedAt).toLocaleString('ko-KR')}`}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-t-faint flex-shrink-0" />
                </button>
                <button
                  className="flex-shrink-0 rounded-md p-1.5 text-t-mute transition-colors hover:bg-red-50 hover:text-status-error"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget({ id: s.id, name: s.name })
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
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

      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>작업건 삭제</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-t-secondary">
              <span className="font-semibold text-t-strong">
                {deleteTarget.name}
              </span>
              을(를) 삭제하면 업로드된 주문, 배정, 운송장 데이터가 모두
              삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={async () => {
                  try {
                    setDeleting(true)
                    await removeSession(deleteTarget.id)
                    setDeleteTarget(null)
                  } catch {
                    // toast handled in hook
                  } finally {
                    setDeleting(false)
                  }
                }}
              >
                {deleting ? '삭제중...' : '삭제'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
