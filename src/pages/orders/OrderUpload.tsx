import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Copy,
  ChevronRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PlatformBadge } from '@/components/PlatformBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useWorkSession } from '@/hooks/useWorkSession'
import { useOrderUpload } from '@/hooks/useOrderUpload'

import { cn } from '@/lib/utils'

import type { UploadPlan } from '@/hooks/useOrderUpload'
import type { Platform, StandardOrder } from '@/types'

const ITEMS_PER_PAGE = 20

const TAB_ITEMS = [
  { id: 'upload', label: '주문 업로드', step: '1' },
  { id: 'assign', label: '공급처 배정', step: '2' },
  { id: 'download', label: '발주서 다운로드', step: '3' },
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
    async (file: File, expectedPlatform: Platform) => {
      try {
        setUploading(expectedPlatform)
        const plan = await upload.prepareUpload(file, expectedPlatform)
        if (plan.existingImport) {
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

  const handleConfirmReplace = useCallback(async () => {
    if (!pendingPlan) return
    try {
      setUploading(pendingPlan.platform)
      await upload.commitUpload(pendingPlan, { replaceExisting: true })
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
      <>
        <PageHeader title="발주서" />
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </>
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

        <div className="flex gap-1 rounded-radius-md border border-line bg-card p-1.5 shadow-level-1">
          {TAB_ITEMS.map((tab, i) => {
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
                onClick={() => {
                  if (tab.id === 'assign' && sessionId) {
                    navigate(`/orders/${sessionId}/allocation`)
                  }
                }}
              >
                <span
                  className={cn(
                    'grid h-[22px] w-[22px] place-items-center rounded-full text-xs font-bold',
                    active ? 'bg-primary text-white' : 'bg-gray-200 text-t-mute'
                  )}
                >
                  {i > 0 && i < TAB_ITEMS.indexOf(TAB_ITEMS.find((t) => t.id === 'upload')!) ? (
                    <Check size={14} />
                  ) : (
                    tab.step
                  )}
                </span>
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Readonly banner */}
      {isReadonly && (
        <div className="mb-4 rounded-radius-md border border-warning-dark/20 bg-warning-light px-4 py-3 text-sm font-medium text-warning-dark">
          {session.status === 'ordered'
            ? '발주 완료된 작업건은 주문을 변경할 수 없습니다'
            : '완료된 작업건은 수정할 수 없습니다'}
        </div>
      )}

      {/* Upload cards */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <UploadCard
          platform="coupang"
          label="쿠팡 주문 엑셀"
          orderImport={upload.coupangImport}
          uploading={uploading === 'coupang'}
          disabled={isReadonly}
          onFileSelect={(file) => handleFileSelect(file, 'coupang')}
        />
        <UploadCard
          platform="toss"
          label="토스 주문 엑셀"
          orderImport={upload.tossImport}
          uploading={uploading === 'toss'}
          disabled={isReadonly}
          onFileSelect={(file) => handleFileSelect(file, 'toss')}
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
                총 {upload.summary.total}건이 인식되었어요
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
        <div className="rounded-radius-lg border border-line bg-card shadow-level-1 overflow-hidden">
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
              if (sessionId) navigate(`/orders/${sessionId}/allocation`)
            }}
            className="gap-1.5"
          >
            다음: 공급처 배정
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Replace confirm dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="기존 주문 데이터 교체"
        description={
          pendingPlan?.existingImport
            ? `기존 ${pendingPlan.platform === 'coupang' ? '쿠팡' : '토스'} 주문 데이터 ${pendingPlan.existingImport.validCount}건이 삭제되고 새 파일로 대체됩니다. 계속하시겠습니까?`
            : undefined
        }
        confirmText="교체"
        variant="destructive"
        loading={uploading !== null}
        onConfirm={handleConfirmReplace}
      />

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

type UploadCardProps = {
  platform: Platform
  label: string
  orderImport: import('@/types').OrderImport | null
  uploading: boolean
  disabled: boolean
  onFileSelect: (file: File) => void
}

function UploadCard({
  platform,
  label,
  orderImport,
  uploading,
  disabled,
  onFileSelect,
}: UploadCardProps) {
  const inputId = `file-${platform}`

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

  return (
    <div className="rounded-radius-lg border border-line bg-card p-5 shadow-level-1">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            'grid h-9 w-9 place-items-center rounded-[10px]',
            platform === 'coupang' ? 'bg-platform-coupang-bg' : 'bg-platform-toss-bg'
          )}
        >
          <FileText
            size={18}
            className={
              platform === 'coupang'
                ? 'text-platform-coupang-text'
                : 'text-platform-toss-text'
            }
          />
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-bold tracking-tight">{label}</div>
          <div className="text-xs text-t-mute mt-0.5">
            .xlsx, .xls · 최대 10MB
          </div>
        </div>
        {orderImport && (
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-success-light px-2 py-1 text-[11px] font-semibold text-success-dark">
            <Check size={12} /> 업로드 완료
          </span>
        )}
      </div>

      {uploading ? (
        <div className="flex flex-col items-center gap-2 rounded-radius-md border border-line bg-gray-50 px-6 py-8">
          <LoadingSpinner />
          <div className="text-sm font-semibold text-t-strong">
            파일 분석 중…
          </div>
        </div>
      ) : orderImport ? (
        <div className="flex items-center gap-3 rounded-radius-md bg-gray-50 px-4 py-3.5">
          <div className="grid h-9 w-9 place-items-center rounded-[8px] border border-line bg-card text-primary">
            <FileText size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate font-mono text-[13px] font-semibold">
              {orderImport.fileName}
            </div>
            <div className="text-xs text-t-mute mt-0.5">
              {orderImport.validCount}건 인식
            </div>
          </div>
          {!disabled && (
            <label
              htmlFor={inputId}
              className="flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary-hover"
            >
              <RefreshCw size={14} /> 다시 업로드
              <input
                id={inputId}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-radius-md border-[1.5px] border-dashed border-line-strong bg-gray-50 px-6 py-8 text-center transition-colors',
            !disabled && 'hover:border-primary hover:bg-primary-50'
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled) {
              document.getElementById(inputId)?.click()
            }
          }}
        >
          <div className="grid h-11 w-11 place-items-center rounded-radius-md bg-primary-50 text-primary">
            <Upload size={20} />
          </div>
          <div className="text-sm font-semibold text-t-strong">
            엑셀 파일을 끌어다 놓거나 클릭해서 업로드
          </div>
          <div className="text-xs text-t-mute">
            {platform === 'coupang'
              ? '쿠팡 WING > 주문관리 > 엑셀 다운로드'
              : '토스 셀러 > 주문 > 엑셀 일괄 다운로드'}
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
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-t border-line bg-gray-50 text-left text-xs font-semibold tracking-wide text-t-mute">
          <th className="px-6 py-3">플랫폼</th>
          <th className="px-4 py-3">주문번호</th>
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
            <td className="max-w-[200px] truncate px-4 py-3 font-semibold">
              {o.productName}
            </td>
            <td className="max-w-[150px] truncate px-4 py-3 text-t-mute">
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
