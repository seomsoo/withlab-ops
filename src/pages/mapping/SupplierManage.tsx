import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Pencil, Power, RotateCcw, Search, Trash2, X, Upload } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useSuppliers } from '@/hooks/useSuppliers'
import { useSupplierTemplates } from '@/hooks/useSupplierTemplate'
import { supplierFormSchema } from '@/lib/schemas'
import { getSupplierProductCounts } from '@/lib/supabase/supplierProducts'
import { getSupplierEnrichments } from '@/lib/supabase/mappingStats'

import type { SupplierEnrichment } from '@/lib/supabase/mappingStats'
import {
  getSupplierProductTemplate,
} from '@/lib/supabase/supplierProductTemplates'
import { parseSupplierProducts } from '@/lib/parsers/supplierProductParser'
import { replaceSupplierProducts } from '@/lib/supabase/supplierProducts'
import { updateUploadHistory } from '@/lib/supabase/supplierProductTemplates'
import { validateExcelFile } from '@/utils/file'
import { readExcelFile, sheetToRows } from '@/utils/excel'

import type { Supplier } from '@/types'
import type { SupplierFormData } from '@/lib/schemas'

const EMPTY_FORM: SupplierFormData = { name: '', contact: '', memo: '' }

export default function SupplierManage() {
  const { suppliers, loading, create, update, remove, restore, hardRemove } = useSuppliers(true)
  const { templates } = useSupplierTemplates()
  const navigate = useNavigate()

  const templateSupplierIds = useMemo(
    () => new Set(templates.map((t) => t.supplierId)),
    [templates]
  )

  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<SupplierFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [productCounts, setProductCounts] = useState<Map<string, number>>(new Map())
  const [enrichments, setEnrichments] = useState<Map<string, SupplierEnrichment>>(new Map())
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [counts, enrich] = await Promise.all([
          getSupplierProductCounts(),
          getSupplierEnrichments(),
        ])
        if (alive) {
          setProductCounts(counts)
          setEnrichments(enrich)
        }
      } catch {
        // non-critical
      }
    })()
    return () => { alive = false }
  }, [suppliers])

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers
    const q = search.trim().toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contact ?? '').toLowerCase().includes(q) ||
        (s.memo ?? '').toLowerCase().includes(q)
    )
  }, [suppliers, search])

  async function handleQuickUpload(supplierId: string) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (!f) return
      try {
        validateExcelFile(f)
        setUploadingFor(supplierId)

        const tpl = await getSupplierProductTemplate(supplierId)
        if (!tpl) {
          toast.error('상품 양식을 먼저 등록해주세요')
          return
        }

        const wb = await readExcelFile(f)
        const sheet = wb.Sheets[tpl.sheetName] ?? wb.Sheets[wb.SheetNames[0]!]
        if (!sheet) {
          toast.error('시트를 찾을 수 없습니다')
          return
        }

        const rows = sheetToRows(sheet)
        const result = parseSupplierProducts({
          rows,
          columnMappings: tpl.columnMappings,
          headerRow: tpl.headerRow,
          dataStartRow: tpl.dataStartRow,
        })

        if (result.meta.validCount === 0) {
          toast.error(`파싱 실패: 유효한 상품 없음 (오류 ${result.meta.invalidCount}건)`)
          return
        }

        await replaceSupplierProducts(supplierId, result.products)
        await updateUploadHistory(supplierId, {
          lastUploadedFileName: f.name,
          lastUploadedCount: result.meta.validCount,
          lastInvalidCount: result.meta.invalidCount,
        })

        const freshCounts = await getSupplierProductCounts()
        setProductCounts(freshCounts)
        toast.success(`${result.meta.validCount}개 상품 등록 완료`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '상품 업로드 실패')
      } finally {
        setUploadingFor(null)
      }
    }
    input.click()
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier)
    setForm({
      name: supplier.name,
      contact: supplier.contact ?? '',
      memo: supplier.memo ?? '',
    })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    const result = supplierFormSchema.safeParse(form)
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? '입력값을 확인해주세요')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await update(editing.id, result.data)
        setDialogOpen(false)
        setForm(EMPTY_FORM)
      } else {
        const newSupplier = await create(result.data)
        setDialogOpen(false)
        setForm(EMPTY_FORM)
        navigate(`/mapping/suppliers/${newSupplier.id}`)
      }
    } catch {
      // toast already shown by hook
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
      // toast already shown by hook
    } finally {
      setDeleting(false)
    }
  }

  async function handleHardDelete(supplier: Supplier) {
    if (!confirm(`"${supplier.name}" 공급처를 완전삭제합니다. 복구할 수 없습니다.`)) return
    try {
      await hardRemove(supplier.id)
    } catch {
      // toast already shown by hook
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="공급처 관리" />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="공급처 관리"
        description="발주를 보낼 공급처 목록을 관리합니다."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            공급처 추가
          </Button>
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState
          title="등록된 공급처가 없습니다"
          description="공급처를 추가하면 품목 매핑과 발주서 작성에 활용할 수 있습니다."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              공급처 추가
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <div className="relative w-[320px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-t-mute"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="공급처 이름, 연락처, 메모 검색"
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
            <span className="ml-1 text-xs text-t-mute">
              {filtered.length}개 표시 중
            </span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="검색 조건에 맞는 결과가 없습니다"
              action={
                <Button variant="outline" onClick={() => setSearch('')}>
                  필터 초기화
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-radius-lg border border-line bg-card shadow-sm">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      이름
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      연락처
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      메모
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      양식
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      상품
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      매핑 수
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      평균 단가
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      등록일
                    </TableHead>
                    <TableHead className="w-[140px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/mapping/suppliers/${s.id}`)}
                    >
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          {s.name}
                          {!s.isActive && (
                            <span className="inline-flex items-center rounded-[6px] bg-gray-200 px-2 py-[3px] text-[11px] font-semibold leading-snug text-t-mute">
                              비활성
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[13px] text-t-mid">
                        {s.contact || '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-[13px] text-t-mid">
                        {s.memo || '—'}
                      </TableCell>
                      <TableCell>
                        {templateSupplierIds.has(s.id) ? (
                          <StatusBadge variant="success">등록됨</StatusBadge>
                        ) : (
                          <StatusBadge variant="muted">미등록</StatusBadge>
                        )}
                      </TableCell>
                      <TableCell className="text-[13px] text-t-mid">
                        {productCounts.has(s.id)
                          ? `${productCounts.get(s.id)!.toLocaleString()}개`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-[13px] text-t-mid">
                        {enrichments.get(s.id)?.mappingCount
                          ? `${enrichments.get(s.id)!.mappingCount}건`
                          : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-[13px] text-t-mid">
                        {enrichments.get(s.id)?.avgPrice != null
                          ? `₩${enrichments.get(s.id)!.avgPrice!.toLocaleString()}`
                          : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-[13px] text-t-mute">
                        {s.createdAt.slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <button
                            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-t-mute hover:bg-gray-200 hover:text-t-strong disabled:opacity-50"
                            onClick={(e) => { e.stopPropagation(); handleQuickUpload(s.id) }}
                            disabled={uploadingFor === s.id}
                            title={templateSupplierIds.has(s.id) ? '상품 업로드' : '상품 양식을 먼저 등록해주세요'}
                          >
                            <Upload size={13} />
                          </button>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md text-t-mute hover:bg-gray-200 hover:text-t-strong"
                            onClick={(e) => { e.stopPropagation(); openEdit(s) }}
                            aria-label="수정"
                          >
                            <Pencil size={14} />
                          </button>
                          {!s.isActive && (
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-md text-t-mute hover:bg-blue-50 hover:text-primary"
                              onClick={(e) => { e.stopPropagation(); void restore(s.id) }}
                              aria-label="활성화"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          {s.isActive && (
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-md text-t-mute hover:bg-error-light hover:text-error"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }}
                              aria-label="비활성화"
                            >
                              <Power size={14} />
                            </button>
                          )}
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md text-t-mute hover:bg-red-50 hover:text-status-error"
                            onClick={(e) => { e.stopPropagation(); void handleHardDelete(s) }}
                            aria-label="완전삭제"
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
              {editing ? '공급처 수정' : '공급처 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>
                공급처 이름 <span className="text-error">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }))
                  setFormError(null)
                }}
                placeholder="예: A농장"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>연락처</Label>
              <Input
                value={form.contact ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact: e.target.value }))
                }
                placeholder="064-123-4567"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>메모</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-t-faint focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.memo ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, memo: e.target.value }))
                }
                placeholder="주요 품목, 시즌 등 자유롭게 적어주세요"
                rows={3}
              />
            </div>
            {formError && (
              <p className="text-sm text-error" role="alert">
                {formError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : editing ? '수정 저장' : '공급처 추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비활성화 ConfirmDialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="공급처 비활성화"
        description={`${deleteTarget?.name ?? ''}을(를) 비활성화하시겠습니까? 기존 매핑과 과거 데이터는 유지되지만, 새 매핑 생성 시에는 선택할 수 없습니다.`}
        confirmText="비활성화"
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
