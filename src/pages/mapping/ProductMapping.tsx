import { useState, useMemo, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, X, Check, AlertCircle } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PlatformBadge } from '@/components/PlatformBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

import { useProductMappings } from '@/hooks/useProductMappings'
import { useSuppliers } from '@/hooks/useSuppliers'
import { productMappingFormSchema } from '@/lib/schemas'
import { getUnmappedProducts, createProductMappingsBulk } from '@/lib/supabase/productMappings'
import { toast } from 'sonner'

import type { Platform } from '@/types'
import type { ProductMappingWithSupplier, ProductMappingFormData } from '@/lib/schemas'
import type { UnmappedProduct } from '@/lib/supabase/productMappings'

type PlatformFilter = 'all' | 'common' | 'coupang' | 'toss'

const PLATFORM_TABS: { id: PlatformFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'common', label: '공통' },
  { id: 'coupang', label: '쿠팡' },
  { id: 'toss', label: '토스' },
]

const EMPTY_FORM: ProductMappingFormData = {
  platform: 'coupang',
  productName: '',
  optionName: '',
  supplierId: '',
  isDefault: true,
  priority: 0,
}

export default function ProductMapping() {
  const { mappings, loading: mappingsLoading, create, update, remove, refetch } = useProductMappings()
  const { suppliers, loading: suppliersLoading } = useSuppliers()

  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ProductMappingWithSupplier | null>(null)
  const [form, setForm] = useState<ProductMappingFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ProductMappingWithSupplier | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [bulkOpen, setBulkOpen] = useState(false)
  const [unmapped, setUnmapped] = useState<UnmappedProduct[]>([])
  const [bulkAssignments, setBulkAssignments] = useState<Record<string, string>>({})
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)

  const openBulkDialog = useCallback(async () => {
    setBulkOpen(true)
    setBulkLoading(true)
    setBulkAssignments({})
    try {
      const data = await getUnmappedProducts()
      setUnmapped(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '조회 실패')
    } finally {
      setBulkLoading(false)
    }
  }, [])

  const bulkAssignedCount = Object.values(bulkAssignments).filter(Boolean).length

  async function handleBulkSave() {
    const items: Array<{ platform: Platform; productName: string; optionName: string; supplierId: string }> = []
    for (const [key, supplierId] of Object.entries(bulkAssignments)) {
      if (!supplierId) continue
      const item = unmapped.find(
        (u) => `${u.platform}::${u.productName}::${u.optionName}` === key
      )
      if (item) {
        items.push({
          platform: item.platform,
          productName: item.productName,
          optionName: item.optionName,
          supplierId,
        })
      }
    }
    if (items.length === 0) return
    setBulkSaving(true)
    try {
      const count = await createProductMappingsBulk(items)
      toast.success(`${count}건 매핑 등록 완료`)
      setBulkOpen(false)
      void refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '일괄 등록 실패')
    } finally {
      setBulkSaving(false)
    }
  }

  const loading = mappingsLoading || suppliersLoading

  const filtered = useMemo(() => {
    return mappings
      .filter((m) => {
        if (supplierFilter !== 'all' && m.supplierId !== supplierFilter) return false
        if (platformFilter !== 'all' && m.platform !== platformFilter) return false
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          if (
            !m.productName.toLowerCase().includes(q) &&
            !m.optionName.toLowerCase().includes(q)
          )
            return false
        }
        return true
      })
      .sort((a, b) => {
        let c = a.platform.localeCompare(b.platform)
        if (c !== 0) return c
        c = a.productName.localeCompare(b.productName)
        if (c !== 0) return c
        c = a.optionName.localeCompare(b.optionName)
        if (c !== 0) return c
        c = a.priority - b.priority
        if (c !== 0) return c
        return a.supplierName.localeCompare(b.supplierName)
      })
  }, [mappings, search, supplierFilter, platformFilter])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  function openEdit(mapping: ProductMappingWithSupplier) {
    setEditing(mapping)
    setForm({
      platform: mapping.platform,
      productName: mapping.productName,
      optionName: mapping.optionName,
      supplierId: mapping.supplierId,
      isDefault: mapping.isDefault,
      priority: mapping.priority,
    })
    setSheetOpen(true)
  }

  async function handleSave() {
    const result = productMappingFormSchema.safeParse(form)
    if (!result.success) return
    setSaving(true)
    try {
      if (editing) {
        await update(editing.id, result.data)
      } else {
        await create(result.data)
      }
      setSheetOpen(false)
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
        <PageHeader title="품목 ↔ 공급처 매핑" />
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
        title="품목 ↔ 공급처 매핑"
        description="플랫폼 상품과 공급처를 연결합니다. 발주서 작성 시 자동으로 배정됩니다."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void openBulkDialog()}>
              <AlertCircle size={16} />
              미매핑 품목 감지
            </Button>
            <Button onClick={openCreate}>
              <Plus size={16} />
              매핑 추가
            </Button>
          </div>
        }
      />

      {!hasData ? (
        <EmptyState
          title="등록된 매핑이 없습니다"
          description="품목과 공급처를 연결하면 발주서 작성 시 자동으로 배정됩니다."
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
                placeholder="상품명, 옵션 검색"
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

            <div className="flex rounded-lg border border-line bg-card p-1">
              {PLATFORM_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`rounded-md px-3 py-1 text-[13px] font-semibold transition-colors ${
                    platformFilter === tab.id
                      ? 'bg-primary-50 text-primary'
                      : 'text-t-mid hover:text-t-strong'
                  }`}
                  onClick={() => setPlatformFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
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
                    setPlatformFilter('all')
                  }}
                >
                  필터 초기화
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-radius-lg border border-line bg-card shadow-sm">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[70px] text-xs font-semibold tracking-wider text-t-mute">
                      플랫폼
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      상품명
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      옵션
                    </TableHead>
                    <TableHead className="text-xs font-semibold tracking-wider text-t-mute">
                      공급처
                    </TableHead>
                    <TableHead className="w-[60px] text-xs font-semibold tracking-wider text-t-mute">
                      기본
                    </TableHead>
                    <TableHead className="w-[80px] text-xs font-semibold tracking-wider text-t-mute">
                      우선순위
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
                        {m.productName}
                      </TableCell>
                      <TableCell className="text-[13px] text-t-mid">
                        {m.optionName || (
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
                      <TableCell>
                        {m.isDefault ? (
                          <Check size={16} className="text-success" />
                        ) : (
                          <span className="text-t-mute">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-block rounded-md bg-gray-200 px-2 py-0.5 font-mono text-xs font-bold text-t-mid">
                          #{m.priority}
                        </span>
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle>
              {editing ? '매핑 수정' : '매핑 추가'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-4">
            <div className="flex flex-col gap-1.5">
              <Label>플랫폼</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['common', 'coupang', 'toss'] as const).map((p) => (
                  <button
                    key={p}
                    className={`rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors ${
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
                상품명 <span className="text-error">*</span>
              </Label>
              <Input
                value={form.productName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, productName: e.target.value }))
                }
                placeholder="예: 산지직송 성주 꿀참외"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>옵션명</Label>
              <Input
                value={form.optionName ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, optionName: e.target.value }))
                }
                placeholder="예: 1박스 특가혼합과 5kg"
              />
              <p className="text-[11.5px] text-t-mute">
                옵션을 비우면 모든 옵션에 적용됩니다
              </p>
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
              <Label>우선순위</Label>
              <Input
                type="number"
                min={0}
                max={999}
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-[11.5px] text-t-mute">
                숫자가 작을수록 우선 적용됩니다 (0~999)
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-radius-sm border border-line bg-gray-50 px-4 py-3">
              <Checkbox
                id="isDefault"
                checked={form.isDefault}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isDefault: checked === true }))
                }
              />
              <div>
                <label
                  htmlFor="isDefault"
                  className="text-[13.5px] font-semibold text-t-strong"
                >
                  기본 매핑으로 설정
                </label>
                <p className="text-[11.5px] text-t-mute">
                  동일 품목에 매핑이 여러 개일 때 이 공급처가 우선 적용됩니다
                </p>
              </div>
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.productName.trim() || !form.supplierId}>
              {saving ? '저장 중...' : editing ? '수정 저장' : '매핑 추가'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="매핑 삭제"
        description="이 매핑을 삭제하시겠습니까?"
        confirmText="삭제"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>미매핑 품목 감지</DialogTitle>
          </DialogHeader>
          {bulkLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : unmapped.length === 0 ? (
            <div className="py-12 text-center text-t-mute">
              모든 품목이 매핑되어 있습니다
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto rounded-radius-md border border-line">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>플랫폼</TableHead>
                    <TableHead>상품명</TableHead>
                    <TableHead>옵션</TableHead>
                    <TableHead className="w-16">주문수</TableHead>
                    <TableHead className="w-[180px]">공급처</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmapped.map((u) => {
                    const key = `${u.platform}::${u.productName}::${u.optionName}`
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {u.platform === 'coupang' ? '쿠팡' : '토스'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm font-medium" title={u.productName}>
                          {u.productName}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate text-xs text-t-mute" title={u.optionName || undefined}>
                          {u.optionName || '—'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {u.orderCount}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={bulkAssignments[key] ?? ''}
                            onValueChange={(v) =>
                              setBulkAssignments((prev) => ({ ...prev, [key]: v }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              닫기
            </Button>
            <Button
              disabled={bulkAssignedCount === 0 || bulkSaving}
              onClick={() => void handleBulkSave()}
            >
              {bulkSaving ? '저장 중...' : `${bulkAssignedCount}건 일괄 등록`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
