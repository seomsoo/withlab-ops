import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useCourierMappings } from '@/hooks/useCourierMappings'
import { useSuppliers } from '@/hooks/useSuppliers'
import { courierMappingFormSchema } from '@/lib/schemas'

import type { CourierMappingWithSupplier, CourierMappingFormData } from '@/lib/schemas'

const EMPTY_FORM: CourierMappingFormData = {
  sourceSupplierId: '',
  sourceName: '',
  coupangName: '',
  tossName: '',
}

export default function CourierMapping() {
  const { mappings, loading: mappingsLoading, create, update, remove } = useCourierMappings()
  const { suppliers, loading: suppliersLoading } = useSuppliers()

  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CourierMappingWithSupplier | null>(null)
  const [form, setForm] = useState<CourierMappingFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<CourierMappingWithSupplier | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loading = mappingsLoading || suppliersLoading

  const sorted = useMemo(() => {
    return [...mappings].sort((a, b) => {
      const nameComp = a.supplierName.localeCompare(b.supplierName)
      if (nameComp !== 0) return nameComp
      return a.sourceName.localeCompare(b.sourceName)
    })
  }, [mappings])

  const filtered = useMemo(() => {
    return sorted.filter((m) => {
      if (supplierFilter !== 'all' && m.sourceSupplierId !== supplierFilter)
        return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (
          !m.sourceName.toLowerCase().includes(q) &&
          !m.coupangName.toLowerCase().includes(q) &&
          !m.tossName.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [sorted, search, supplierFilter])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(mapping: CourierMappingWithSupplier) {
    setEditing(mapping)
    setForm({
      sourceSupplierId: mapping.sourceSupplierId,
      sourceName: mapping.sourceName,
      coupangName: mapping.coupangName,
      tossName: mapping.tossName,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const result = courierMappingFormSchema.safeParse(form)
    if (!result.success) return
    setSaving(true)
    try {
      if (editing) {
        await update(editing.id, result.data)
      } else {
        await create(result.data)
      }
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    } catch {
      // toast shown by hook
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // toast shown by hook
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="택배사 매핑" />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </>
    )
  }

  const hasData = mappings.length > 0
  const hasResults = filtered.length > 0

  return (
    <>
      <PageHeader
        title="택배사 매핑"
        description="공급처 운송장의 택배사명을 플랫폼 정식 명칭으로 변환합니다. 운송장 출력 시 자동 적용됩니다."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            매핑 추가
          </Button>
        }
      />

      {!hasData ? (
        <EmptyState
          title="등록된 매핑이 없습니다"
          description="택배사 매핑을 추가하면 운송장 출력 시 플랫폼 정식 명칭으로 자동 변환됩니다."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              매핑 추가
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <div className="relative w-[280px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-t-mute"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="택배사명 검색"
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-t-mute hover:text-t-strong"
                  onClick={() => setSearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 공급처</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!hasResults ? (
            <EmptyState
              title="검색 조건에 맞는 결과가 없습니다"
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('')
                    setSupplierFilter('all')
                  }}
                >
                  필터 초기화
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-radius-lg border border-line bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      공급처
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      원본 택배사명
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      쿠팡 택배사명
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      토스 택배사명
                    </TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{m.supplierName}</span>
                          {!m.supplierIsActive && (
                            <span className="inline-flex items-center rounded-[6px] bg-gray-200 px-2 py-[3px] text-[11px] font-semibold leading-snug text-t-mute">
                              비활성
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-block rounded-md bg-gray-100 px-2.5 py-1 text-[13px] font-semibold text-t-strong">
                          {m.sourceName}
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px]">
                        {m.coupangName}
                      </TableCell>
                      <TableCell className="text-[13px]">
                        {m.tossName}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md text-t-mute hover:bg-gray-200 hover:text-t-strong"
                            onClick={() => openEdit(m)}
                            aria-label="수정"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md text-t-mute hover:bg-error-light hover:text-error"
                            onClick={() => setDeleteTarget(m)}
                            aria-label="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* 추가/수정 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? '택배사 매핑 수정' : '택배사 매핑 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>
                공급처 <span className="text-error">*</span>
              </Label>
              <Select
                value={form.sourceSupplierId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, sourceSupplierId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="공급처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                  {editing && !editing.supplierIsActive && (
                    <SelectItem value={editing.sourceSupplierId}>
                      {editing.supplierName} (비활성)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                원본 택배사명 <span className="text-error">*</span>
              </Label>
              <Input
                value={form.sourceName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sourceName: e.target.value }))
                }
                placeholder="예: 대한통운, CJ, 한진"
              />
              <p className="text-[11.5px] text-t-mute">
                공급처 운송장에 적히는 택배사명을 그대로 입력하세요
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                쿠팡 택배사명 <span className="text-error">*</span>
              </Label>
              <Input
                value={form.coupangName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, coupangName: e.target.value }))
                }
                placeholder="예: CJ대한통운"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                토스 택배사명 <span className="text-error">*</span>
              </Label>
              <Input
                value={form.tossName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tossName: e.target.value }))
                }
                placeholder="예: CJ대한통운"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.sourceSupplierId ||
                !form.sourceName.trim() ||
                !form.coupangName.trim() ||
                !form.tossName.trim()
              }
            >
              {saving ? '저장 중...' : editing ? '수정 저장' : '매핑 추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="매핑 삭제"
        description="이 택배사 매핑을 삭제하시겠습니까?"
        confirmText="삭제"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
    </>
  )
}
