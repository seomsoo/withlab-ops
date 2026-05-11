import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertCircle,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  Upload,
  RefreshCw,
  Info,
} from 'lucide-react'

import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { OrderTabs } from '@/components/OrderTabs'
import { PlatformBadge } from '@/components/PlatformBadge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { useWorkSession } from '@/hooks/useWorkSession'
import { useAllocation } from '@/hooks/useAllocation'
import { useSuppliers } from '@/hooks/useSuppliers'
import {
  getSupplierProductCounts,
  getAllSupplierProducts,
  replaceSupplierProducts,
} from '@/lib/supabase/supplierProducts'
import {
  getSupplierProductTemplate,
  getSupplierProductTemplateSupplierIds,
  updateUploadHistory,
} from '@/lib/supabase/supplierProductTemplates'
import { parseSupplierProducts } from '@/lib/parsers/supplierProductParser'
import { validateExcelFile } from '@/utils/file'
import { readExcelFile, sheetToRows } from '@/utils/excel'

import { cn } from '@/lib/utils'

import type { AllocationWithOrder } from '@/lib/supabase/allocations'
import type { Supplier, SupplierProduct } from '@/types'

type FilterType = 'all' | 'auto' | 'unmapped' | 'edited'

type AllocationGroup = {
  key: string
  productName: string
  optionName: string
  platform: string
  orderCount: number
  totalQuantity: number
  supplierId: string | null
  supplierName: string | null
  status: 'auto' | 'edited' | 'unmapped'
  items: AllocationWithOrder[]
  orderIds: string[]
  smartAllocationApplied: boolean
  supplierPrice?: number
  nameMappingApplied: boolean
}

