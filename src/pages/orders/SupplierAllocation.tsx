import { useState, useMemo, useEffect, useCallback, memo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertCircle,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  Upload,
  RefreshCw,
  RotateCcw,
  Info,
} from 'lucide-react'

import { PageSkeleton } from '@/components/ui/PageSkeleton'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

import { useWorkSession } from '@/hooks/useWorkSession'
import { useAllocation } from '@/hooks/useAllocation'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useFruitDictionary } from '@/hooks/useFruitDictionary'
import { extractAttributes } from '@/lib/matching/attributeExtractor'
import {
  getSupplierProductCounts,
  getAllSupplierProducts,
  replaceSupplierProducts,
} from '@/lib/supabase/supplierProducts'
import { createAutoProductMapping } from '@/lib/supabase/productMappings'
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
import type { SuggestedAllocation } from '@/lib/allocation/autoAllocator'
import type { MatchCandidate } from '@/lib/matching/attributeMatcher'
import type { Supplier, SupplierProduct } from '@/types'

type FilterType = 'all' | 'auto' | 'suggested' | 'unmapped' | 'edited'

type AllocationGroup = {
  key: string
  productName: string
  optionName: string
  platform: string
  orderCount: number
  totalQuantity: number
  supplierId: string | null
  supplierName: string | null
  status: 'auto' | 'edited' | 'unmapped' | 'suggested'
  items: AllocationWithOrder[]
  orderIds: string[]
  smartAllocationApplied: boolean
  supplierPrice?: number
  supplierProductName?: string
  supplierProductCode?: string
  nameMappingApplied: boolean
  allocationReason?: string
  topCandidate?: MatchCandidate
}

