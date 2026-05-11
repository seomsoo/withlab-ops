import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { getDefaultWorkSessionName } from '@/utils/workSession'

import type { WorkSession } from '@/types'

type CreateWorkSessionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultName?: string
  onCreate: (name: string) => Promise<WorkSession>
  onCreated?: (session: WorkSession) => void
}

export function CreateWorkSessionDialog({
  open,
  onOpenChange,
  defaultName,
  onCreate,
  onCreated,
}: CreateWorkSessionDialogProps) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [prevOpen, setPrevOpen] = useState(false)

  if (open && !prevOpen) {
    setName(defaultName ?? getDefaultWorkSessionName())
  }
  if (open !== prevOpen) {
    setPrevOpen(open)
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      setCreating(true)
      const session = await onCreate(trimmed)
      onOpenChange(false)
      onCreated?.(session)
    } catch {
      // toast handled by caller
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
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
  )
}
