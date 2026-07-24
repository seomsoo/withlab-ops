import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Check,
  AlertCircle,
  X,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TrackingMatchSkeleton } from '@/components/ui/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TrackingTabs } from '@/components/TrackingTabs'
import { SupplierProgressChips } from '@/components/SupplierProgressChips'
import {
  Dialog,
  DialogContent,
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

import { useWorkSession } from '@/hooks/useWorkSession'
import { useTrackingMatch } from '@/hooks/useTrackingMatch'
import { getAllocations } from '@/lib/supabase/allocations'
import {
  getTrackingImports,
  bulkIgnoreTrackings,
  getSupplierTrackingProgress,
} from '@/lib/supabase/trackings'
import { getCourierMappings } from '@/lib/supabase/courierMappings'
import { convertCourierName } from '@/lib/matching/courierConverter'

import { cn } from '@/lib/utils'

import type { TrackingStatus, CourierMapping } from '@/types'
import type { AllocationWithOrder } from '@/lib/supabase/allocations'
import type { SupplierTrackingProgress } from '@/lib/supabase/trackings'

function extractFromRaw(raw: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = raw[k]
    if (v != null && v !== '') return String(v)
  }
  return ''
}

const PRODUCT_NAME_KEYS = ['상품명', '품목명', '품명', '제품명']
const RECIPIENT_KEYS = ['수령인', '수취인', '받는분', '받는사람']

type FilterTab = TrackingStatus | 'all'

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'matched', label: '매칭됨' },
  { id: 'unmatched', label: '미매칭' },
  { id: 'duplicated', label: '중복' },
  { id: 'invalid', label: '오류' },
]