export default function SupplierAllocation() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { session, loading: sessionLoading } = useWorkSession(sessionId)
  const {
    allocations,
    unallocatedOrders,
    loading: allocLoading,
    running,
    runAutoAllocation,
    updateGroupSupplier,
    assignUnmatched,
    distributeGroup,
  } = useAllocation(sessionId ?? '')
  const { suppliers } = useSuppliers()

  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [changeDialog, setChangeDialog] = useState<{
    group: AllocationGroup
    newSupplierId: string
  } | null>(null)
  const [distributeDialog, setDistributeDialog] = useState<AllocationGroup | null>(null)
  const [refreshOpen, setRefreshOpen] = useState(false)
  const [spCounts, setSpCounts] = useState<Map<string, number>>(new Map())
  const [spTemplateIds, setSpTemplateIds] = useState<Set<string>>(new Set())
  const [allSp, setAllSp] = useState<SupplierProduct[]>([])
  const [refreshingFor, setRefreshingFor] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [counts, products, templateIds] = await Promise.all([
          getSupplierProductCounts(),
          getAllSupplierProducts(),
          getSupplierProductTemplateSupplierIds(),
        ])
        if (!alive) return
        setSpCounts(counts)
        setAllSp(products)
        setSpTemplateIds(templateIds)
      } catch { /* non-critical */ }
    })()
    return () => { alive = false }
  }, [])

  const isReadonly = session?.status !== 'active'
  const autoAllocRan = useRef(false)

  useEffect(() => {
    if (
      !allocLoading &&
      allocations.length === 0 &&
      unallocatedOrders.length > 0 &&
      !running &&
      !isReadonly &&
      !autoAllocRan.current
    ) {
      autoAllocRan.current = true
      runAutoAllocation()
    }
  }, [allocLoading, allocations.length, unallocatedOrders.length, running, isReadonly, runAutoAllocation])

  const groups = useMemo((): AllocationGroup[] => {
    const groupMap = new Map<string, AllocationGroup>()

    for (const alloc of allocations) {
      const key = `${alloc.order.productName}||${alloc.order.optionName}`
      const existing = groupMap.get(key)
      if (existing) {
        existing.orderCount++
        existing.totalQuantity += alloc.order.quantity
        existing.items.push(alloc)
        existing.orderIds.push(alloc.orderId)
        if (alloc.isTemporaryOverride) existing.status = 'edited'
      } else {
        groupMap.set(key, {
          key,
          productName: alloc.order.productName,
          optionName: alloc.order.optionName,
          platform: alloc.order.platform,
          orderCount: 1,
          totalQuantity: alloc.order.quantity,
          supplierId: alloc.supplierId,
          supplierName: alloc.supplierName,
          status: alloc.isTemporaryOverride ? 'edited' : 'auto',
          items: [alloc],
          orderIds: [alloc.orderId],
          nameMappingApplied: alloc.nameMappingApplied,
          smartAllocationApplied: alloc.smartAllocationApplied,
          supplierPrice: alloc.supplierPrice,
        })
      }
    }

    for (const order of unallocatedOrders) {
      const key = `${order.productName}||${order.optionName}`
      const existing = groupMap.get(key)
      if (existing) {
        existing.orderCount++
        existing.totalQuantity += order.quantity
        existing.status = 'unmapped'
        existing.orderIds.push(order.id)
      } else {
        groupMap.set(key, {
          key,
          productName: order.productName,
          optionName: order.optionName,
          platform: order.platform,
          orderCount: 1,
          totalQuantity: order.quantity,
          supplierId: null,
          supplierName: null,
          status: 'unmapped',
          items: [],
          orderIds: [order.id],
          nameMappingApplied: false,
          smartAllocationApplied: false,
        })
      }
    }

    return Array.from(groupMap.values())
  }, [allocations, unallocatedOrders])

  const counts = useMemo(() => {
    return {
      all: groups.length,
      auto: groups.filter((g) => g.status === 'auto').length,
      unmapped: groups.filter((g) => g.status === 'unmapped').length,
      edited: groups.filter((g) => g.status === 'edited').length,
    }
  }, [groups])

  const filteredGroups = useMemo(() => {
    if (filter === 'all') return groups
    return groups.filter((g) => g.status === filter)
  }, [groups, filter])

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleRefreshProducts(supplierId: string) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (!f) return
      try {
        validateExcelFile(f)
        setRefreshingFor(supplierId)
        const tpl = await getSupplierProductTemplate(supplierId)
        if (!tpl) { toast.error('상품 양식을 먼저 등록해주세요'); return }
        const wb = await readExcelFile(f)
        const sheet = wb.Sheets[tpl.sheetName] ?? wb.Sheets[wb.SheetNames[0]!]
        if (!sheet) { toast.error('시트를 찾을 수 없습니다'); return }
        const rows = sheetToRows(sheet)
        const result = parseSupplierProducts({
          rows,
          columnMappings: tpl.columnMappings,
          headerRow: tpl.headerRow,
          dataStartRow: tpl.dataStartRow,
        })
        if (result.meta.validCount === 0) {
          toast.error(`파싱 실패: 유효한 상품 없음`)
          return
        }
        await replaceSupplierProducts(supplierId, result.products)
        await updateUploadHistory(supplierId, {
          lastUploadedFileName: f.name,
          lastUploadedCount: result.meta.validCount,
          lastInvalidCount: result.meta.invalidCount,
        })
        const [counts, products] = await Promise.all([
          getSupplierProductCounts(),
          getAllSupplierProducts(),
        ])
        setSpCounts(counts)
        setAllSp(products)
        toast.success(`${result.meta.validCount}개 상품 갱신 완료`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '상품 갱신 실패')
      } finally {
        setRefreshingFor(null)
      }
    }
    input.click()
  }

  const handleSupplierChange = useCallback(
    (group: AllocationGroup, newSupplierId: string) => {
      if (group.status === 'unmapped') {
        const promises = group.orderIds.map((oid) =>
          assignUnmatched(oid, newSupplierId)
        )
        Promise.all(promises).catch(() => {})
      } else {
        setChangeDialog({ group, newSupplierId })
      }
    },
    [assignUnmatched]
  )

  const handleChangeConfirm = useCallback(
    async (mode: 'today' | 'default') => {
      if (!changeDialog) return
      const { group, newSupplierId } = changeDialog

      await updateGroupSupplier(
        group.orderIds,
        newSupplierId,
        group.platform as 'coupang' | 'toss',
        group.productName,
        group.optionName,
        mode === 'today'
      )
      setChangeDialog(null)
    },
    [changeDialog, updateGroupSupplier]
  )

  if (sessionLoading || allocLoading) {
    return <LoadingSpinner />
  }

  if (!session || !sessionId) {
    return (
      <div className="py-20 text-center text-t-mute">
        작업건을 찾을 수 없습니다
      </div>
    )
  }

  const hasOrders = allocations.length > 0 || unallocatedOrders.length > 0

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="mb-5 flex items-center gap-2">
        <Link
          to="/orders"
          className="text-sm text-t-mute hover:text-t-secondary"
        >
          ← 작업건 변경
        </Link>
        <span className="text-t-faint">·</span>
        <span className="text-[15px] font-bold text-t-strong">
          {session.name}
        </span>
      </div>

      <OrderTabs
        sessionId={sessionId}
        activeTab="assign"
        completedTabs={['upload']}
      />

      {isReadonly && (
        <div className="mt-4 rounded-radius-md border border-warning-dark/20 bg-warning-light px-4 py-3 text-sm font-medium text-warning-dark">
          {session.status === 'ordered'
            ? '발주 완료된 작업건은 수정할 수 없습니다 (재다운로드는 가능)'
            : '완료된 작업건은 수정할 수 없습니다'}
        </div>
      )}

      {!hasOrders ? (
        <div className="mt-10 flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-t-mute">주문을 먼저 업로드해주세요</p>
          <Link to={`/orders/${sessionId}/upload`}>
            <Button variant="outline">주문 업로드</Button>
          </Link>
        </div>
      ) : (
        <>
          {counts.unmapped > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-radius-md border border-status-error/20 bg-red-50 px-4 py-3">
              <AlertCircle size={18} className="text-status-error" />
              <div className="text-sm">
                <span className="font-semibold text-status-error">
                  미분류 {counts.unmapped}건
                </span>
                <span className="text-t-secondary ml-1">
                  — 공급처를 지정해주세요
                </span>
              </div>
              <button
                className="ml-auto text-xs font-medium text-primary hover:underline"
                onClick={() => setFilter('unmapped')}
              >
                미분류만 보기
              </button>
            </div>
          )}

          {/* 상품 목록 갱신 (접이식) */}
          {!isReadonly && suppliers.length > 0 && (
            <div className="mt-4 rounded-radius-md border border-line">
              <button
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-t-strong hover:bg-bg-subtle"
                onClick={() => setRefreshOpen((v) => !v)}
              >
                <RefreshCw size={14} />
                상품 목록 갱신
                <ChevronDown
                  size={14}
                  className={cn(
                    'ml-auto transition-transform',
                    refreshOpen && 'rotate-180'
                  )}
                />
              </button>
              {refreshOpen && (
                <div className="border-t border-line px-4 py-3">
                  <div className="space-y-2">
                    {suppliers.filter((s) => s.isActive).map((s) => {
                      const count = spCounts.get(s.id)
                      const hasTemplate = spTemplateIds.has(s.id)
                      return (
                        <div key={s.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-xs text-t-mute">
                              {hasTemplate
                                ? `${count ?? 0}개`
                                : '양식 미등록'}
                            </span>
                          </div>
                          {hasTemplate ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={refreshingFor === s.id}
                              onClick={() => handleRefreshProducts(s.id)}
                            >
                              <Upload size={12} className="mr-1" />
                              {refreshingFor === s.id ? '갱신 중...' : '갱신'}
                            </Button>
                          ) : (
                            <Link to={`/mapping/suppliers/${s.id}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                양식 설정 →
                              </Button>
                            </Link>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-t-faint">
                    <Info size={12} />
                    안 바뀌었으면 갱신 없이 바로 배정해도 됩니다
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 text-xs text-t-mute">
            분배 기준: 주문 라인 단위
          </div>

          {/* Filter bar */}
          <div className="mt-3 flex items-center gap-2">
            {(['all', 'auto', 'unmapped', 'edited'] as FilterType[]).map(
              (f) => (
                <button
                  key={f}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-bg-subtle text-t-secondary hover:bg-gray-200'
                  )}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' && '전체'}
                  {f === 'auto' && '자동배정'}
                  {f === 'unmapped' && '미분류'}
                  {f === 'edited' && '수정됨'}
                  <span className="ml-1 opacity-70">
                    {counts[f]}
                  </span>
                </button>
              )
            )}
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            <SummaryCard label="총 품목" value={groups.length} />
            <SummaryCard
              label="자동배정"
              value={counts.auto}
              tone="success"
            />
            <SummaryCard
              label="미분류"
              value={counts.unmapped}
              tone="error"
            />
            <SummaryCard
              label="수정됨"
              value={counts.edited}
              tone="info"
            />
          </div>

          {/* Groups */}
          <div className="mt-5 space-y-2">
            {filteredGroups.map((group) => (
              <GroupRow
                key={group.key}
                group={group}
                expanded={expandedGroups.has(group.key)}
                onToggle={() => toggleGroup(group.key)}
                suppliers={suppliers}
                supplierProducts={allSp}
                onSupplierChange={(suppId) =>
                  handleSupplierChange(group, suppId)
                }
                onDistribute={() => setDistributeDialog(group)}
                isReadonly={isReadonly}
              />
            ))}
          </div>

          {/* Bottom CTA */}
          {!isReadonly && (
            <div className="mt-6 flex justify-end border-t border-line pt-4">
              <Button
                disabled={counts.unmapped > 0}
                onClick={() =>
                  navigate(`/orders/${sessionId}/download`)
                }
              >
                다음: 발주서 다운로드
                <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Change Supplier Dialog */}
      {changeDialog && (
        <ChangeSupplierDialog
          supplierName={
            suppliers.find((s) => s.id === changeDialog.newSupplierId)
              ?.name ?? ''
          }
          onTodayOnly={() => handleChangeConfirm('today')}
          onChangeDefault={() => handleChangeConfirm('default')}
          onCancel={() => setChangeDialog(null)}
        />
      )}

      {/* Distribute Dialog */}
      {distributeDialog && (
        <DistributionDialog
          group={distributeDialog}
          suppliers={suppliers}
          onApply={async (distributions) => {
            await distributeGroup(
              distributeDialog.orderIds,
              distributions,
              distributeDialog.platform as 'coupang' | 'toss',
              distributeDialog.productName,
              distributeDialog.optionName
            )
            setDistributeDialog(null)
          }}
          onCancel={() => setDistributeDialog(null)}
        />
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success' | 'error' | 'info'
}) {
  return (
    <div className="rounded-radius-md border border-line bg-card px-4 py-3">
      <div className="text-xs text-t-mute">{label}</div>
      <div
        className={cn(
          'mt-1 text-xl font-bold',
          tone === 'success' && 'text-status-success',
          tone === 'error' && 'text-status-error',
          tone === 'info' && 'text-primary',
          !tone && 'text-t-strong'
        )}
      >
        {value}
      </div>
    </div>
  )
}

function GroupRow({
  group,
  expanded,
  onToggle,
  suppliers,
  supplierProducts,
  onSupplierChange,
  onDistribute,
  isReadonly,
}: {
  group: AllocationGroup
  expanded: boolean
  onToggle: () => void
  suppliers: Supplier[]
  supplierProducts: SupplierProduct[]
  onSupplierChange: (supplierId: string) => void
  onDistribute: () => void
  isReadonly: boolean
}) {
  return (
    <div className="rounded-radius-md border border-line bg-card">
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={onToggle}
      >
        <ChevronRight
          size={16}
          className={cn(
            'text-t-mute transition-transform',
            expanded && 'rotate-90'
          )}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-t-strong">
              {group.productName}
            </span>
            {group.optionName && (
              <span className="text-xs text-t-mute">
                {group.optionName}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-t-mute">
            <span>{group.orderCount}건</span>
            <span>총 {group.totalQuantity}개</span>
            {group.supplierPrice !== undefined && (
              <span className="font-mono">
                ₩{group.supplierPrice.toLocaleString('ko-KR')}
              </span>
            )}
            {group.smartAllocationApplied && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                스마트배정
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={group.status} />
          <div className="w-[180px]">
            {isReadonly ? (
              <span className="text-sm text-t-secondary">
                {group.supplierName ?? '미배정'}
              </span>
            ) : (
              <Select
                value={group.supplierId ?? ''}
                onValueChange={(val) => onSupplierChange(val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="공급처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => {
                    const sp = supplierProducts.find(
                      (p) =>
                        p.supplierId === s.id &&
                        p.productName === (group.items[0]?.supplierProductName ?? group.productName)
                    )
                    const info = sp
                      ? `₩${sp.price?.toLocaleString('ko-KR') ?? '?'} · ${sp.stockStatus === 'available' ? '재고있음' : sp.stockStatus === 'soldout' ? '품절' : '재고미확인'}`
                      : null
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        <span>{s.name}</span>
                        {!s.isActive && ' (비활성)'}
                        {info && (
                          <span className="ml-1.5 text-t-mute">· {info}</span>
                        )}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
          {!isReadonly && group.items.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onDistribute}
            >
              분배
            </Button>
          )}
        </div>
      </div>

      {expanded && group.items.length > 0 && (
        <div className="border-t border-line px-4 py-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-t-mute">
                <th className="py-1.5 pr-3">플랫폼</th>
                <th className="py-1.5 pr-3">주문번호</th>
                <th className="py-1.5 pr-3">수취인</th>
                <th className="py-1.5 pr-3">수량</th>
                <th className="py-1.5">주소</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item) => (
                <tr key={item.id} className="border-t border-line/50">
                  <td className="py-1.5 pr-3">
                    <PlatformBadge platform={item.order.platform} />
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-t-secondary">
                    {item.order.matchingKey}
                  </td>
                  <td className="py-1.5 pr-3">{item.order.recipientName}</td>
                  <td className="py-1.5 pr-3">{item.order.quantity}</td>
                  <td className="max-w-[300px] truncate py-1.5 text-t-mute">
                    {item.order.address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'auto' | 'edited' | 'unmapped' }) {
  if (status === 'auto') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-status-success">
        <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
        자동배정
      </span>
    )
  }
  if (status === 'edited') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        수정됨
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-status-error">
      <AlertCircle size={11} />
      미분류
    </span>
  )
}

function ChangeSupplierDialog({
  supplierName,
  onTodayOnly,
  onChangeDefault,
  onCancel,
}: {
  supplierName: string
  onTodayOnly: () => void
  onChangeDefault: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>공급처 변경</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-t-secondary">
          <strong>{supplierName}</strong>으로 변경합니다.
          적용 범위를 선택해주세요.
        </p>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button variant="outline" onClick={onTodayOnly}>
            오늘만 적용
          </Button>
          <Button onClick={onChangeDefault}>
            기본 매핑도 변경
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DistributionDialog({
  group,
  suppliers,
  onApply,
  onCancel,
}: {
  group: AllocationGroup
  suppliers: Supplier[]
  onApply: (
    distributions: {
      supplierId: string
      count: number
    }[]
  ) => Promise<void>
  onCancel: () => void
}) {
  const [rows, setRows] = useState<
    { supplierId: string; count: number }[]
  >([
    {
      supplierId: group.supplierId ?? suppliers[0]?.id ?? '',
      count: group.orderCount,
    },
  ])

  const totalAssigned = rows.reduce((sum, r) => sum + r.count, 0)
  const isValid = totalAssigned === group.orderCount && rows.every((r) => r.supplierId && r.count > 0)

  const addRow = () => {
    setRows((prev) => [...prev, { supplierId: '', count: 0 }])
  }

  const updateRow = (idx: number, field: 'supplierId' | 'count', value: string | number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    )
  }

  const handleApply = async () => {
    const distributions = rows
      .filter((r) => r.count > 0 && r.supplierId)
      .map((r) => ({
        supplierId: r.supplierId,
        count: r.count,
      }))
    await onApply(distributions)
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {group.productName} — 총 {group.orderCount}건 분배
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Select
                value={row.supplierId}
                onValueChange={(val) => updateRow(idx, 'supplierId', val)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="공급처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="number"
                min={0}
                max={group.orderCount}
                value={row.count}
                onChange={(e) =>
                  updateRow(idx, 'count', parseInt(e.target.value) || 0)
                }
                className="w-20 rounded-md border border-line px-2 py-1.5 text-sm"
              />
              <span className="text-xs text-t-mute">건</span>
            </div>
          ))}
        </div>

        <button
          className="mt-2 text-xs font-medium text-primary hover:underline"
          onClick={addRow}
        >
          + 공급처 추가
        </button>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-t-mute">
            합계: {totalAssigned} / {group.orderCount}건
          </span>
          {totalAssigned !== group.orderCount && (
            <span className="text-xs text-status-error">
              합계가 일치하지 않습니다
            </span>
          )}
          {totalAssigned === group.orderCount && (
            <span className="text-xs text-status-success">✓</span>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button disabled={!isValid} onClick={handleApply}>
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
