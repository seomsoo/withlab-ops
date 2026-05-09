import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PlatformBadge } from '@/components/PlatformBadge'
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

import { useNameMappings } from '@/hooks/useNameMappings'
import { useSuppliers } from '@/hooks/useSuppliers'
import { nameMappingFormSchema } from '@/lib/schemas'

import type { NameMappingWithSupplier, NameMappingFormData } from '@/lib/schemas'

const EMPTY_FORM: NameMappingFormData = {
  platform: 'coupang',
  platformProductName: '',
  platformOptionName: '',
  supplierId: '',
  supplierProductName: '',
  supplierProductCode: '',
}

export default function NameMapping() {
  const { mappings, loading: mappingsLoading, create, update, remove } = useNameMappings()
  const { suppliers, loading: suppliersLoading } = useSuppliers()

  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<NameMappingWithSupplier | null>(null)
  const [form, setForm] = useState<NameMappingFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<NameMappingWithSupplier | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loading = mappingsLoading || suppliersLoading

  const filtered = useMemo(() => {
    return mappings
      .filter((m) => {
        if (supplierFilter !== 'all' && m.supplierId !== supplierFilter) return false
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          if (
            !m.platformProductName.toLowerCase().includes(q) &&
            !m.supplierProductName.toLowerCase().includes(q)
          )
            return false
        }
        return true
      })
      .sort((a, b) => {
        let c = a.platform.localeCompare(b.platform)
        if (c !== 0) return c
        c = a.platformProductName.localeCompare(b.platformProductName)
        if (c !== 0) return c
        c = a.platformOptionName.localeCompare(b.platformOptionName)
        if (c !== 0) return c
        return a.supplierName.localeCompare(b.supplierName)
      })
  }, [mappings, search, supplierFilter])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(mapping: NameMappingWithSupplier) {
    setEditing(mapping)
    setForm({
      platform: mapping.platform,
      platformProductName: mapping.platformProductName,
      platformOptionName: mapping.platformOptionName,
      supplierId: mapping.supplierId,
      supplierProductName: mapping.supplierProductName,
      supplierProductCode: mapping.supplierProductCode ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    const result = nameMappingFormSchema.safeParse(form)
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
        <PageHeader title="상품명 변환 매핑" />
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
        title="상품명 변환 매핑"
        description="플랫폼 상품명을 공급처가 사용하는 상품명·코드로 변환합니다. 발주서 출력 시 자동 적용됩니다."
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
          description="상품명 변환 매핑을 추가하면 발주서에 공급처 상품명이 자동으로 출력됩니다."
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
            <div className="relative w-[300px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-t-mute"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="플랫폼 상품명, 공급처 상품명 검색"
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
                    <TableHead className="w-[70px] text-xs font-semibold tracking-wider text-t-mute">
                      플랫폼
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      플랫폼 상품명
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      옵션
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      공급처
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      공급처 상품명
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      코드
                    </TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <PlatformBadge platform={m.platform} />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {m.platformProductName}
                      </TableCell>
                      <TableCell className="text-[13px] text-t-mid">
                        {m.platformOptionName || (
                          <span className="text-t-mute">—</span>
                        )}
                      </TableCell>
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
                      <TableCell className="font-medium text-primary">
                        {m.supplierProductName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-t-mid">
                        {m.supplierProductCode || (
                          <span className="text-t-mute">—</span>
                        )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? '변환 매핑 수정' : '변환 매핑 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>플랫폼</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['common', 'coupang', 'toss'] as const).map((p) => (
                  <button
                    key={p}
                    className={`rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                      form.platform === p
                        ? 'border-primary/30 bg-primary-50 text-primary'
                        : 'border-line text-t-mid hover:bg-gray-50'
                    }`}
                    onClick={() => setForm((f) => ({ ...f, platform: p }))}
                    type="button"
                  >
                    {p === 'common' ? '공통' : p === 'coupang' ? '쿠팡' : '토스'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                플랫폼 상품명 <span className="text-error">*</span>
              </Label>
              <Input
                value={form.platformProductName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, platformProductName: e.target.value }))
                }
                placeholder="예: 산지직송 성주 꿀참외"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>플랫폼 옵션명</Label>
              <Input
                value={form.platformOptionName ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, platformOptionName: e.target.value }))
                }
                placeholder="예: 1박스 특가혼합과 5kg"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                공급처 <span className="text-error">*</span>
              </Label>
              <Select
                value={form.supplierId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, supplierId: v }))
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
                    <SelectItem value={editing.supplierId}>
                      {editing.supplierName} (비활성)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                공급처 상품명 <span className="text-error">*</span>
              </Label>
              <Input
                value={form.supplierProductName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplierProductName: e.target.value }))
                }
                placeholder="예: 정품 참외 중소과 5kg"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>공급처 상품코드</Label>
              <Input
                value={form.supplierProductCode ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplierProductCode: e.target.value }))
                }
                placeholder="예: PIDY82D"
                className="font-mono"
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
                !form.platformProductName.trim() ||
                !form.supplierId ||
                !form.supplierProductName.trim()
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
        description="이 변환 매핑을 삭제하시겠습니까?"
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