export default function TrackingMatchResult() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { session, loading: sessionLoading } = useWorkSession(sessionId!)
  const {
    trackings,
    stats,
    isLoading,
    filteredTrackings,
    filter,
    setFilter,
    manualMatch,
    overwriteMatch,
    checkExistingMatch,
    refetch,
  } = useTrackingMatch(sessionId!)

  const [manualMatchTarget, setManualMatchTarget] = useState<string | null>(null)
  const [allocations, setAllocations] = useState<AllocationWithOrder[]>([])
  const [allocsLoading, setAllocsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [overwriteConfirm, setOverwriteConfirm] = useState<{
    trackingId: string
    allocationId: string
  } | null>(null)

  const [hasImports, setHasImports] = useState(false)
  const [courierMappings, setCourierMappings] = useState<CourierMapping[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [supplierProgress, setSupplierProgress] = useState<SupplierTrackingProgress[]>([])
  const [supplierFilter, setSupplierFilter] = useState('all')

  useEffect(() => {
    void getTrackingImports(sessionId!).then((imports) => {
      setHasImports(imports.length > 0)
    }).catch(() => { /* 보조 데이터 — 실패해도 페이지 동작에 영향 없음 */ })
    void getCourierMappings().then(setCourierMappings).catch(() => {})
    void getSupplierTrackingProgress(sessionId!).then(setSupplierProgress).catch(() => {})
  }, [sessionId])

  const handleBulkIgnoreInvalid = async () => {
    const invalidIds = trackings
      .filter((t) => t.status === 'invalid' && !t.ignored)
      .map((t) => t.id)
    if (invalidIds.length === 0) return
    try {
      setBulkProcessing(true)
      await bulkIgnoreTrackings(invalidIds, '무효 건 일괄 건너뛰기')
      await refetch()
      toast.success(`무효 ${invalidIds.length}건을 건너뛰었습니다`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '처리 실패')
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleBulkIgnoreDuplicated = async () => {
    const duplicatedIds = trackings
      .filter((t) => t.status === 'duplicated' && !t.ignored)
      .map((t) => t.id)
    if (duplicatedIds.length === 0) return
    try {
      setBulkProcessing(true)
      await bulkIgnoreTrackings(duplicatedIds, '중복 건 일괄 건너뛰기')
      await refetch()
      toast.success(`중복 ${duplicatedIds.length}건을 건너뛰었습니다`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '처리 실패')
    } finally {
      setBulkProcessing(false)
    }
  }

  const displayedTrackings = useMemo(() => {
    if (supplierFilter === 'all') return filteredTrackings
    return filteredTrackings.filter((t) => t.sourceSupplierId === supplierFilter)
  }, [filteredTrackings, supplierFilter])

  const uniqueSupplierIds = useMemo(() => {
    const ids = new Set(trackings.map((t) => t.sourceSupplierId))
    return [...ids]
  }, [trackings])

  const displayStats = useMemo(() => {
    if (supplierFilter === 'all') return stats
    const filtered = trackings.filter((t) => t.sourceSupplierId === supplierFilter)
    const result = { total: 0, matched: 0, unmatched: 0, duplicated: 0, invalid: 0 }
    for (const t of filtered) {
      result.total++
      result[t.status]++
    }
    return result
  }, [trackings, supplierFilter, stats])

  const unmappedCourierCount = useMemo(() => {
    if (courierMappings.length === 0) return 0
    const matchedOnes = trackings.filter((t) => t.status === 'matched' && t.trackingCompany)
    let count = 0
    for (const t of matchedOnes) {
      const result = convertCourierName(t.trackingCompany, 'coupang', courierMappings)
      if (!result.isMapped) count++
    }
    return count
  }, [trackings, courierMappings])

  const isCompleted = session?.status === 'completed'

  const canOpenMatch = hasImports || stats.total > 0
  const canOpenDownload = stats.matched > 0

  const openManualMatch = async (trackingId: string) => {
    setManualMatchTarget(trackingId)
    setSearchQuery('')
    try {
      setAllocsLoading(true)
      const tracking = trackings.find((t) => t.id === trackingId)
      const data = await getAllocations(sessionId!)
      const filtered = tracking
        ? data.filter((a) => a.supplierId === tracking.sourceSupplierId)
        : data
      setAllocations(filtered)
    } catch {
      toast.error('주문 조회 실패')
    } finally {
      setAllocsLoading(false)
    }
  }

  const handleSelectAllocation = async (allocationId: string) => {
    if (!manualMatchTarget) return

    const existing = checkExistingMatch(allocationId)
    if (existing) {
      setOverwriteConfirm({ trackingId: manualMatchTarget, allocationId })
      return
    }

    try {
      await manualMatch(manualMatchTarget, allocationId)
      setManualMatchTarget(null)
    } catch {
      // handled in hook
    }
  }

  const handleOverwriteConfirm = async () => {
    if (!overwriteConfirm) return
    try {
      await overwriteMatch(overwriteConfirm.trackingId, overwriteConfirm.allocationId)
      setManualMatchTarget(null)
      setOverwriteConfirm(null)
    } catch {
      // handled in hook
    }
  }

  const filteredAllocations = useMemo(() => {
    if (!searchQuery.trim()) return allocations
    const q = searchQuery.toLowerCase()
    return allocations.filter(
      (a) =>
        a.order.matchingKey.toLowerCase().includes(q) ||
        a.order.recipientName.toLowerCase().includes(q) ||
        a.order.productName.toLowerCase().includes(q)
    )
  }, [allocations, searchQuery])

  if (sessionLoading || isLoading) {
    return (
      <>
        <PageHeader title="매칭 결과" />
        <TrackingMatchSkeleton />
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <PageHeader
        title="운송장 매칭 결과"
        actions={
          <Link to="/tracking" className="text-sm text-primary hover:underline">
            작업건 변경
          </Link>
        }
      />

      <div className="space-y-5">
        <TrackingTabs
          sessionId={sessionId!}
          currentTab="match"
          canOpenMatch={canOpenMatch}
          canOpenDownload={canOpenDownload}
        />

        {unmappedCourierCount > 0 && (
          <div className="flex items-center gap-2 rounded-radius-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              택배사 매핑이 되지 않은 운송장이 <strong>{unmappedCourierCount}건</strong> 있습니다.{' '}
              <Link to="/mapping?tab=courier" className="font-medium underline">
                택배사 매핑 관리
              </Link>
              에서 매핑을 추가해 주세요.
            </span>
          </div>
        )}

        <SupplierProgressChips progress={supplierProgress} />

        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard tone="primary" label="매칭됨" value={displayStats.matched} hint={displayStats.total > 0 ? `전체의 ${Math.round((displayStats.matched / displayStats.total) * 100)}%` : ''} icon={<Check size={16} />} />
          <StatCard tone="warning" label="미매칭" value={displayStats.unmatched} hint="수동 매칭 필요" icon={<AlertCircle size={16} />} />
          <StatCard tone="amber" label="중복" value={displayStats.duplicated} hint="둘 중 하나 선택" icon={<AlertTriangle size={16} />} />
          <StatCard tone="error" label="오류" value={displayStats.invalid} hint="형식/누락" icon={<X size={16} />} />
        </div>

        {/* 필터 바 + 벌크 액션 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {FILTER_TABS.map((tab) => {
              const count =
                tab.id === 'all' ? displayStats.total : displayStats[tab.id as TrackingStatus]
              return (
                <button
                  key={tab.id}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    filter === tab.id
                      ? 'bg-primary text-white'
                      : 'bg-bg-subtle text-t-secondary hover:bg-gray-200'
                  )}
                  onClick={() => setFilter(tab.id as FilterTab)}
                >
                  {tab.label}
                  <span className={cn(
                    'text-xs',
                    filter === tab.id ? 'text-white/80' : 'text-t-mute'
                  )}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            {uniqueSupplierIds.length > 1 && (
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 공급처</SelectItem>
                  {supplierProgress.map((sp) => (
                    <SelectItem key={sp.supplierId} value={sp.supplierId}>
                      {sp.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isCompleted && (stats.invalid > 0 || stats.duplicated > 0) && (
              <>
                {stats.invalid > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkProcessing}
                    onClick={() => void handleBulkIgnoreInvalid()}
                  >
                    무효 건 전체 건너뛰기
                  </Button>
                )}
                {stats.duplicated > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkProcessing}
                    onClick={() => void handleBulkIgnoreDuplicated()}
                  >
                    중복 건 전체 건너뛰기
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 테이블 */}
        <div className="rounded-radius-md border border-line bg-card shadow-level-1 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">상태</TableHead>
                {uniqueSupplierIds.length > 1 && <TableHead>공급처</TableHead>}
                <TableHead>매칭번호</TableHead>
                <TableHead>상품명 / 수취인</TableHead>
                <TableHead>택배사</TableHead>
                <TableHead>운송장번호 / 사유</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedTrackings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={uniqueSupplierIds.length > 1 ? 7 : 6} className="py-12 text-center text-t-mute">
                    해당하는 운송장이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                displayedTrackings.map((t) => (
                  <TableRow key={t.id} className={cn(
                    t.status === 'unmatched' && 'bg-amber-50/30 dark:bg-amber-950/20',
                    t.status === 'invalid' && 'bg-red-50/30 dark:bg-red-950/20',
                    t.ignored && 'opacity-40'
                  )}>
                    <TableCell>
                      <StatusPill status={t.status} />
                    </TableCell>
                    {uniqueSupplierIds.length > 1 && (
                      <TableCell className="text-sm">
                        {supplierProgress.find((sp) => sp.supplierId === t.sourceSupplierId)?.supplierName ?? '-'}
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs">
                      {t.rawOrderKey || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{extractFromRaw(t.raw, PRODUCT_NAME_KEYS) || '-'}</div>
                      <div className="text-xs text-t-mute">{extractFromRaw(t.raw, RECIPIENT_KEYS)}</div>
                    </TableCell>
                    <TableCell>
                      {t.trackingCompany || '-'}
                    </TableCell>
                    <TableCell>
                      {t.status === 'matched' || t.status === 'duplicated' ? (
                        <span className="font-mono text-xs">{t.trackingNumber}</span>
                      ) : (
                        <span className="text-xs text-amber-600">
                          {t.invalidReason ?? '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {t.status === 'unmatched' && !isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void openManualMatch(t.id)}
                        >
                          수동 매칭
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 하단 CTA */}
      <div className="sticky bottom-0 mt-6 flex items-center justify-between border-t border-line bg-card px-6 py-4">
        <div className="text-sm">
          {stats.unmatched + stats.duplicated + stats.invalid > 0 ? (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle size={16} />
              처리되지 않은 항목이 {stats.unmatched + stats.duplicated + stats.invalid}건 있어요
            </span>
          ) : stats.matched > 0 ? (
            <span className="flex items-center gap-1 text-green-700">
              <Check size={16} />
              모든 운송장이 정상 매칭되었어요
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/tracking/${sessionId}/upload`)}
          >
            <ChevronLeft size={14} />
            이전
          </Button>
          <Button
            disabled={stats.matched === 0}
            onClick={() => navigate(`/tracking/${sessionId}/download`)}
          >
            다음: 플랫폼 파일 다운로드
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* 수동 매칭 모달 */}
      <Dialog open={!!manualMatchTarget} onOpenChange={(open) => { if (!open) setManualMatchTarget(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>수동 매칭</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-t-mute" />
              <Input
                className="pl-9"
                placeholder="매칭번호 또는 수취인 이름으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {allocsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-radius-md border border-line">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>매칭번호</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>수취인</TableHead>
                      <TableHead>공급처</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-t-mute">
                          검색 결과가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAllocations.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs">
                            {a.order.matchingKey}
                          </TableCell>
                          <TableCell className="text-sm">{a.order.productName}</TableCell>
                          <TableCell>{a.order.recipientName}</TableCell>
                          <TableCell className="text-sm">{a.supplierName}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleSelectAllocation(a.id)}
                            >
                              연결
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!overwriteConfirm}
        onOpenChange={(open) => { if (!open) setOverwriteConfirm(null) }}
        title="이 주문에 이미 운송장이 연결되어 있습니다"
        description="기존 운송장을 대체하시겠습니까? 기존 운송장은 '중복' 상태로 변경됩니다."
        confirmText="대체하기"
        onConfirm={handleOverwriteConfirm}
      />
    </>
  )
}

function StatCard({
  tone,
  label,
  value,
  hint,
  icon,
}: {
  tone: string
  label: string
  value: number
  hint: string
  icon: React.ReactNode
}) {
  const iconColors: Record<string, string> = {
    primary: 'text-primary',
    warning: 'text-amber-500 dark:text-amber-400',
    amber: 'text-orange-500 dark:text-orange-400',
    error: 'text-red-500 dark:text-red-400',
  }
  const valueColors: Record<string, string> = {
    primary: 'text-primary',
    warning: 'text-amber-600 dark:text-amber-300',
    amber: 'text-orange-600 dark:text-orange-300',
    error: 'text-red-600 dark:text-red-300',
  }
  return (
    <div className="rounded-radius-md border border-line bg-card p-4">
      <div className={cn('flex items-center gap-2 text-xs font-medium', iconColors[tone])}>
        {icon} <span className="text-t-mute">{label}</span>
      </div>
      <div className={cn('mt-1 text-2xl font-bold', valueColors[tone])}>
        {value.toLocaleString()}
        <span className="text-sm font-normal text-t-mute">건</span>
      </div>
      <div className="mt-0.5 text-xs text-t-faint">{hint}</div>
    </div>
  )
}

function StatusPill({ status }: { status: TrackingStatus }) {
  const config: Record<TrackingStatus, { label: string; className: string }> = {
    matched: { label: '매칭됨', className: 'border border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300' },
    unmatched: { label: '미매칭', className: 'border border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300' },
    duplicated: { label: '중복', className: 'border border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-300' },
    invalid: { label: '오류', className: 'border border-red-200 text-red-700 dark:border-red-800 dark:text-red-300' },
  }
  const c = config[status]
  return (
    <Badge className={cn('whitespace-nowrap text-xs', c.className)} variant="outline">
      {c.label}
    </Badge>
  )
}
