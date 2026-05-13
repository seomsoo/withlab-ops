import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUpload } from '@/components/ui/FileUpload'
import { PlatformLogo } from '@/components/PlatformLogo'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
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

import { useSuppliers } from '@/hooks/useSuppliers'

import { readExcelFile } from '@/utils/excel'
import { downloadBlob, buildTrackingExportFileName } from '@/utils/download'
import { detectPlatform } from '@/lib/parsers/platformDetector'
import { parseCoupangOrders } from '@/lib/parsers/coupangParser'
import { parseTossOrders } from '@/lib/parsers/tossParser'
import { parseTracking } from '@/lib/parsers/trackingParser'
import { runDirectMatching } from '@/lib/matching/directMatcher'
import { convertCourierName } from '@/lib/matching/courierConverter'
import { generateTrackingExportExcel } from '@/lib/generators/trackingExportGenerator'
import { getCourierMappings } from '@/lib/supabase/courierMappings'
import {
  getPlatformTemplate,
  downloadPlatformTemplateFile,
} from '@/lib/supabase/platformTemplates'

import { cn } from '@/lib/utils'

import type { Platform, StandardOrder, CourierMapping } from '@/types'
import type { DirectMatchingResult } from '@/lib/matching/directMatcher'

type SimpleOrderFile = {
  id: string
  platform: Platform
  label: string
  fileName: string
  orders: StandardOrder[]
  errorMessage?: string
}

type SimpleTrackingFile = {
  id: string
  supplierId: string
  supplierName: string
  fileName: string
  matchingResult: DirectMatchingResult
}

type Step = 1 | 2 | 3

const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: '주문 업로드' },
  { step: 2, label: '운송장 업로드' },
  { step: 3, label: '결과 확인' },
]

