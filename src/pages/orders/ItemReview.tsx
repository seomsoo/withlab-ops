import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ChevronRight,
  SkipForward,
  Info,
  CircleCheck,
  Clock,
  TrendingUp,
  DollarSign,
} from 'lucide-react'

import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { OrderTabs } from '@/components/OrderTabs'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useWorkSession } from '@/hooks/useWorkSession'
import { useItemReview } from '@/hooks/useItemReview'
import { switchDefaultSupplier } from '@/lib/supabase/productMappings'
import { cn } from '@/lib/utils'

import type { SupplierRecommendation, RecommendReason } from '@/types'

const REASON_CONFIG: Record<
  RecommendReason,
  { label: string; icon: typeof CircleCheck; className: string }
> = {
  default: {
    label: '기본',
    icon: CircleCheck,
    className: 'text-primary',
  },
  yesterday: {
    label: '전날',
    icon: Clock,
    className: 'text-status-success',
  },
  frequency: {
    label: '최다',
    icon: TrendingUp,
    className: 'text-warning-dark',
  },
  lowest_price: {
    label: '최저가',
    icon: DollarSign,
    className: 'text-status-error',
  },
}

export default function ItemReview() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { session, loading: sessionLoading } = useWorkSession(sessionId)
  const {
    items,
    suppliers,
    loading,
    selectSupplier,
    toggleSaveAsDefault,
    getKeywordOverrides,
    getDefaultSaveTargets,
  } = useItemReview(sessionId ?? '')

  const handleStartAllocation = useCallback(async () => {
    const saveTargets = getDefaultSaveTargets()
    if (saveTargets.length > 0) {
      try {
        for (const target of saveTargets) {
          await switchDefaultSupplier({
            platform: 'common',
            productName: target.keyword,
            optionName: '',
            newSupplierId: target.supplierId,
          })
        }
        toast.success(`${saveTargets.length}개 품목 기본 매핑 저장`)
      } catch (err) {
        console.error('기본 매핑 저장 실패:', err)
        toast.error('일부 기본 매핑 저장에 실패했습니다')
      }
    }

    const overrides = getKeywordOverrides()
    const params = new URLSearchParams()
    if (overrides.size > 0) {
      const obj: Record<string, string> = {}
      for (const [k, v] of overrides) {
        obj[k] = v
      }
      params.set('overrides', JSON.stringify(obj))
    }

    const query = params.toString()
    navigate(
      `/orders/${sessionId}/allocation${query ? `?${query}` : ''}`
    )
  }, [sessionId, navigate, getKeywordOverrides, getDefaultSaveTargets])

  const handleSkip = useCallback(() => {
    navigate(`/orders/${sessionId}/allocation`)
  }, [sessionId, navigate])

  if (sessionLoading || loading) return <PageSkeleton />
  if (!session || !sessionId) return null

  const isReadonly = session.status !== 'active'
  const totalOrders = items.reduce((sum, i) => sum + i.orderCount, 0)
  const totalQty = items.reduce((sum, i) => sum + i.totalQuantity, 0)
  const selectedCount = items.filter((i) => i.selectedSupplierId).length

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-6 py-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-bold text-t-primary">품목 검토</h1>
          <p className="mt-1 text-sm text-t-secondary">
            품목별 공급처를 빠르게 선택하고 배정을 시작합니다
          </p>
        </div>
        <span className="rounded-radius-md bg-bg-subtle px-3 py-1.5 text-sm font-medium text-t-secondary">
          {session.name}
        </span>
      </div>

      <OrderTabs
        sessionId={sessionId}
        activeTab="review"
        completedTabs={isReadonly ? ['upload', 'review', 'assign', 'download'] : ['upload']}
      />

      <div className="rounded-radius-lg border border-line bg-card p-5 shadow-level-1">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-t-primary">
            오늘의 주문 요약
          </h2>
          <span className="text-xs text-t-mute">
            {selectedCount}/{items.length} 선택됨
          </span>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-radius-md bg-bg-subtle px-4 py-3">
            <p className="text-2xl font-bold text-t-primary">{items.length}</p>
            <p className="mt-0.5 text-xs text-t-mute">품목</p>
          </div>
          <div className="rounded-radius-md bg-bg-subtle px-4 py-3">
            <p className="text-2xl font-bold text-t-primary">{totalOrders.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-t-mute">건</p>
          </div>
          <div className="rounded-radius-md bg-bg-subtle px-4 py-3">
            <p className="text-2xl font-bold text-t-primary">{totalQty.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-t-mute">박스</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-t-mute">
            업로드된 주문이 없습니다
          </div>
        ) : (
          <div className="overflow-hidden rounded-radius-md border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-bg-subtle">
                  <th className="px-4 py-2.5 text-left font-semibold text-t-secondary w-12">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-t-secondary">
                    품목
                  </th>
                  <th className="px-5 py-2.5 text-right font-semibold text-t-secondary w-24">
                    건수
                  </th>
                  <th className="px-5 py-2.5 text-right font-semibold text-t-secondary w-24">
                    수량
                  </th>
                  <th className="px-5 py-2.5 text-center font-semibold text-t-secondary w-20">
                    플랫폼
                  </th>
                  <th className="pl-8 pr-5 py-2.5 text-left font-semibold text-t-secondary min-w-[260px]">
                    공급처
                  </th>
                  <th className="px-4 py-2.5 text-center font-semibold text-t-secondary w-24">
                    기본 저장
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <ItemRow
                    key={item.keyword}
                    item={item}
                    index={idx + 1}
                    suppliers={suppliers}
                    onSelectSupplier={selectSupplier}
                    onToggleSaveAsDefault={toggleSaveAsDefault}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-xs text-t-mute">
          <Info size={14} />
          <span>
            미선택 품목은 미분류로 표시되며, 공급처 배정에서 수동 또는 자동 배정할 수 있습니다
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={handleSkip} className="gap-1.5">
          <SkipForward size={16} />
          건너뛰기
        </Button>
        <Button onClick={handleStartAllocation} className="gap-1.5">
          배정 시작
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

type ItemRowProps = {
  item: import('@/types').ItemSummary
  index: number
  suppliers: import('@/types').Supplier[]
  onSelectSupplier: (keyword: string, supplierId: string | null) => void
  onToggleSaveAsDefault: (keyword: string, save: boolean) => void
}

function ItemRow({
  item,
  index,
  suppliers,
  onSelectSupplier,
  onToggleSaveAsDefault,
}: ItemRowProps) {
  const recommendedIds = new Set(item.recommendations.map((r) => r.supplierId))
  const otherSuppliers = suppliers.filter((s) => !recommendedIds.has(s.id))
  const hasSelection = item.selectedSupplierId !== null
  const changed =
    hasSelection &&
    item.recommendations.length > 0 &&
    item.selectedSupplierId !== item.recommendations[0]?.supplierId

  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-bg-subtle/50 transition-colors">
      <td className="px-4 py-3 text-t-mute font-medium">{index}</td>
      <td className="px-4 py-3 font-medium text-t-primary">{item.keyword}</td>
      <td className="px-5 py-3 text-right tabular-nums text-t-secondary">
        {item.orderCount.toLocaleString()}건
      </td>
      <td className="px-5 py-3 text-right tabular-nums text-t-secondary">
        {item.totalQuantity.toLocaleString()}
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-center gap-1">
          {item.platforms.map((p) => (
            <span
              key={p}
              className={cn(
                'inline-block rounded px-1.5 py-0.5 text-[10px] font-bold',
                p === 'coupang'
                  ? 'bg-[#FFF0E6] text-[#C2410C]'
                  : 'bg-[#E8F0FE] text-[#1A56DB]'
              )}
            >
              {p === 'coupang' ? '쿠' : '토'}
            </span>
          ))}
        </div>
      </td>
      <td className="pl-8 pr-5 py-3">
        <div className="flex items-center gap-2">
          <Select
            value={item.selectedSupplierId ?? 'auto'}
            onValueChange={(val) =>
              onSelectSupplier(item.keyword, val === 'auto' ? null : val)
            }
          >
            <SelectTrigger className="h-8 w-[220px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.recommendations.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-t-mute">
                    추천
                  </SelectLabel>
                  {item.recommendations.map((rec) => (
                    <RecommendedItem key={rec.supplierId} rec={rec} />
                  ))}
                </SelectGroup>
              )}
              {item.recommendations.length > 0 && otherSuppliers.length > 0 && (
                <SelectSeparator />
              )}
              {otherSuppliers.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-t-mute">
                    전체
                  </SelectLabel>
                  {otherSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              <SelectSeparator />
              <SelectItem value="auto" className="text-xs text-t-mute">
                미배정
              </SelectItem>
            </SelectContent>
          </Select>
          {hasSelection && (
            <ReasonBadge recommendations={item.recommendations} selectedId={item.selectedSupplierId!} />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        {changed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <Checkbox
                    checked={item.saveAsDefault}
                    onCheckedChange={(checked) =>
                      onToggleSaveAsDefault(item.keyword, checked === true)
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">이 공급처를 기본으로 저장</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </td>
    </tr>
  )
}

function RecommendedItem({ rec }: { rec: SupplierRecommendation }) {
  const config = REASON_CONFIG[rec.reason]
  const Icon = config.icon

  return (
    <SelectItem value={rec.supplierId} className="text-xs">
      <span className="flex items-center gap-1.5">
        {rec.supplierName}
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium',
            config.className
          )}
        >
          <Icon size={10} />
          {config.label}
          {rec.detail && (
            <span className="text-t-mute ml-0.5">{rec.detail}</span>
          )}
        </span>
      </span>
    </SelectItem>
  )
}

function ReasonBadge({
  recommendations,
  selectedId,
}: {
  recommendations: SupplierRecommendation[]
  selectedId: string
}) {
  const rec = recommendations.find((r) => r.supplierId === selectedId)
  if (!rec) return null

  const config = REASON_CONFIG[rec.reason]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium',
        config.className
      )}
    >
      <Icon size={10} />
      {config.label}
    </span>
  )
}