export default function SupplierAllocation() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, loading: sessionLoading } = useWorkSession(sessionId)
  const {
    allocations,
    unallocatedOrders,
    suggested,
    loading: allocLoading,
    running,
    runAutoAllocation,
    resetAndRerun,
    updateGroupSupplier,
    assignUnmatched,
    applySuggested,
    distributeGroup,
    changeSupplierProduct,
  } = useAllocation(sessionId ?? '')
  const { suppliers } = useSuppliers()
  const { dictionaries: fruitDictionary } = useFruitDictionary(true)

  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
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

  const keywordOverrides = useMemo(() => {
    const raw = searchParams.get('overrides')
    if (!raw) return undefined
    try {
      const obj = JSON.parse(raw) as Record<string, string>
      return new Map(Object.entries(obj))
    } catch {
      return undefined
    }
  }, [searchParams])

  const suggestedMap = useMemo(() => {
    const map = new Map<string, SuggestedAllocation>()
    for (const s of suggested) {
      map.set(s.orderId, s)
    }
    return map
  }, [suggested])

  const groups = useMemo((): AllocationGroup[] => {
    const groupMap = new Map<string, AllocationGroup>()

    for (const alloc of allocations) {
      const key = `${alloc.order.productName}||${alloc.order.optionName}||${alloc.supplierId}`
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
          supplierProductName: alloc.supplierProductName,
          supplierProductCode: alloc.supplierProductCode,
          allocationReason: alloc.allocationReason,
        })
      }
    }

    for (const order of unallocatedOrders) {
      const key = `${order.productName}||${order.optionName}||unalloc`
      const sug = suggestedMap.get(order.id)
      const existing = groupMap.get(key)
      if (existing) {
        existing.orderCount++
        existing.totalQuantity += order.quantity
        if (existing.status !== 'suggested') {
          existing.status = sug ? 'suggested' : 'unmapped'
        }
        if (sug && !existing.topCandidate && sug.candidates.length > 0) {
          existing.topCandidate = sug.candidates[0]
        }
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
          status: sug ? 'suggested' : 'unmapped',
          items: [],
          orderIds: [order.id],
          nameMappingApplied: false,
          smartAllocationApplied: false,
          topCandidate: sug?.candidates[0],
        })
      }
    }

    return Array.from(groupMap.values())
  }, [allocations, unallocatedOrders, suggestedMap])

  const counts = useMemo(() => {
    return {
      all: groups.length,
      auto: groups.filter((g) => g.status === 'auto').length,
      suggested: groups.filter((g) => g.status === 'suggested').length,
      unmapped: groups.filter((g) => g.status === 'unmapped').length,
      edited: groups.filter((g) => g.status === 'edited').length,
    }
  }, [groups])

  const filteredGroups = useMemo(() => {
    if (filter === 'all') return groups
    return groups.filter((g) => g.status === filter)
  }, [groups, filter])

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

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
    async (group: AllocationGroup, newSupplierId: string, mode: 'today' | 'default') => {
      if (group.status === 'unmapped' || group.status === 'suggested') {
        await assignUnmatched(group.orderIds, newSupplierId)
      } else {
        await updateGroupSupplier(
          group.orderIds,
          newSupplierId,
          group.platform as 'coupang' | 'toss',
          group.productName,
          group.optionName,
          mode === 'today'
        )
      }
    },
    [assignUnmatched, updateGroupSupplier]
  )

  if (sessionLoading || allocLoading) {
    return <PageSkeleton />
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
        completedTabs={isReadonly ? ['upload', 'review', 'assign', 'download'] : ['upload', 'review']}
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
          {counts.suggested > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-radius-md border border-warning-dark/20 bg-warning-light px-4 py-3">
              <Info size={18} className="text-warning-dark" />
              <div className="text-sm">
                <span className="font-semibold text-warning-dark">
                  추천 {counts.suggested}건
                </span>
                <span className="text-t-secondary ml-1">
                  — 속성 매칭으로 공급처를 추천했습니다
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setFilter('suggested')}
                >
                  추천만 보기
                </button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const suggestedOrderIds = groups
                      .filter((g) => g.status === 'suggested')
                      .flatMap((g) => g.orderIds.filter((oid) => suggestedMap.has(oid)))
                    if (suggestedOrderIds.length > 0) {
                      void applySuggested(suggestedOrderIds)
                    }
                  }}
                >
                  전체 추천 적용
                </Button>
              </div>
            </div>
          )}

          {counts.unmapped > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-radius-md border border-error-dark/20 bg-error-light px-4 py-3">
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

          {/* 자동배정 / 재배정 */}
          {!isReadonly && (
            <div className="mt-4 flex items-center justify-between rounded-radius-md border border-line bg-bg-subtle px-4 py-2.5">
              <span className="text-xs text-t-mute">
                {allocations.length > 0
                  ? '배정 결과가 올바르지 않다면 초기화 후 다시 자동 배정할 수 있습니다'
                  : '자동 배정을 실행하면 매핑 기준으로 공급처를 자동 지정합니다'}
              </span>
              <Button
                variant={allocations.length > 0 ? 'outline' : 'default'}
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={running}
                onClick={() => {
                  if (allocations.length > 0) {
                    void resetAndRerun(keywordOverrides)
                  } else {
                    void runAutoAllocation(keywordOverrides)
                  }
                }}
              >
                <RotateCcw size={12} />
                {running ? '배정 중...' : allocations.length > 0 ? '재배정' : '자동배정'}
              </Button>
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
            {(['all', 'auto', 'suggested', 'unmapped', 'edited'] as FilterType[]).map(
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
                  {f === 'suggested' && '추천'}
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
          <div className="mt-4 grid grid-cols-6 gap-3">
            <SummaryCard label="총 품목" value={groups.length} />
            <SummaryCard
              label="자동배정"
              value={counts.auto}
              tone="success"
            />
            <SummaryCard
              label="추천"
              value={counts.suggested}
              tone="warning"
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
            <EstimatedCostCard groups={groups} />
          </div>

          {/* Groups */}
          <div className="mt-5 space-y-2">
            {filteredGroups.map((group) => (
              <GroupRow
                key={group.key}
                group={group}
                expanded={expandedGroups.has(group.key)}
                onToggle={toggleGroup}
                suppliers={suppliers}
                supplierProducts={allSp}
                fruitDictionary={fruitDictionary}
                suggestedMap={suggestedMap}
                onGroupSupplierChange={handleSupplierChange}
                onChangeSupplierProduct={changeSupplierProduct}
                onDistribute={setDistributeDialog}
                onApplySuggested={applySuggested}
                isReadonly={isReadonly}
              />
            ))}
          </div>

          {/* Bottom CTA */}
          {!isReadonly && (
            <div className="mt-6 flex justify-end border-t border-line pt-4">
              <Button
                disabled={counts.unmapped > 0 || counts.suggested > 0}
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
  tone?: 'success' | 'error' | 'warning' | 'info'
}) {
  return (
    <div className="rounded-radius-md border border-line bg-card px-4 py-3">
      <div className="text-xs text-t-mute">{label}</div>
      <div
        className={cn(
          'mt-1 text-xl font-bold',
          tone === 'success' && 'text-status-success',
          tone === 'error' && 'text-status-error',
          tone === 'warning' && 'text-status-warning',
          tone === 'info' && 'text-primary',
          !tone && 'text-t-strong'
        )}
      >
        {value}
      </div>
    </div>
  )
}

function EstimatedCostCard({ groups }: { groups: AllocationGroup[] }) {
  const { total, unknownCount } = useMemo(() => {
    let sum = 0
    let unknown = 0
    for (const g of groups) {
      if (g.supplierPrice != null) {
        sum += g.supplierPrice * g.totalQuantity
      } else {
        unknown++
      }
    }
    return { total: sum, unknownCount: unknown }
  }, [groups])

  return (
    <div className="rounded-radius-md border border-line bg-card px-4 py-3">
      <div className="text-xs text-t-mute">예상 발주금액</div>
      <div className="mt-1 text-xl font-bold text-t-strong">
        {total > 0
          ? `₩${total.toLocaleString('ko-KR')}`
          : '—'}
      </div>
      {unknownCount > 0 && (
        <div className="mt-0.5 text-[11px] text-status-warning">
          가격 미확인 {unknownCount}건
        </div>
      )}
    </div>
  )
}

function SupplierPickerPopover({
  group,
  suppliers,
  supplierProducts,
  matchCandidates,
  compact,
  onSelect,
}: {
  group: AllocationGroup
  suppliers: Supplier[]
  supplierProducts: SupplierProduct[]
  matchCandidates?: MatchCandidate[]
  compact?: boolean
  onSelect: (supplierId: string, mode: 'today' | 'default') => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<'list' | 'scope'>('list')
  const [pendingSupplierId, setPendingSupplierId] = useState<string | null>(null)

  const spProductName = group.items[0]?.supplierProductName ?? group.productName

  const candidateMap = useMemo(() => {
    if (!matchCandidates) return null
    const map = new Map<string, MatchCandidate>()
    for (const mc of matchCandidates) {
      if (!map.has(mc.supplier.id)) {
        map.set(mc.supplier.id, mc)
      }
    }
    return map
  }, [matchCandidates])

  const candidates = useMemo(() => {
    const list = suppliers
      .filter((s) => s.isActive)
      .map((s) => {
        const mc = candidateMap?.get(s.id)
        const sp = mc
          ? mc.supplierProduct
          : supplierProducts.find(
              (p) => p.supplierId === s.id && p.productName === spProductName
            )
        return {
          supplier: s,
          sp,
          price: sp?.price ?? null,
          stock: sp?.stockStatus ?? ('unknown' as const),
          matchScore: mc?.score ?? null,
        }
      })

    const minPrice = Math.min(
      ...list.filter((c) => c.price != null).map((c) => c.price!)
    )

    return list
      .map((c) => ({
        ...c,
        isCheapest: c.price != null && c.price === minPrice,
        isDefault: c.supplier.id === group.supplierId,
      }))
      .filter((c) => {
        if (!search) return true
        return c.supplier.name.toLowerCase().includes(search.toLowerCase())
      })
      .sort((a, b) => {
        if (a.matchScore != null && b.matchScore != null) return b.matchScore - a.matchScore
        if (a.matchScore != null) return -1
        if (b.matchScore != null) return 1
        return 0
      })
  }, [suppliers, supplierProducts, spProductName, group.supplierId, search, candidateMap])

  const handleSelect = (supplierId: string) => {
    setPendingSupplierId(supplierId)
    setStage('scope')
  }

  const handleScope = (mode: 'today' | 'default') => {
    if (pendingSupplierId) {
      onSelect(pendingSupplierId, mode)
    }
    setOpen(false)
    setStage('list')
    setPendingSupplierId(null)
  }

  const handleScopeWithMapping = async () => {
    if (!pendingSupplierId) return
    try {
      await createAutoProductMapping({
        platform: (group.platform as 'coupang' | 'toss') ?? 'coupang',
        productName: group.productName,
        optionName: group.optionName,
        supplierId: pendingSupplierId,
      })
      toast.success('매핑이 등록되었습니다')
    } catch {
      toast.error('매핑 등록 실패')
    }
    onSelect(pendingSupplierId, 'today')
    setOpen(false)
    setStage('list')
    setPendingSupplierId(null)
  }

  const stockLabel = (stock: string) => {
    if (stock === 'available') return '재고있음'
    if (stock === 'soldout') return '품절'
    return '미확인'
  }

  const stockColor = (stock: string) => {
    if (stock === 'available') return 'text-status-success'
    if (stock === 'soldout') return 'text-status-error'
    return 'text-t-mute'
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setStage('list')
          setSearch('')
          setPendingSupplierId(null)
        }
      }}
    >
      <PopoverTrigger asChild>
        {compact ? (
          <button className="shrink-0 rounded border border-line px-2 py-1 text-xs text-t-secondary hover:bg-bg-subtle">
            변경
          </button>
        ) : (
          <button
            className={cn(
              'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-xs',
              'hover:bg-bg-subtle transition-colors',
              !group.supplierName && 'text-t-mute'
            )}
          >
            <span className="truncate" title={group.supplierName ?? undefined}>
              {group.supplierName ?? '공급처 선택'}
            </span>
            {group.supplierPrice != null && (
              <span className="ml-1.5 shrink-0 font-mono text-t-mute">
                ₩{group.supplierPrice.toLocaleString('ko-KR')}
              </span>
            )}
            <ChevronDown size={14} className="ml-1 shrink-0 text-t-mute" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[400px] p-0">
        {stage === 'list' ? (
          <div>
            <div className="border-b border-line p-2">
              <Input
                placeholder="공급처 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="max-h-[260px] overflow-y-auto p-1">
              {candidates.length === 0 ? (
                <p className="py-4 text-center text-xs text-t-mute">
                  검색 결과 없음
                </p>
              ) : (
                candidates.map((c) => (
                  <button
                    key={c.supplier.id}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-bg-subtle',
                      c.isDefault && 'bg-primary/5'
                    )}
                    onClick={() => handleSelect(c.supplier.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-t-strong">
                          {c.supplier.name}
                        </span>
                        {c.isDefault && (
                          <span className="rounded bg-primary/10 px-1 py-px text-[10px] font-medium text-primary">
                            현재
                          </span>
                        )}
                        {c.isCheapest && (
                          <span className="rounded bg-success-light px-1 py-px text-[10px] font-medium text-status-success">
                            최저가
                          </span>
                        )}
                        {c.matchScore != null && (
                          <span className="rounded bg-warning-light px-1 py-px text-[10px] font-medium text-warning-dark">
                            {(c.matchScore * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      {c.price != null ? (
                        <span className="font-mono text-t-secondary">
                          ₩{c.price.toLocaleString('ko-KR')}
                        </span>
                      ) : (
                        <span className="text-t-mute">가격없음</span>
                      )}
                      <span className={cn('text-[11px]', stockColor(c.stock))}>
                        {stockLabel(c.stock)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm font-medium text-t-strong">적용 범위</p>
            <p className="mt-1 text-xs text-t-mute">
              <strong>
                {suppliers.find((s) => s.id === pendingSupplierId)?.name}
              </strong>
              으로 변경합니다
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-xs"
                onClick={() => handleScope('today')}
              >
                오늘만 적용
              </Button>
              {group.status === 'unmapped' ? (
                <Button
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => void handleScopeWithMapping()}
                >
                  매핑 등록 + 적용
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => handleScope('default')}
                >
                  기본 매핑도 변경
                </Button>
              )}
            </div>
            <button
              className="mt-2 text-xs text-t-mute hover:text-t-secondary"
              onClick={() => {
                setStage('list')
                setPendingSupplierId(null)
              }}
            >
              ← 공급처 다시 선택
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

type GroupRowProps = {
  group: AllocationGroup
  expanded: boolean
  onToggle: (key: string) => void
  suppliers: Supplier[]
  supplierProducts: SupplierProduct[]
  fruitDictionary: import('@/types').FruitDictionary[]
  suggestedMap: Map<string, SuggestedAllocation>
  onGroupSupplierChange: (
    group: AllocationGroup,
    supplierId: string,
    mode: 'today' | 'default'
  ) => Promise<void>
  onChangeSupplierProduct: (
    orderIds: string[],
    supplierProductName: string,
    supplierProductCode?: string,
    supplierPrice?: number
  ) => Promise<void>
  onDistribute: (group: AllocationGroup) => void
  onApplySuggested: (orderIds: string[]) => Promise<void>
  isReadonly: boolean
}

const GroupRow = memo(function GroupRow({
  group,
  expanded,
  onToggle,
  suppliers,
  supplierProducts,
  fruitDictionary,
  suggestedMap,
  onGroupSupplierChange,
  onChangeSupplierProduct,
  onDistribute,
  onApplySuggested,
  isReadonly,
}: GroupRowProps) {
  const isSuggested = group.status === 'suggested'
  const topCandidate = group.topCandidate

  const handleToggle = useCallback(() => {
    onToggle(group.key)
  }, [onToggle, group.key])

  const handleSupplierChange = useCallback(
    (supplierId: string, mode: 'today' | 'default') => {
      void onGroupSupplierChange(group, supplierId, mode)
    },
    [onGroupSupplierChange, group]
  )

  const handleDistribute = useCallback(() => {
    onDistribute(group)
  }, [onDistribute, group])

  const matchCandidates = useMemo(() => {
    if (!isSuggested) return undefined
    const firstSugOrderId = group.orderIds.find((oid) => suggestedMap.has(oid))
    if (!firstSugOrderId) return undefined
    return suggestedMap.get(firstSugOrderId)!.candidates
  }, [isSuggested, group.orderIds, suggestedMap])

  return (
    <div
      className={cn(
        'rounded-radius-md border bg-card',
        isSuggested ? 'border-warning/40' : 'border-line'
      )}
    >
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={handleToggle}
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
          {group.supplierId && (
            <div
              className="mt-0.5 flex items-center gap-1 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-t-faint">발주:</span>
              <SupplierProductPickerPopover
                group={group}
                supplierProducts={supplierProducts}
                fruitDictionary={fruitDictionary}
                onSelect={(sp) => {
                  void onChangeSupplierProduct(
                    group.orderIds,
                    sp.productName,
                    sp.productCode || undefined,
                    sp.price ?? undefined
                  )
                }}
                isReadonly={isReadonly}
              />
            </div>
          )}
          <div className="mt-0.5 flex items-center gap-3 text-xs text-t-mute">
            <span>{group.orderCount}건</span>
            <span>총 {group.totalQuantity}개</span>
            {group.supplierPrice !== undefined && (
              <span className="font-mono">
                ₩{group.supplierPrice.toLocaleString('ko-KR')}
              </span>
            )}
            {group.smartAllocationApplied && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-default rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      스마트배정
                    </span>
                  </TooltipTrigger>
                  {group.allocationReason && (
                    <TooltipContent side="top">
                      <p className="text-xs">{group.allocationReason}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            {isSuggested && topCandidate && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-default rounded bg-warning-light px-1.5 py-0.5 text-[10px] font-medium text-warning-dark">
                      추천: {topCandidate.supplier.name}
                      {topCandidate.supplierProduct.price != null && (
                        <> ₩{topCandidate.supplierProduct.price.toLocaleString('ko-KR')}</>
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="text-xs">
                      <p>매칭 점수: {(topCandidate.score * 100).toFixed(0)}%</p>
                      {topCandidate.matchedAttributes.length > 0 && (
                        <p>일치: {topCandidate.matchedAttributes.join(', ')}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <StatusBadge status={group.status} />
          {isReadonly ? (
            <div className="w-[280px]">
              <span className="text-sm text-t-secondary">
                {group.supplierName ?? '미배정'}
              </span>
            </div>
          ) : isSuggested ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 shrink-0 bg-warning text-xs text-white hover:bg-warning/80"
                onClick={() => {
                  const sugOrderIds = group.orderIds.filter((oid) => suggestedMap.has(oid))
                  if (sugOrderIds.length > 0) {
                    void onApplySuggested(sugOrderIds)
                  }
                }}
              >
                {topCandidate?.supplier.name ?? '추천'} 적용
              </Button>
              <SupplierPickerPopover
                compact
                group={group}
                suppliers={suppliers}
                supplierProducts={supplierProducts}
                matchCandidates={matchCandidates}
                onSelect={handleSupplierChange}
              />
            </div>
          ) : (
            <div className="w-[280px]">
              <SupplierPickerPopover
                group={group}
                suppliers={suppliers}
                supplierProducts={supplierProducts}
                onSelect={handleSupplierChange}
              />
            </div>
          )}
          {!isReadonly && group.items.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleDistribute}
            >
              분배
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-line px-4 py-2">
          {isSuggested && topCandidate && (
            <SuggestedCandidateCards
              group={group}
              suggestedMap={suggestedMap}
            />
          )}
          {group.items.length > 0 && (
            <>
              <CandidateCards
                group={group}
                suppliers={suppliers}
                supplierProducts={supplierProducts}
              />
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
                      <td className="max-w-[300px] truncate py-1.5 text-t-mute" title={item.order.address}>
                        {item.order.address}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}, (prev, next) => {
  const pg = prev.group
  const ng = next.group
  return (
    pg.key === ng.key &&
    pg.supplierId === ng.supplierId &&
    pg.supplierName === ng.supplierName &&
    pg.supplierProductName === ng.supplierProductName &&
    pg.supplierProductCode === ng.supplierProductCode &&
    pg.supplierPrice === ng.supplierPrice &&
    pg.status === ng.status &&
    pg.orderCount === ng.orderCount &&
    pg.totalQuantity === ng.totalQuantity &&
    pg.smartAllocationApplied === ng.smartAllocationApplied &&
    pg.items.length === ng.items.length &&
    prev.expanded === next.expanded &&
    prev.suppliers === next.suppliers &&
    prev.supplierProducts === next.supplierProducts &&
    prev.fruitDictionary === next.fruitDictionary &&
    prev.suggestedMap === next.suggestedMap &&
    prev.isReadonly === next.isReadonly
  )
})

function CandidateCards({
  group,
  suppliers,
  supplierProducts,
}: {
  group: AllocationGroup
  suppliers: Supplier[]
  supplierProducts: SupplierProduct[]
}) {
  const spProductName = group.items[0]?.supplierProductName ?? group.productName

  const candidates = useMemo(() => {
    const list = suppliers
      .filter((s) => s.isActive)
      .map((s) => {
        const sp = supplierProducts.find(
          (p) => p.supplierId === s.id && p.productName === spProductName
        )
        return { supplier: s, sp }
      })
      .filter((c) => c.sp != null)

    if (list.length === 0) return []

    const minPrice = Math.min(
      ...list.filter((c) => c.sp!.price != null).map((c) => c.sp!.price!)
    )

    return list.map((c) => ({
      ...c,
      isCheapest: c.sp!.price != null && c.sp!.price === minPrice,
      isSelected: c.supplier.id === group.supplierId,
    }))
  }, [suppliers, supplierProducts, spProductName, group.supplierId])

  if (candidates.length === 0) return null

  return (
    <div className="mb-2">
      <p className="mb-1.5 text-[11px] font-medium text-t-mute">
        공급처 비교
      </p>
      <div className="flex flex-wrap gap-2">
        {candidates.map((c) => (
          <div
            key={c.supplier.id}
            className={cn(
              'rounded-md border px-3 py-2 text-xs',
              c.isSelected
                ? 'border-primary bg-primary/5'
                : 'border-line bg-card'
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-t-strong">
                {c.supplier.name}
              </span>
              {c.isSelected && (
                <span className="text-[10px] text-primary">선택됨</span>
              )}
              {c.isCheapest && (
                <span className="text-[10px] text-status-success">최저가</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-t-mute">
              {c.sp?.price != null ? (
                <span className="font-mono">
                  ₩{c.sp.price.toLocaleString('ko-KR')}
                </span>
              ) : (
                <span>가격없음</span>
              )}
              <span
                className={cn(
                  c.sp?.stockStatus === 'available' && 'text-status-success',
                  c.sp?.stockStatus === 'soldout' && 'text-status-error'
                )}
              >
                {c.sp?.stockStatus === 'available'
                  ? '재고있음'
                  : c.sp?.stockStatus === 'soldout'
                    ? '품절'
                    : '미확인'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SuggestedCandidateCards({
  group,
  suggestedMap,
}: {
  group: AllocationGroup
  suggestedMap: Map<string, SuggestedAllocation>
}) {
  const candidates = useMemo(() => {
    const firstSugOrderId = group.orderIds.find((oid) => suggestedMap.has(oid))
    if (!firstSugOrderId) return []
    const sug = suggestedMap.get(firstSugOrderId)!
    return sug.candidates.slice(0, 5)
  }, [group.orderIds, suggestedMap])

  if (candidates.length === 0) return null

  return (
    <div className="mb-2">
      <p className="mb-1.5 text-[11px] font-medium text-t-mute">
        추천 후보 비교 (속성 매칭)
      </p>
      <div className="flex flex-wrap gap-2">
        {candidates.map((c, idx) => (
          <div
            key={c.supplier.id}
            className={cn(
              'rounded-md border px-3 py-2 text-xs',
              idx === 0
                ? 'border-warning/40 bg-warning-light'
                : 'border-line bg-card'
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-t-strong">
                {c.supplier.name}
              </span>
              {idx === 0 && (
                <span className="text-[10px] text-warning-dark">1순위</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-t-mute">
              <span className="font-mono">
                점수: {(c.score * 100).toFixed(0)}%
              </span>
              {c.supplierProduct.price != null && (
                <span className="font-mono">
                  ₩{c.supplierProduct.price.toLocaleString('ko-KR')}
                </span>
              )}
            </div>
            {c.matchedAttributes.length > 0 && (
              <div className="mt-0.5 text-[10px] text-t-faint">
                {c.matchedAttributes.join(' / ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SupplierProductPickerPopover({
  group,
  supplierProducts,
  fruitDictionary,
  onSelect,
  isReadonly,
}: {
  group: AllocationGroup
  supplierProducts: SupplierProduct[]
  fruitDictionary: import('@/types').FruitDictionary[]
  onSelect: (sp: SupplierProduct) => void
  isReadonly: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const forSupplier = useMemo(() => {
    if (!group.supplierId) return []
    return supplierProducts.filter((sp) => sp.supplierId === group.supplierId)
  }, [supplierProducts, group.supplierId])

  const scored = useMemo(() => {
    const attrs = fruitDictionary.length > 0
      ? extractAttributes(group.productName, group.optionName, fruitDictionary, true)
      : null

    return forSupplier.map((sp) => {
      let score = 0
      if (attrs && attrs.fruit && fruitDictionary.length > 0) {
        const spAttrs = extractAttributes(sp.productName, '', fruitDictionary)
        if (spAttrs.fruit === attrs.fruit) {
          score = 0.4
          if (attrs.weight && spAttrs.weight && attrs.weight === spAttrs.weight) score += 0.25
          if (attrs.grade && spAttrs.grade && attrs.grade === spAttrs.grade) score += 0.2
          if (attrs.size && spAttrs.size && attrs.size === spAttrs.size) score += 0.15
        }
      }
      return { sp, score, isSelected: sp.productName === group.supplierProductName }
    })
  }, [forSupplier, fruitDictionary, group.productName, group.optionName, group.supplierProductName])

  const filtered = useMemo(() => {
    let list = scored
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((item) => item.sp.productName.toLowerCase().includes(q))
    }
    return list.sort((a, b) => {
      if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1
      return b.score - a.score
    })
  }, [scored, search])

  const relatedCount = scored.filter((s) => s.score > 0).length

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch('') }}>
      <PopoverTrigger asChild>
        <button
          className="max-w-[400px] truncate text-left text-xs text-primary hover:underline"
          disabled={isReadonly}
          title={group.supplierProductName}
        >
          {group.supplierProductName}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[440px] p-0">
        <div className="border-b border-line px-3 py-2">
          <p className="text-xs font-medium text-t-strong">발주 상품 변경</p>
          <p className="mt-0.5 text-[11px] text-t-mute">
            {relatedCount > 0 ? `관련 상품 ${relatedCount}개` : '전체'} · {group.supplierName}
          </p>
        </div>
        <div className="border-b border-line p-2">
          <Input
            placeholder="상품명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-t-mute">검색 결과 없음</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.sp.id}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-bg-subtle',
                  item.isSelected && 'bg-primary/5'
                )}
                onClick={() => {
                  onSelect(item.sp)
                  setOpen(false)
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('font-medium', item.score > 0 ? 'text-t-strong' : 'text-t-secondary')}>
                      {item.sp.productName}
                    </span>
                    {item.isSelected && (
                      <span className="shrink-0 rounded bg-primary/10 px-1 py-px text-[10px] font-medium text-primary">
                        현재
                      </span>
                    )}
                    {item.score >= 0.6 && !item.isSelected && (
                      <span className="shrink-0 rounded bg-success-light px-1 py-px text-[10px] font-medium text-status-success">
                        추천
                      </span>
                    )}
                  </div>
                  {item.sp.productCode && (
                    <span className="mt-0.5 block text-[10px] text-t-faint">
                      {item.sp.productCode}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-right">
                  {item.sp.price != null ? (
                    <span className="font-mono text-t-secondary">
                      ₩{item.sp.price.toLocaleString('ko-KR')}
                    </span>
                  ) : (
                    <span className="text-t-mute">가격없음</span>
                  )}
                  <span className={cn(
                    'text-[11px]',
                    item.sp.stockStatus === 'available' && 'text-status-success',
                    item.sp.stockStatus === 'soldout' && 'text-status-error',
                    !item.sp.stockStatus && 'text-t-mute'
                  )}>
                    {item.sp.stockStatus === 'available' ? '재고' : item.sp.stockStatus === 'soldout' ? '품절' : ''}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StatusBadge({ status }: { status: 'auto' | 'edited' | 'unmapped' | 'suggested' }) {
  if (status === 'auto') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-xs font-medium text-success-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        자동배정
      </span>
    )
  }
  if (status === 'suggested') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2 py-0.5 text-xs font-medium text-warning-dark">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        추천
      </span>
    )
  }
  if (status === 'edited') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        수정됨
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-error-light px-2 py-0.5 text-xs font-medium text-error-dark">
      <AlertCircle size={11} />
      미분류
    </span>
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