function generateLabel(platform: Platform, existing: SimpleOrderFile[]): string {
  const prefix = platform === 'coupang' ? '쿠팡' : '토스'
  const existingLabels = existing
    .filter((f) => f.platform === platform)
    .map((f) => f.label)
  let n = existingLabels.length + 1
  while (existingLabels.includes(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}

export default function SimpleTracking() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [orderFiles, setOrderFiles] = useState<SimpleOrderFile[]>([])
  const [trackingFiles, setTrackingFiles] = useState<SimpleTrackingFile[]>([])
  const [parsing, setParsing] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [trackingParsing, setTrackingParsing] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadedPlatforms, setDownloadedPlatforms] = useState<Set<string>>(
    new Set()
  )

  const { suppliers } = useSuppliers()

  const hasData = orderFiles.length > 0 || trackingFiles.length > 0

  useEffect(() => {
    if (!hasData) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasData])

  const allOrders = useMemo(
    () => orderFiles.flatMap((f) => f.orders),
    [orderFiles]
  )

  const totalMatched = useMemo(
    () => trackingFiles.reduce((sum, f) => sum + f.matchingResult.matched.length, 0),
    [trackingFiles]
  )
  const totalUnmatched = useMemo(
    () => trackingFiles.reduce((sum, f) => sum + f.matchingResult.unmatched.length, 0),
    [trackingFiles]
  )
  const totalDuplicated = useMemo(
    () => trackingFiles.reduce((sum, f) => sum + f.matchingResult.duplicated.length, 0),
    [trackingFiles]
  )
  const totalInvalid = useMemo(
    () => trackingFiles.reduce((sum, f) => sum + f.matchingResult.invalid.length, 0),
    [trackingFiles]
  )

  const matchedByPlatform = useMemo(() => {
    const result: Record<Platform, { count: number; labels: Set<string> }> = {
      coupang: { count: 0, labels: new Set() },
      toss: { count: 0, labels: new Set() },
    }
    for (const tf of trackingFiles) {
      for (const m of tf.matchingResult.matched) {
        const platform = m.order.platform
        result[platform].count++
        const orderFile = orderFiles.find((f) =>
          f.orders.some((o) => o.id === m.order.id)
        )
        if (orderFile) {
          result[platform].labels.add(orderFile.label)
        }
      }
    }
    return result
  }, [trackingFiles, orderFiles])

  const handleOrderFileUpload = useCallback(
    async (file: File) => {
      setParsing(true)
      try {
        const workbook = await readExcelFile(file)
        const platform = detectPlatform(workbook)
        if (!platform) {
          toast.error('지원하지 않는 엑셀 형식입니다')
          return
        }

        const parseResult =
          platform === 'coupang'
            ? parseCoupangOrders(workbook)
            : parseTossOrders(workbook)

        if (parseResult.orders.length === 0) {
          const newFile: SimpleOrderFile = {
            id: crypto.randomUUID(),
            platform,
            label: generateLabel(platform, orderFiles),
            fileName: file.name,
            orders: [],
            errorMessage: '데이터 행이 없습니다',
          }
          setOrderFiles((prev) => [...prev, newFile])
          return
        }

        const newFile: SimpleOrderFile = {
          id: crypto.randomUUID(),
          platform,
          label: generateLabel(platform, orderFiles),
          fileName: file.name,
          orders: parseResult.orders,
        }
        setOrderFiles((prev) => [...prev, newFile])
        toast.success(
          `${platform === 'coupang' ? '쿠팡' : '토스'} ${parseResult.orders.length}건 파싱됨`
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '파일 파싱 실패')
      } finally {
        setParsing(false)
      }
    },
    [orderFiles]
  )

  const removeOrderFile = useCallback((id: string) => {
    setOrderFiles((prev) => prev.filter((f) => f.id !== id))
    if (trackingFiles.length > 0) {
      setTrackingFiles([])
      toast.info('주문 데이터가 변경되어 운송장 매칭 결과를 초기화했습니다')
    }
  }, [trackingFiles.length])

  const handleTrackingFileUpload = useCallback(
    async (file: File) => {
      if (!selectedSupplierId) {
        toast.error('공급처를 먼저 선택해 주세요')
        return
      }
      const supplier = suppliers.find((s) => s.id === selectedSupplierId)
      if (!supplier) return

      setTrackingParsing(true)
      try {
        const workbook = await readExcelFile(file)
        const parseResult = parseTracking(workbook)

        if (parseResult.trackings.length === 0) {
          toast.error('운송장 데이터가 없습니다')
          return
        }

        const alreadyMatchedOrderIds = new Set(
          trackingFiles.flatMap((tf) => tf.matchingResult.matched.map((m) => m.orderId))
        )
        const result = runDirectMatching({
          parsedTrackings: parseResult.trackings,
          orders: allOrders,
          alreadyMatchedOrderIds,
        })

        const newFile: SimpleTrackingFile = {
          id: crypto.randomUUID(),
          supplierId: selectedSupplierId,
          supplierName: supplier.name,
          fileName: file.name,
          matchingResult: result,
        }

        setTrackingFiles((prev) => [...prev, newFile])
        setSelectedSupplierId('')

        const label = `매칭 ${result.matched.length}건`
        if (result.unmatched.length > 0) {
          toast.warning(`${label}, 미매칭 ${result.unmatched.length}건`)
        } else {
          toast.success(label)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '운송장 파싱 실패')
      } finally {
        setTrackingParsing(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSupplierId, suppliers, allOrders]
  )

  const removeTrackingFile = useCallback((id: string) => {
    setTrackingFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleDownload = useCallback(
    async (platform: Platform, filterLabel?: string) => {
      const key = filterLabel ? `${platform}:${filterLabel}` : platform
      setDownloading(key)
      try {
        const template = await getPlatformTemplate(platform)
        if (!template) {
          throw new Error('운송장 양식을 먼저 등록해 주세요')
        }

        const mappings = await getCourierMappings()

        const allMatched = trackingFiles.flatMap((tf) =>
          tf.matchingResult.matched.map((m) => ({
            ...m,
            supplierId: tf.supplierId,
          }))
        )

        const platformMatched = allMatched.filter((m) => {
          if (m.order.platform !== platform) return false
          if (!filterLabel) return true
          const orderFile = orderFiles.find((f) =>
            f.orders.some((o) => o.id === m.order.id)
          )
          return orderFile?.label === filterLabel
        })

        if (platformMatched.length === 0) {
          throw new Error('출력할 매칭된 운송장이 없습니다')
        }

        const items = platformMatched.map((m) => {
          const converted = convertCourierName(
            m.trackingCompany,
            m.supplierId,
            platform,
            mappings as CourierMapping[]
          )
          return {
            trackingId: m.rawRowNumber.toString(),
            allocationId: '',
            orderId: m.orderId,
            orderNo: m.order.orderNo,
            orderItemNo: m.order.orderItemNo,
            matchingKey: m.order.matchingKey,
            trackingCompany: converted.name,
            trackingNumber: m.trackingNumber,
            courierMapped: converted.isMapped,
            originalRow: m.order.raw,
            originalRowValues: m.order.rawValues,
            originalRowNumber: m.order.rawRowNumber,
          }
        })

        const exportPayload = {
          id: crypto.randomUUID(),
          platform,
          createdAt: new Date().toISOString(),
          items,
        }

        const templateBlob = await downloadPlatformTemplateFile(
          template.templatePath
        )
        const resultBlob = await generateTrackingExportExcel(
          exportPayload,
          template,
          templateBlob
        )

        const suffix = filterLabel ? `_${filterLabel}` : ''
        const fileName = buildTrackingExportFileName(platform).replace(
          '.xlsx',
          `${suffix}.xlsx`
        )
        downloadBlob(resultBlob, fileName)

        setDownloadedPlatforms((prev) => new Set(prev).add(key))
        toast.success('운송장 파일을 다운로드했습니다')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '다운로드 실패')
      } finally {
        setDownloading(null)
      }
    },
    [trackingFiles, orderFiles]
  )

  const handleReset = useCallback(() => {
    setOrderFiles([])
    setTrackingFiles([])
    setCurrentStep(1)
    setSelectedSupplierId('')
    setDownloading(null)
    setDownloadedPlatforms(new Set())
  }, [])

  const canGoToStep2 =
    orderFiles.length > 0 && orderFiles.some((f) => f.orders.length > 0)
  const canGoToStep3 = totalMatched > 0

  return (
    <div>
      <PageHeader
        title="간편 운송장"
        description="주문 엑셀과 운송장 엑셀만으로 바로 매칭합니다"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tracking">
              <ChevronLeft size={16} className="mr-1" />
              작업건 목록
            </Link>
          </Button>
        }
      />

      <StepIndicator
        currentStep={currentStep}
        completedSteps={[
          ...(canGoToStep2 ? ([1] as Step[]) : []),
          ...(canGoToStep3 ? ([2] as Step[]) : []),
        ]}
        onStepClick={(step) => {
          if (step < currentStep) setCurrentStep(step)
        }}
      />

      <div className="mt-6">
        {currentStep === 1 && (
          <Step1OrderUpload
            orderFiles={orderFiles}
            parsing={parsing}
            onFileUpload={handleOrderFileUpload}
            onRemove={removeOrderFile}
            onNext={() => setCurrentStep(2)}
            canNext={canGoToStep2}
          />
        )}
        {currentStep === 2 && (
          <Step2TrackingUpload
            suppliers={suppliers}
            selectedSupplierId={selectedSupplierId}
            onSupplierChange={setSelectedSupplierId}
            trackingFiles={trackingFiles}
            trackingParsing={trackingParsing}
            onFileUpload={handleTrackingFileUpload}
            onRemove={removeTrackingFile}
            onPrev={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
            canNext={canGoToStep3}
            totalMatched={totalMatched}
            totalUnmatched={totalUnmatched}
            totalDuplicated={totalDuplicated}
            totalInvalid={totalInvalid}
          />
        )}
        {currentStep === 3 && (
          <Step3Results
            trackingFiles={trackingFiles}
            matchedByPlatform={matchedByPlatform}
            totalMatched={totalMatched}
            totalUnmatched={totalUnmatched}
            totalDuplicated={totalDuplicated}
            totalInvalid={totalInvalid}
            downloading={downloading}
            downloadedPlatforms={downloadedPlatforms}
            onDownload={handleDownload}
            onReset={handleReset}
            onPrev={() => setCurrentStep(2)}
          />
        )}
      </div>
    </div>
  )
}

type StepIndicatorProps = {
  currentStep: Step
  completedSteps: Step[]
  onStepClick: (step: Step) => void
}

function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map(({ step, label }, idx) => {
        const isCompleted = completedSteps.includes(step)
        const isCurrent = step === currentStep
        const isClickable = step < currentStep

        return (
          <div key={step} className="flex items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(step)}
              className={cn(
                'flex items-center gap-2',
                isClickable && 'cursor-pointer'
              )}
            >
              <div
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-full text-xs font-semibold transition-colors',
                  isCurrent && 'bg-primary text-white',
                  isCompleted && !isCurrent && 'bg-primary text-white',
                  !isCurrent && !isCompleted && 'bg-gray-200 text-t-mute'
                )}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={14} />
                ) : (
                  step
                )}
              </div>
              <span
                className={cn(
                  'text-sm',
                  isCurrent && 'font-semibold text-t-strong',
                  isCompleted && !isCurrent && 'font-medium text-primary',
                  !isCurrent && !isCompleted && 'text-t-mute'
                )}
              >
                {label}
              </span>
            </button>

            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-4 h-px w-16',
                  isCompleted ? 'bg-primary' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

type Step1Props = {
  orderFiles: SimpleOrderFile[]
  parsing: boolean
  onFileUpload: (file: File) => void
  onRemove: (id: string) => void
  onNext: () => void
  canNext: boolean
}

function Step1OrderUpload({
  orderFiles,
  parsing,
  onFileUpload,
  onRemove,
  onNext,
  canNext,
}: Step1Props) {
  const coupangCount = orderFiles
    .filter((f) => f.platform === 'coupang')
    .reduce((sum, f) => sum + f.orders.length, 0)
  const tossCount = orderFiles
    .filter((f) => f.platform === 'toss')
    .reduce((sum, f) => sum + f.orders.length, 0)

  return (
    <div className="space-y-4">
      {orderFiles.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-t-mute">
            플랫폼 주문 엑셀을 업로드해 주세요. 쿠팡, 토스 파일을 함께 올릴 수
            있습니다.
          </p>
          <FileUpload onFileSelect={onFileUpload} disabled={parsing} />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {orderFiles.map((f) => (
              <div
                key={f.id}
                className={cn(
                  'relative flex items-start gap-3 rounded-xl border bg-white p-4',
                  f.errorMessage && 'border-error'
                )}
              >
                <PlatformLogo platform={f.platform} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px]">
                      {f.label}
                    </Badge>
                    <span className="truncate text-sm font-medium text-t-strong">
                      {f.fileName}
                    </span>
                  </div>
                  {f.errorMessage ? (
                    <p className="mt-1 text-xs text-error">{f.errorMessage}</p>
                  ) : (
                    <p className="mt-1 text-xs text-t-mute">
                      {f.orders.length}건 파싱됨
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(f.id)}
                  className="shrink-0 rounded p-1 text-t-mute transition-colors hover:bg-gray-100 hover:text-t-strong"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-dashed bg-gray-50 p-3">
            <FileUpload onFileSelect={onFileUpload} disabled={parsing} />
          </div>

          {(coupangCount > 0 || tossCount > 0) && (
            <p className="text-sm text-t-mute">
              총 {coupangCount + tossCount}건
              {coupangCount > 0 && ` (쿠팡 ${coupangCount}건`}
              {coupangCount > 0 && tossCount > 0 && ', '}
              {tossCount > 0 &&
                `${coupangCount > 0 ? '' : ' ('}토스 ${tossCount}건`}
              {(coupangCount > 0 || tossCount > 0) && ')'}
            </p>
          )}
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canNext || parsing}>
          다음
          <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  )
}

type Step2Props = {
  suppliers: { id: string; name: string }[]
  selectedSupplierId: string
  onSupplierChange: (id: string) => void
  trackingFiles: SimpleTrackingFile[]
  trackingParsing: boolean
  onFileUpload: (file: File) => void
  onRemove: (id: string) => void
  onPrev: () => void
  onNext: () => void
  canNext: boolean
  totalMatched: number
  totalUnmatched: number
  totalDuplicated: number
  totalInvalid: number
}

function Step2TrackingUpload({
  suppliers,
  selectedSupplierId,
  onSupplierChange,
  trackingFiles,
  trackingParsing,
  onFileUpload,
  onRemove,
  onPrev,
  onNext,
  canNext,
  totalMatched,
  totalUnmatched,
  totalDuplicated,
  totalInvalid,
}: Step2Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {trackingFiles.length > 0 && (
        <div className="space-y-3">
          {trackingFiles.map((tf) => {
            const isExpanded = expandedId === tf.id
            return (
              <div
                key={tf.id}
                className="rounded-xl border bg-white"
              >
                <div className="flex items-start gap-3 p-4">
                  <FileSpreadsheet size={20} className="mt-0.5 shrink-0 text-t-mute" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-t-strong">
                        {tf.supplierName}
                      </span>
                      <span className="text-xs text-t-mute">{tf.fileName}</span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs">
                      <span className="text-success-dark">
                        매칭 {tf.matchingResult.matched.length}
                      </span>
                      {tf.matchingResult.unmatched.length > 0 && (
                        <span className="text-error">
                          미매칭 {tf.matchingResult.unmatched.length}
                        </span>
                      )}
                      {tf.matchingResult.duplicated.length > 0 && (
                        <span className="text-warning-dark">
                          중복 {tf.matchingResult.duplicated.length}
                        </span>
                      )}
                      {tf.matchingResult.invalid.length > 0 && (
                        <span className="text-t-mute">
                          오류 {tf.matchingResult.invalid.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : tf.id)}
                    className="shrink-0 rounded p-1 text-t-mute transition-colors hover:bg-gray-100"
                    title="상세 보기"
                  >
                    <ChevronDown
                      size={16}
                      className={cn('transition-transform', isExpanded && 'rotate-180')}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(tf.id)}
                    className="shrink-0 rounded p-1 text-t-mute transition-colors hover:bg-gray-100 hover:text-error"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {isExpanded && (
                  <TrackingFileDetail trackingFile={tf} />
                )}
              </div>
            )
          })}

          <MatchingSummaryGrid
            matched={totalMatched}
            unmatched={totalUnmatched}
            duplicated={totalDuplicated}
            invalid={totalInvalid}
          />

          {totalUnmatched > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-warning-light px-3 py-2.5">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-warning-dark"
              />
              <p className="text-xs text-warning-dark">
                {totalUnmatched}건의 주문번호가 일치하지 않습니다. 주문 엑셀을
                확인해 주세요.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-t-strong">
          공급처 선택
        </label>
        <Select value={selectedSupplierId} onValueChange={onSupplierChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="운송장을 보낸 공급처를 선택해 주세요" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedSupplierId && (
          <div className="mt-3">
            <FileUpload onFileSelect={onFileUpload} disabled={trackingParsing} />
          </div>
        )}

        {trackingParsing && (
          <div className="mt-3 flex items-center justify-center gap-2 py-2">
            <LoadingSpinner />
            <span className="text-sm text-t-mute">매칭 중...</span>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft size={16} className="mr-1" />
          이전
        </Button>
        <Button onClick={onNext} disabled={!canNext}>
          다음
          <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  )
}

type Step3Props = {
  trackingFiles: SimpleTrackingFile[]
  matchedByPlatform: Record<
    Platform,
    { count: number; labels: Set<string> }
  >
  totalMatched: number
  totalUnmatched: number
  totalDuplicated: number
  totalInvalid: number
  downloading: string | null
  downloadedPlatforms: Set<string>
  onDownload: (platform: Platform, filterLabel?: string) => void
  onReset: () => void
  onPrev: () => void
}

function Step3Results({
  trackingFiles,
  matchedByPlatform,
  totalMatched,
  totalUnmatched,
  totalDuplicated,
  totalInvalid,
  downloading,
  downloadedPlatforms,
  onDownload,
  onReset,
  onPrev,
}: Step3Props) {
  return (
    <div className="space-y-4">
      <MatchingSummaryGrid
        matched={totalMatched}
        unmatched={totalUnmatched}
        duplicated={totalDuplicated}
        invalid={totalInvalid}
      />

      {trackingFiles.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {trackingFiles.map((tf) => (
            <div
              key={tf.id}
              className="flex items-center gap-2 rounded-full border border-line bg-bg-subtle px-3 py-1.5 text-xs"
            >
              <FileSpreadsheet size={12} className="text-t-mute" />
              <span className="font-medium text-t-strong">{tf.supplierName}</span>
              <span className="text-success-dark">
                매칭 {tf.matchingResult.matched.length}
              </span>
              {tf.matchingResult.unmatched.length > 0 && (
                <span className="text-error">
                  미매칭 {tf.matchingResult.unmatched.length}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(['coupang', 'toss'] as const).map((platform) => {
          const info = matchedByPlatform[platform]
          const labels = Array.from(info.labels)
          const platformLabel = platform === 'coupang' ? '쿠팡' : '토스'
          const isDownloaded = downloadedPlatforms.has(platform)
          const isDownloading = downloading === platform

          if (info.count === 0) return null

          return (
            <div
              key={platform}
              className="rounded-xl border bg-white p-5"
            >
              <div className="mb-3 flex items-center gap-3">
                <PlatformLogo platform={platform} size={32} />
                <div>
                  <p className="text-sm font-semibold text-t-strong">
                    {platformLabel}
                  </p>
                  <p className="text-xs text-t-mute">{info.count}건</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full gap-1.5"
                  onClick={() => void onDownload(platform)}
                  disabled={isDownloading || downloading !== null}
                >
                  {isDownloaded ? (
                    <>
                      <CheckCircle2 size={16} />
                      다운로드됨
                    </>
                  ) : isDownloading ? (
                    <>
                      <LoadingSpinner />
                      다운로드 중...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      {labels.length > 1 ? '전체 다운로드' : '다운로드'}
                    </>
                  )}
                </Button>

                {labels.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map((label) => {
                      const key = `${platform}:${label}`
                      const isLabelDownloaded = downloadedPlatforms.has(key)
                      const isLabelDownloading = downloading === key

                      return (
                        <Button
                          key={label}
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => void onDownload(platform, label)}
                          disabled={
                            isLabelDownloading || downloading !== null
                          }
                        >
                          {isLabelDownloaded ? (
                            <Check size={12} />
                          ) : isLabelDownloading ? (
                            <LoadingSpinner />
                          ) : (
                            <Download size={12} />
                          )}
                          {label}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <MatchedTrackingTable trackingFiles={trackingFiles} />

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft size={16} className="mr-1" />
          이전
        </Button>
        <Button variant="ghost" onClick={onReset} className="gap-1 text-t-mute">
          <RotateCcw size={14} />
          처음부터 다시하기
        </Button>
      </div>
    </div>
  )
}

type MatchingSummaryGridProps = {
  matched: number
  unmatched: number
  duplicated: number
  invalid: number
}

function MatchingSummaryGrid({
  matched,
  unmatched,
  duplicated,
  invalid,
}: MatchingSummaryGridProps) {
  const items = [
    {
      label: '매칭됨',
      count: matched,
      icon: CheckCircle2,
      color: 'text-success-dark',
      bg: 'bg-success-light',
    },
    {
      label: '미매칭',
      count: unmatched,
      icon: XCircle,
      color: 'text-error',
      bg: 'bg-error-light',
    },
    {
      label: '중복',
      count: duplicated,
      icon: AlertTriangle,
      color: 'text-warning-dark',
      bg: 'bg-warning-light',
    },
    {
      label: '오류',
      count: invalid,
      icon: AlertCircle,
      color: 'text-t-mute',
      bg: 'bg-gray-100',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(({ label, count, icon: Icon, color, bg }) => (
        <div key={label} className={cn('rounded-xl px-4 py-3', bg)}>
          <div className="flex items-center gap-1.5">
            <Icon size={14} className={color} />
            <span className="text-xs text-t-mute">{label}</span>
          </div>
          <p className={cn('mt-1 text-xl font-bold', color)}>{count}</p>
        </div>
      ))}
    </div>
  )
}

const MAX_TABLE_ROWS = 30

function MatchedTrackingTable({
  trackingFiles,
}: {
  trackingFiles: SimpleTrackingFile[]
}) {
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all')
  const showSupplierColumn = trackingFiles.length > 1

  const rows = useMemo(() => {
    const result: {
      key: string
      supplierName: string
      platform: string
      orderNo: string
      productName: string
      trackingCompany: string
      trackingNumber: string
      status: 'matched' | 'unmatched'
      reason?: string
    }[] = []

    for (const tf of trackingFiles) {
      if (filter === 'all' || filter === 'matched') {
        for (const m of tf.matchingResult.matched) {
          result.push({
            key: `${tf.id}-m-${m.rawRowNumber}`,
            supplierName: tf.supplierName,
            platform: m.order.platform === 'coupang' ? '쿠팡' : '토스',
            orderNo: m.order.matchingKey,
            productName: m.productName ?? m.order.productName ?? '-',
            trackingCompany: m.trackingCompany,
            trackingNumber: m.trackingNumber,
            status: 'matched',
          })
        }
      }
      if (filter === 'all' || filter === 'unmatched') {
        for (const u of tf.matchingResult.unmatched) {
          result.push({
            key: `${tf.id}-u-${u.rawRowNumber}`,
            supplierName: tf.supplierName,
            platform: '-',
            orderNo: u.rawOrderKey,
            productName: u.productName ?? '-',
            trackingCompany: u.trackingCompany,
            trackingNumber: u.trackingNumber,
            status: 'unmatched',
            reason: u.invalidReason,
          })
        }
      }
    }
    return result
  }, [trackingFiles, filter])

  const displayedRows = rows.slice(0, MAX_TABLE_ROWS)
  const remainingCount = rows.length - MAX_TABLE_ROWS

  if (rows.length === 0 && filter === 'all') return null

  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-sm font-semibold text-t-strong">
          매칭 상세 <span className="font-normal text-t-mute">{rows.length}건</span>
        </span>
        <div className="flex gap-1">
          {(['all', 'matched', 'unmatched'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-primary text-white'
                  : 'text-t-mute hover:bg-gray-100'
              )}
            >
              {f === 'all' ? '전체' : f === 'matched' ? '매칭' : '미매칭'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              {showSupplierColumn && <TableHead>공급처</TableHead>}
              <TableHead>상태</TableHead>
              <TableHead>플랫폼</TableHead>
              <TableHead>주문번호</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead>택배사</TableHead>
              <TableHead>운송장번호</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.map((row, i) => (
              <TableRow key={row.key}>
                <TableCell className="text-xs text-t-mute">{i + 1}</TableCell>
                {showSupplierColumn && (
                  <TableCell className="text-sm">{row.supplierName}</TableCell>
                )}
                <TableCell>
                  {row.status === 'matched' ? (
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                      매칭
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                      미매칭
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">{row.platform}</TableCell>
                <TableCell className="font-mono text-xs">{row.orderNo}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">{row.productName}</TableCell>
                <TableCell className="text-sm">{row.trackingCompany}</TableCell>
                <TableCell className="font-mono text-xs">{row.trackingNumber}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {remainingCount > 0 && (
        <div className="border-t border-line bg-bg-subtle px-4 py-2 text-center text-xs text-t-mute">
          ... 외 {remainingCount}건
        </div>
      )}
    </div>
  )
}

const DETAIL_MAX_ROWS = 20

function TrackingFileDetail({ trackingFile: tf }: { trackingFile: SimpleTrackingFile }) {
  const [tab, setTab] = useState<'matched' | 'unmatched'>('matched')
  const items = tab === 'matched' ? tf.matchingResult.matched : tf.matchingResult.unmatched
  const displayed = items.slice(0, DETAIL_MAX_ROWS)
  const remaining = items.length - DETAIL_MAX_ROWS

  return (
    <div className="border-t border-line">
      <div className="flex gap-1 border-b border-line px-4 py-2">
        <button
          type="button"
          onClick={() => setTab('matched')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            tab === 'matched' ? 'bg-primary text-white' : 'text-t-mute hover:bg-gray-100'
          )}
        >
          매칭 {tf.matchingResult.matched.length}
        </button>
        <button
          type="button"
          onClick={() => setTab('unmatched')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            tab === 'unmatched' ? 'bg-primary text-white' : 'text-t-mute hover:bg-gray-100'
          )}
        >
          미매칭 {tf.matchingResult.unmatched.length}
        </button>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[500px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>주문번호</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead>택배사</TableHead>
              <TableHead>운송장번호</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((item, i) => (
              <TableRow key={item.rawRowNumber}>
                <TableCell className="text-xs text-t-mute">{i + 1}</TableCell>
                <TableCell className="font-mono text-xs">
                  {tab === 'matched'
                    ? (item as (typeof tf.matchingResult.matched)[number]).order.matchingKey
                    : item.rawOrderKey}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">
                  {item.productName ?? '-'}
                </TableCell>
                <TableCell className="text-sm">{item.trackingCompany}</TableCell>
                <TableCell className="font-mono text-xs">{item.trackingNumber}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {remaining > 0 && (
        <div className="border-t border-line bg-bg-subtle px-4 py-2 text-center text-xs text-t-mute">
          ... 외 {remaining}건
        </div>
      )}
    </div>
  )
}
