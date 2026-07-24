import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Upload,
  Check,
  AlertCircle,
  Copy,
  ChevronRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Plus,
  Replace,
  Trash2,
  FilePlus2,
} from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { OrderUploadSkeleton } from '@/components/ui/PageSkeleton'
import { PlatformBadge } from '@/components/PlatformBadge'
import { OrderTabs } from '@/components/OrderTabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { useWorkSession } from '@/hooks/useWorkSession'
import { useOrderUpload } from '@/hooks/useOrderUpload'

import { cn } from '@/lib/utils'

import type { UploadPlan } from '@/hooks/useOrderUpload'
import type { Platform, StandardOrder } from '@/types'

const ITEMS_PER_PAGE = 20

const TAB_ITEMS = [
  { id: 'upload', label: '주문 업로드', step: '1' },
  { id: 'review', label: '품목 검토', step: '2' },
  { id: 'assign', label: '공급처 배정', step: '3' },
  { id: 'download', label: '발주서 다운로드', step: '4' },
] as const

export default function OrderUpload() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { session, loading: sessionLoading, error: sessionError } =
    useWorkSession(sessionId)
  const upload = useOrderUpload(sessionId ?? '')

  const [pendingPlan, setPendingPlan] = useState<UploadPlan | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [uploading, setUploading] = useState<Platform | null>(null)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorModalTab, setErrorModalTab] = useState<'invalid' | 'duplicate'>('invalid')
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all')
  const [page, setPage] = useState(1)

  const isReadonly = session?.status !== 'active'

  const handleFileSelect = useCallback(
    async (file: File, expectedPlatform?: Platform) => {
      try {
        setUploading(expectedPlatform ?? 'coupang')
        const plan = expectedPlatform
          ? await upload.prepareUpload(file, expectedPlatform)
          : await upload.prepareUploadAutoDetect(file)
        if (plan.existingImports.length > 0) {
          setPendingPlan(plan)
          setConfirmOpen(true)
        } else {
          await upload.commitUpload(plan)
        }
      } catch (err) {
        if (err instanceof Error) {
          toast.error(err.message)
        }
      } finally {
        setUploading(null)
      }
    },
    [upload]
  )

  const handleConfirmAction = useCallback(async (mode: 'replace' | 'append' | 'separate') => {
    if (!pendingPlan) return
    try {
      setUploading(pendingPlan.platform)
      if (mode === 'append') {
        await upload.commitUpload(pendingPlan, { appendExisting: true })
      } else if (mode === 'separate') {
        await upload.commitUpload(pendingPlan, { addSeparate: true })
      } else {
        await upload.commitUpload(pendingPlan, { replaceExisting: true })
      }
    } catch {
      // toast handled by hook
    } finally {
      setUploading(null)
      setPendingPlan(null)
      setConfirmOpen(false)
    }
  }, [pendingPlan, upload])

  const filteredOrders = useMemo(() => {
    let filtered = upload.orders
    if (platformFilter !== 'all') {
      filtered = filtered.filter((o) => o.platform === platformFilter)
    }
    return filtered.sort((a, b) => {
      if (a.platform !== b.platform) {
        return a.platform === 'coupang' ? -1 : 1
      }
      return a.rawRowNumber - b.rawRowNumber
    })
  }, [upload.orders, platformFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE))
  const pageOrders = filteredOrders.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  if (sessionLoading || upload.loading) {
    return (
      <OrderUploadSkeleton />
    )
  }

  if (sessionError || !session) {
    navigate('/orders', { replace: true })
    return null
  }

  const allInvalidRows = [
    ...(upload.parseResult.coupang?.invalidRows ?? []),
    ...(upload.parseResult.toss?.invalidRows ?? []),
  ]
  const allDuplicateRows = [
    ...(upload.parseResult.coupang?.duplicateRows ?? []),
    ...(upload.parseResult.toss?.duplicateRows ?? []),
  ]
  const hasUploads =
    upload.coupangImport || upload.tossImport ||
    upload.parseResult.coupang || upload.parseResult.toss

  return (
    <>
      <PageHeader title="발주서 작성" />

      {/* Session info + tabs */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link
            to="/orders"
            className="text-sm text-primary hover:text-primary-hover font-medium"
          >
            ← 작업건 변경
          </Link>
          <span className="text-t-faint">·</span>
          <span className="text-[15px] font-bold text-t-strong">
            {session.name}
          </span>
        </div>

        {isReadonly && sessionId ? (
          <OrderTabs
            sessionId={sessionId}
            activeTab="upload"
            completedTabs={['upload', 'review', 'assign', 'download']}
          />
        ) : (
          <div className="flex gap-1 rounded-radius-md border border-line bg-card p-1.5 shadow-level-1">
            {TAB_ITEMS.map((tab) => {
              const active = tab.id === 'upload'
              return (
                <button
                  key={tab.id}
                  className={cn(
                    'flex flex-1 items-center gap-2.5 rounded-[8px] px-3.5 py-2.5 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary-50 text-primary'
                      : 'text-t-mute cursor-not-allowed'
                  )}
                  disabled={!active}
                >
                  <span
                    className={cn(
                      'grid h-[22px] w-[22px] place-items-center rounded-full text-xs font-bold',
                      active ? 'bg-primary text-white' : 'bg-gray-200 text-t-mute'
                    )}
                  >
                    {tab.step}
                  </span>
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Readonly banner */}
      {isReadonly && (
        <div className="mb-4 rounded-radius-md border border-warning-dark/20 bg-warning-light px-4 py-3 text-sm font-medium text-warning-dark">
          {session.status === 'ordered'
            ? '발주 완료된 작업건은 주문을 변경할 수 없습니다'
            : '완료된 작업건은 수정할 수 없습니다'}
        </div>
      )}

      {/* Unified Upload Zone */}
      <div className="mb-4">
        <UnifiedDropZone
          coupangImport={upload.coupangImport}
          tossImport={upload.tossImport}
          coupangImports={upload.coupangImports}
          tossImports={upload.tossImports}
          uploading={uploading !== null}
          disabled={isReadonly}
          onFileSelect={(file) => handleFileSelect(file)}
          onPlatformFileSelect={(file, platform) => handleFileSelect(file, platform)}
          onDelete={(platform) => upload.removeImport(platform)}
          onDeleteById={(id) => upload.removeImportById(id)}
        />
      </div>

      {/* Summary cards */}
      {hasUploads && (
        <div className="mb-4 rounded-radius-lg border border-line bg-card p-6 shadow-level-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold text-t-mute tracking-wide">
                파싱 결과
              </div>
              <div className="text-lg font-bold tracking-tight mt-0.5">
                {upload.parseResult.coupang && upload.parseResult.toss
                  ? `쿠팡 ${upload.parseResult.coupang.meta.validRows}건 + 토스 ${upload.parseResult.toss.meta.validRows}건 = 총 ${upload.summary.total}건 · ${upload.summary.productCount}개 품목`
                  : `총 ${upload.summary.total}건 · ${upload.summary.productCount}개 품목`}
              </div>
            </div>
            {upload.summary.invalid > 0 && (
              <button
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover"
                onClick={() => {
                  setErrorModalTab('invalid')
                  setErrorModalOpen(true)
                }}
              >
                오류 내역 보기
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCell
              tone="success"
              label="정상"
              value={upload.summary.valid}
              icon={<Check size={16} />}
            />
            <SummaryCell
              tone="error"
              label="오류"
              value={upload.summary.invalid}
              icon={<AlertCircle size={16} />}
              onClick={
                upload.summary.invalid > 0
                  ? () => {
                      setErrorModalTab('invalid')
                      setErrorModalOpen(true)
                    }
                  : undefined
              }
            />
            <SummaryCell
              tone="warning"
              label="중복"
              value={upload.summary.duplicate}
              icon={<Copy size={16} />}
              onClick={
                upload.summary.duplicate > 0
                  ? () => {
                      setErrorModalTab('duplicate')
                      setErrorModalOpen(true)
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Orders table */}
      {hasUploads ? (
        <div className="rounded-radius-lg border border-line bg-card shadow-level-1 overflow-x-auto">
          <div className="flex items-start justify-between px-6 py-5">
            <div>
              <div className="text-base font-bold tracking-tight">
                업로드된 주문{' '}
                <span className="text-t-mute font-medium ml-1">
                  {filteredOrders.length}건
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'coupang', 'toss'] as const).map((f) => (
                <button
                  key={f}
                  className={cn(
                    'rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-colors',
                    platformFilter === f
                      ? 'bg-primary-50 text-primary'
                      : 'bg-gray-100 text-t-mid hover:bg-gray-200'
                  )}
                  onClick={() => {
                    setPlatformFilter(f)
                    setPage(1)
                  }}
                >
                  {f === 'all' ? '전체' : f === 'coupang' ? '쿠팡' : '토스'}
                </button>
              ))}
            </div>
          </div>

          <OrdersTable orders={pageOrders} />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-line px-6 py-3">
              <button
                className="rounded p-1 text-t-mid hover:bg-gray-100 disabled:opacity-30"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-t-mid">
                {page} / {totalPages}
              </span>
              <button
                className="rounded p-1 text-t-mid hover:bg-gray-100 disabled:opacity-30"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-radius-lg border border-line bg-card py-16 text-center shadow-level-1">
          <div className="text-base font-bold tracking-tight">
            플랫폼 엑셀을 업로드하면 주문 목록이 표시돼요
          </div>
          <div className="mt-1.5 text-sm text-t-mute">
            한쪽만 있어도 진행은 가능하지만, 누락 검증을 위해 함께 올리는 걸
            권장해요.
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="sticky bottom-0 z-10 -mx-10 mt-6 flex items-center justify-between border-t border-line bg-card/90 px-10 py-4 backdrop-blur-sm">
        <div className="text-sm">
          {upload.summary.invalid > 0 ? (
            <span className="flex items-center gap-1.5 font-semibold text-warning">
              <AlertCircle size={16} />
              오류 {upload.summary.invalid}건이 있어요. 그대로 진행하면 해당 건은
              제외됩니다.
            </span>
          ) : upload.summary.valid > 0 ? (
            <span className="flex items-center gap-1.5 font-medium text-t-mid">
              <Check size={16} className="text-success" />
              정상 {upload.summary.valid}건이 다음 단계로 넘어갑니다.
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/orders')}
          >
            취소
          </Button>
          <Button
            disabled={upload.summary.valid === 0}
            onClick={() => {
              if (sessionId) navigate(`/orders/${sessionId}/review`)
            }}
            className="gap-1.5"
          >
            다음: 품목 검토
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Replace, Append, or Separate dialog */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!uploading) { setConfirmOpen(v); if (!v) setPendingPlan(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              이미 {pendingPlan?.platform === 'coupang' ? '쿠팡' : '토스'} 주문이 있어요
            </DialogTitle>
            <p className="text-sm text-t-mid mt-1">
              기존 {pendingPlan?.existingImports.reduce((s, i) => s + i.validCount, 0) ?? 0}건 + 새 파일 {pendingPlan?.parseResult.meta.validRows ?? 0}건
            </p>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <button
              className="flex items-start gap-4 rounded-xl border-2 border-primary/30 bg-primary/[0.03] px-5 py-4 text-left transition-colors hover:border-primary hover:bg-primary/[0.06] disabled:opacity-50"
              disabled={uploading !== null}
              onClick={() => handleConfirmAction('append')}
            >
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                <Plus size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-t-strong">
                  합치기
                  {uploading !== null && pendingPlan && (
                    <span className="ml-2 inline-flex items-center text-xs font-medium text-primary">
                      처리 중...
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-t-mid leading-relaxed">
                  기존 주문은 유지하고, 새 파일의 주문을 추가해요.
                  <br />
                  <span className="text-t-faint">중복 주문은 자동으로 걸러져요.</span>
                </div>
              </div>
            </button>
            <button
              className="flex items-start gap-4 rounded-xl border-2 border-line bg-card px-5 py-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.02] disabled:opacity-50"
              disabled={uploading !== null}
              onClick={() => handleConfirmAction('separate')}
            >
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/5">
                <FilePlus2 size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-t-strong">별도 파일</div>
                <div className="mt-0.5 text-xs text-t-mid leading-relaxed">
                  다른 계정의 주문으로 추가해요. 운송장 다운로드 시 분리됩니다.
                </div>
              </div>
            </button>
            <button
              className="flex items-start gap-4 rounded-xl border-2 border-line bg-card px-5 py-4 text-left transition-colors hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/30 disabled:opacity-50"
              disabled={uploading !== null}
              onClick={() => handleConfirmAction('replace')}
            >
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 dark:bg-red-950/40">
                <Replace size={20} className="text-red-500" />
              </div>
              <div>
                <div className="text-sm font-bold text-t-strong">교체하기</div>
                <div className="mt-0.5 text-xs text-t-mid leading-relaxed">
                  기존 {pendingPlan?.existingImports.reduce((s, i) => s + i.validCount, 0) ?? 0}건을 삭제하고, 새 파일로 대체해요.
                  {(pendingPlan?.existingImports.length ?? 0) > 1 && (
                    <span className="block mt-0.5 text-red-500 font-medium">
                      기존 파일 {pendingPlan?.existingImports.length}개가 모두 삭제됩니다.
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setConfirmOpen(false); setPendingPlan(null) }}
              disabled={uploading !== null}
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error/Duplicate modal */}
      <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {errorModalTab === 'invalid'
                ? `오류 행 (${allInvalidRows.length}건)`
                : `중복 행 (${allDuplicateRows.length}건)`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-3">
            <button
              className={cn(
                'rounded-[8px] px-3 py-1.5 text-xs font-semibold',
                errorModalTab === 'invalid'
                  ? 'bg-error-light text-error'
                  : 'bg-gray-100 text-t-mid'
              )}
              onClick={() => setErrorModalTab('invalid')}
            >
              오류 ({allInvalidRows.length})
            </button>
            <button
              className={cn(
                'rounded-[8px] px-3 py-1.5 text-xs font-semibold',
                errorModalTab === 'duplicate'
                  ? 'bg-warning-light text-warning'
                  : 'bg-gray-100 text-t-mid'
              )}
              onClick={() => setErrorModalTab('duplicate')}
            >
              중복 ({allDuplicateRows.length})
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {errorModalTab === 'invalid' ? (
              allInvalidRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-t-mute">
                  오류 행이 없습니다
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-gray-50 text-left text-xs font-semibold text-t-mute">
                      <th className="px-4 py-2">행 번호</th>
                      <th className="px-4 py-2">사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInvalidRows.map((r, i) => (
                      <tr key={i} className="border-b border-line">
                        <td className="px-4 py-2 font-mono text-xs">
                          {r.rowNumber}
                        </td>
                        <td className="px-4 py-2">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : allDuplicateRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-t-mute">
                중복 행이 없습니다
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-gray-50 text-left text-xs font-semibold text-t-mute">
                    <th className="px-4 py-2">행 번호</th>
                    <th className="px-4 py-2">매칭키</th>
                    <th className="px-4 py-2">최초 행</th>
                  </tr>
                </thead>
                <tbody>
                  {allDuplicateRows.map((r, i) => (
                    <tr key={i} className="border-b border-line">
                      <td className="px-4 py-2 font-mono text-xs">
                        {r.rowNumber}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {r.matchingKey}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {r.firstRowNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Sub-components ---

function UnifiedDropZone({
  coupangImport,
  tossImport,
  coupangImports,
  tossImports,
  uploading,
  disabled,
  onFileSelect,
  onPlatformFileSelect,
  onDelete,
  onDeleteById,
}: {
  coupangImport: import('@/types').OrderImport | null
  tossImport: import('@/types').OrderImport | null
  coupangImports: import('@/types').OrderImport[]
  tossImports: import('@/types').OrderImport[]
  uploading: boolean
  disabled: boolean
  onFileSelect: (file: File) => void
  onPlatformFileSelect: (file: File, platform: Platform) => void
  onDelete: (platform: Platform) => void
  onDeleteById: (id: string) => void
}) {
  const inputId = 'file-unified'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  const hasAny = coupangImport || tossImport

  return (
    <div className="rounded-radius-lg border border-line bg-card p-5 shadow-level-1">
      {uploading ? (
        <div className="flex flex-col items-center gap-2 rounded-radius-md border border-line bg-gray-50 px-6 py-8">
          <LoadingSpinner />
          <div className="text-sm font-semibold text-t-strong">
            파일 분석 중…
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-radius-md border-[1.5px] border-dashed border-line-strong bg-gray-50 px-6 py-6 text-center transition-colors',
              !disabled && 'hover:border-primary hover:bg-primary-50'
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => {
              if (!disabled) document.getElementById(inputId)?.click()
            }}
          >
            <div className="grid h-11 w-11 place-items-center rounded-radius-md bg-primary-50 text-primary">
              <Upload size={20} />
            </div>
            <div className="text-sm font-semibold text-t-strong">
              주문 엑셀 파일을 끌어다 놓거나 클릭
            </div>
            <div className="text-xs text-t-mute">
              쿠팡 / 토스 파일을 자동 감지합니다 · .xlsx, .xls · 최대 10MB
            </div>
            <input
              id={inputId}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleChange}
              className="hidden"
              disabled={disabled}
            />
          </div>

          {hasAny && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {coupangImports.length > 0
                ? coupangImports.map((imp) => (
                    <ImportStatus
                      key={imp.id}
                      platform="coupang"
                      label={coupangImports.length > 1 ? imp.label : '쿠팡'}
                      orderImport={imp}
                      disabled={disabled}
                      onReupload={(file) => onPlatformFileSelect(file, 'coupang')}
                      onDelete={() => onDeleteById(imp.id)}
                    />
                  ))
                : (
                  <ImportStatus
                    platform="coupang"
                    label="쿠팡"
                    orderImport={null}
                    disabled={disabled}
                    onReupload={(file) => onPlatformFileSelect(file, 'coupang')}
                    onDelete={() => onDelete('coupang')}
                  />
                )}
              {tossImports.length > 0
                ? tossImports.map((imp) => (
                    <ImportStatus
                      key={imp.id}
                      platform="toss"
                      label={tossImports.length > 1 ? imp.label : '토스'}
                      orderImport={imp}
                      disabled={disabled}
                      onReupload={(file) => onPlatformFileSelect(file, 'toss')}
                      onDelete={() => onDeleteById(imp.id)}
                    />
                  ))
                : (
                  <ImportStatus
                    platform="toss"
                    label="토스"
                    orderImport={null}
                    disabled={disabled}
                    onReupload={(file) => onPlatformFileSelect(file, 'toss')}
                    onDelete={() => onDelete('toss')}
                  />
                )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ImportStatus({
  platform,
  label,
  orderImport,
  disabled,
  onReupload,
  onDelete,
}: {
  platform: Platform
  label: string
  orderImport: import('@/types').OrderImport | null
  disabled: boolean
  onReupload: (file: File) => void
  onDelete: () => void
}) {
  const inputId = `file-re-${platform}`

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onReupload(file)
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-3 rounded-radius-md bg-gray-50 px-3 py-2.5">
      <PlatformBadge platform={platform} />
      {orderImport ? (
        <>
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-xs font-semibold" title={orderImport.fileName}>
              {orderImport.fileName}
            </div>
            <div className="text-[11px] text-t-mute">
              {orderImport.validCount}건
            </div>
          </div>
          {!disabled && (
            <div className="flex shrink-0 items-center gap-2">
              <label
                htmlFor={inputId}
                className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
              >
                <RefreshCw size={12} /> 교체
                <input
                  id={inputId}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleChange}
                  className="hidden"
                />
              </label>
              <button
                className="flex items-center gap-1 text-xs font-semibold text-t-mute hover:text-error"
                onClick={onDelete}
              >
                <Trash2 size={12} /> 삭제
              </button>
            </div>
          )}
        </>
      ) : (
        <span className="text-xs text-t-mute">{label} 미업로드</span>
      )}
    </div>
  )
}

function SummaryCell({
  tone,
  label,
  value,
  icon,
  onClick,
}: {
  tone: 'success' | 'error' | 'warning'
  label: string
  value: number
  icon: React.ReactNode
  onClick?: () => void
}) {
  const toneClasses = {
    success: {
      icon: 'bg-success-light text-success',
      value: 'text-t-strong',
    },
    error: {
      icon: 'bg-error-light text-error',
      value: 'text-error',
    },
    warning: {
      icon: 'bg-warning-light text-warning',
      value: 'text-warning',
    },
  }[tone]

  return (
    <div
      className={cn(
        'rounded-radius-md border border-line bg-gray-50 px-5 py-[18px]',
        onClick && 'cursor-pointer hover:bg-gray-100'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={cn(
            'grid h-6 w-6 place-items-center rounded-[6px]',
            toneClasses.icon
          )}
        >
          {icon}
        </span>
        <span className="text-[13px] font-semibold text-t-mid">{label}</span>
      </div>
      <div className={cn('text-[28px] font-bold tracking-tight', toneClasses.value)}>
        {value.toLocaleString()}
        <span className="ml-1 text-sm font-semibold text-t-mute">건</span>
      </div>
    </div>
  )
}

function OrdersTable({ orders }: { orders: StandardOrder[] }) {
  return (
    <table className="min-w-[800px] w-full text-[13px]">
      <thead>
        <tr className="border-t border-line bg-gray-50 text-left text-xs font-semibold tracking-wide text-t-mute">
          <th className="px-6 py-3">플랫폼</th>
          <th className="whitespace-nowrap px-4 py-3">매칭번호</th>
          <th className="px-4 py-3">상품명</th>
          <th className="px-4 py-3">옵션</th>
          <th className="px-4 py-3 text-center">수량</th>
          <th className="px-4 py-3">수취인</th>
          <th className="px-4 py-3">주소</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className="border-t border-line hover:bg-gray-50">
            <td className="px-6 py-3">
              <PlatformBadge platform={o.platform} />
            </td>
            <td className="px-4 py-3 font-mono text-xs">{o.matchingKey}</td>
            <td className="max-w-[200px] truncate px-4 py-3 font-semibold" title={o.productName}>
              {o.productName}
            </td>
            <td className="max-w-[150px] truncate px-4 py-3 text-t-mute" title={o.optionName}>
              {o.optionName}
            </td>
            <td className="px-4 py-3 text-center">
              <span className="inline-block rounded-[6px] bg-gray-100 px-2.5 py-[3px] text-[13px] font-semibold">
                {o.quantity}
                <span className="ml-0.5 text-xs text-t-mute font-medium">개</span>
              </span>
            </td>
            <td className="px-4 py-3 font-medium">{o.recipientName}</td>
            <td className="max-w-[200px] truncate px-4 py-3 text-t-mid">
              {o.address}
            </td>
          </tr>
        ))}
        {orders.length === 0 && (
          <tr>
            <td colSpan={7} className="px-6 py-12 text-center text-sm text-t-mute">
              표시할 주문이 없습니다
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
