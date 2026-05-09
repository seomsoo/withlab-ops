import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, ChevronRight } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

function generateDefaultName(): string {
  const now = new Date()
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const y = kst.getFullYear()
  const m = String(kst.getMonth() + 1).padStart(2, '0')
  const d = String(kst.getDate()).padStart(2, '0')
  const period = kst.getHours() < 12 ? '오전' : '오후'
  return `${y}-${m}-${d} ${period}`
}

export default function WorkSessionSelector() {
  const navigate = useNavigate()
  const { sessions, loading, createSession } = useWorkSessions()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleOpenDialog = () => {
    setName(generateDefaultName())
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      setCreating(true)
      const session = await createSession(trimmed)
      setDialogOpen(false)
      navigate(`/orders/${session.id}/upload`)
    } catch {
      // toast handled by hook
    } finally {
      setCreating(false)
    }
  }

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
          <Button onClick={handleOpenDialog}>
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
                className="flex w-full items-center gap-4 rounded-radius-md border border-line bg-white px-5 py-4 text-left shadow-level-1 transition-colors hover:bg-gray-50"
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>새 작업건 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="session-name">작업건 이름</Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate()
              }}
              placeholder="예: 2026-05-10 오전"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={creating}
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || name.trim() === ''}
            >
              {creating && <LoadingSpinner size="sm" />}
              만들기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
