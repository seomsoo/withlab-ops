import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Download,
  Check,
  AlertCircle,
  ChevronLeft,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react'

import { PlatformLogo } from '@/components/PlatformLogo'
import { toast } from 'sonner'

import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrackingTabs } from '@/components/TrackingTabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useWorkSession } from '@/hooks/useWorkSession'
import { useTrackingExport } from '@/hooks/useTrackingExport'
import {
  getTrackingStats,
  getTrackingImports,
  getSupplierTrackingProgress,
} from '@/lib/supabase/trackings'
import { getPlatformTemplate } from '@/lib/supabase/platformTemplates'
import { completeWorkSession } from '@/lib/supabase/workSessions'

import { cn } from '@/lib/utils'

import type { Platform } from '@/types'
import type { SupplierTrackingProgress } from '@/lib/supabase/trackings'

export default function TrackingDownload() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { session, loading: sessionLoading, refetch: refetchSession } =
    useWorkSession(sessionId!)
  const { exportData, isLoading, courierWarnings, downloadPlatformFile } =
    useTrackingExport(sessionId!)

  const [downloading, setDownloading] = useState<string | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [downloadChecked, setDownloadChecked] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [hasImports, setHasImports] = useState(false)
  const [unmatchedTotal, setUnmatchedTotal] = useState(0)
  const [templateStatus, setTemplateStatus] = useState<{
    coupang: boolean
    toss: boolean
  }>({ coupang: false, toss: false })
  const [supplierProgress, setSupplierProgress] = useState<SupplierTrackingProgress[]>([])

  useEffect(() => {
    void Promise.all([
      getTrackingImports(sessionId!),
      getTrackingStats(sessionId!),
      getPlatformTemplate('coupang'),
      getPlatformTemplate('toss'),
      getSupplierTrackingProgress(sessionId!),
    ]).then(([imports, stats, coupangTpl, tossTpl, progress]) => {
      setHasImports(imports.length > 0)
      setUnmatchedTotal(stats.unmatched + stats.duplicated + stats.invalid)
      setTemplateStatus({
        coupang: !!coupangTpl,
        toss: !!tossTpl,
      })
      setSupplierProgress(progress)
    })
  }, [sessionId])

  const isCompleted = session?.status === 'completed'

  const canOpenMatch = hasImports || exportData.coupang.count + exportData.toss.count > 0
  const canOpenDownload = exportData.coupang.count + exportData.toss.count > 0

  const handleDownload = useCallback(
    async (platform: Platform, filterLabel?: string) => {
      const key = filterLabel ? `${platform}:${filterLabel}` : platform
      try {
        setDownloading(key)
        await downloadPlatformFile(platform, filterLabel)
      } catch {
        // handled in hook
      } finally {
        setDownloading(null)
      }
    },
    [downloadPlatformFile]
  )

  const handleDownloadAll = useCallback(async () => {
    setDownloading('all')
    try {
      if (exportData.coupang.count > 0 && templateStatus.coupang) {
        await downloadPlatformFile('coupang')
      }
      if (exportData.toss.count > 0 && templateStatus.toss) {
        await downloadPlatformFile('toss')
      }
      toast.success('전체 다운로드 완료')
    } catch {
      // handled in hook
    } finally {
      setDownloading(null)
    }
  }, [downloadPlatformFile, exportData, templateStatus])

  const handleComplete = useCallback(async () => {
    try {
      setCompleting(true)
      await completeWorkSession(sessionId!)
      await refetchSession()
      toast.success('운송장 처리가 완료되었습니다')
      setCompleteOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '완료 처리 실패')
    } finally {
      setCompleting(false)
    }
  }, [sessionId, refetchSession])

  if (sessionLoading || isLoading) {
    return (
      <>
        <PageHeader title="플랫폼 파일 다운로드" />
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  if (!session) return null

  const totalMatched = exportData.coupang.count + exportData.toss.count
  const totalUnmatched =
    exportData.coupang.unmatchedCount + exportData.toss.unmatchedCount

  return (
    <>
      <PageHeader
        title="플랫폼 파일 다운로드"
        actions={
          <Link to="/tracking" className="text-sm text-primary hover:underline">
            작업건 변경
          </Link>
        }
      />

      <div className="space-y-5">
        <TrackingTabs
          sessionId={sessionId!}
          currentTab="download"
          canOpenMatch={canOpenMatch}
          canOpenDownload={canOpenDownload}
        />

        {supplierProgress.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {supplierProgress.map((sp) => (
              <div
                key={sp.supplierId}
                className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-xs"
              >
                <span className={sp.uploadedCount > 0 ? 'text-green-600' : 'text-t-mute'}>
                  {sp.uploadedCount > 0 ? '✓' : '○'}
                </span>
                <span className="font-medium text-t-strong">{sp.supplierName}</span>
                <span className="text-t-mute">
                  {sp.matchedCount}/{sp.totalAllocations}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 미매칭 경고 배너 */}
        {unmatchedTotal > 0 && (
          <div className="flex items-start gap-3 rounded-radius-md border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-800">
                미매칭 {unmatchedTotal}건이 있어요
              </div>
              <div className="text-xs text-amber-700">
                미매칭 건은 다운로드 파일에서 제외됩니다. 매칭을 마치고 다시
                다운로드하면 더 정확해요.
              </div>
            </div>
            <Link
              to={`/tracking/${sessionId}/match`}
              className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline"
            >
              매칭 결과 확인 <ExternalLink size={12} />
            </Link>
          </div>
        )}

        {/* 택배사 매핑 경고 배너 */}
        {courierWarnings.length > 0 && (
          <div className="flex items-start gap-3 rounded-radius-md border border-blue-200 bg-blue-50 px-4 py-3">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-blue-800">
                택배사 매핑이 안 된 건이 있어요
              </div>
              <div className="text-xs text-blue-700">
                다운로드는 가능하지만, 매핑되지 않은 택배사 코드는 플랫폼에서
                인식되지 않을 수 있어요.
              </div>
            </div>
            <Link
              to="/mapping/couriers"
              className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
            >
              택배사 매핑 추가 <ExternalLink size={12} />
            </Link>
          </div>
        )}

        {/* 안내 + 전체 다운로드 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-t-mute">
            <Check size={14} className="text-green-600" />
            매칭된 운송장만 다운로드 파일에 포함됩니다.
          </div>
          {totalMatched > 0 && (
            <Button
              disabled={downloading !== null}
              onClick={() => void handleDownloadAll()}
            >
              <Download size={14} />
              {downloading === 'all' ? '다운로드 중...' : '전체 다운로드'}
            </Button>
          )}
        </div>

        {/* 다운로드 요약 */}
        {totalMatched > 0 && (
          <div className="rounded-radius-md border border-line bg-card shadow-level-1 overflow-hidden">
            <div className="border-b border-line bg-bg-subtle px-4 py-2 text-xs font-semibold text-t-secondary">
              다운로드 미리보기
            </div>
            <div className="grid grid-cols-2 gap-4 p-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline">쿠팡</Badge>
                <span className="text-sm font-medium">{exportData.coupang.count}건</span>
                {!templateStatus.coupang && exportData.coupang.count > 0 && (
                  <span className="text-xs text-amber-600">양식 미등록</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">토스</Badge>
                <span className="text-sm font-medium">{exportData.toss.count}건</span>
                {!templateStatus.toss && exportData.toss.count > 0 && (
                  <span className="text-xs text-amber-600">양식 미등록</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 플랫폼별 다운로드 카드 */}
        <div className="grid grid-cols-2 gap-4">
          <PlatformCard
            platform="coupang"
            label="쿠팡"
            count={exportData.coupang.count}
            unmatchedCount={exportData.coupang.unmatchedCount}
            downloading={downloading}
            hasTemplate={templateStatus.coupang}
            labels={exportData.coupang.labels}
            countByLabel={exportData.coupang.countByLabel}
            onDownload={(filterLabel) => void handleDownload('coupang', filterLabel)}
          />
          <PlatformCard
            platform="toss"
            label="토스"
            count={exportData.toss.count}
            unmatchedCount={exportData.toss.unmatchedCount}
            downloading={downloading}
            hasTemplate={templateStatus.toss}
            labels={exportData.toss.labels}
            countByLabel={exportData.toss.countByLabel}
            onDownload={(filterLabel) => void handleDownload('toss', filterLabel)}
          />
        </div>

        {/* 업로드 가이드 */}
        <div className="rounded-radius-md border border-line bg-card p-6 shadow-level-1">
          <div className="mb-1 text-[15px] font-bold text-t-strong">
            다운로드 후 업로드 방법
          </div>
          <div className="mb-4 text-sm text-t-mute">
            각 플랫폼 사이트에서 운송장 일괄 업로드 메뉴에 파일을 올려주세요.
          </div>
          <div className="space-y-3">
            <GuideStep
              step={1}
              platform="쿠팡"
              title="쿠팡 WING 접속"
              body="쿠팡 WING > 주문관리 > 출고 처리 메뉴로 이동"
            />
            <GuideStep
              step={2}
              platform="쿠팡"
              title="운송장 일괄등록"
              body="[운송장 일괄등록] 클릭 후 다운받은 엑셀 파일 업로드"
            />
            <GuideStep
              step={3}
              platform="토스"
              title="토스 셀러센터 접속"
              body="토스 셀러 > 주문/배송 > 배송 처리로 이동"
            />
            <GuideStep
              step={4}
              platform="토스"
              title="운송장 일괄 업로드"
              body="[운송장 업로드] 메뉴에서 다운받은 엑셀 업로드"
            />
          </div>
        </div>
      </div>

      {/* 하단 CTA */}
      <div className="sticky bottom-0 mt-6 flex items-center justify-between border-t border-line bg-card px-6 py-4">
        <div className="text-sm">
          {isCompleted ? (
            <span className="flex items-center gap-1 text-green-700">
              <Check size={16} />
              운송장 처리가 완료되었습니다
            </span>
          ) : totalMatched > 0 ? (
            <span className="flex items-center gap-1 text-t-mute">
              <Check size={16} className="text-green-600" />
              모든 다운로드를 마치면 작업건이 완료 상태로 변경돼요.
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/tracking/${sessionId}/match`)}
          >
            <ChevronLeft size={14} />
            이전
          </Button>
          <Button
            disabled={totalMatched === 0 || isCompleted}
            onClick={() => {
              setDownloadChecked(false)
              setCompleteOpen(true)
            }}
          >
            운송장 처리 완료
          </Button>
        </div>
      </div>

      {/* 완료 확인 다이얼로그 */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>운송장 처리를 완료할까요?</DialogTitle>
            <DialogDescription>
              {session.status === 'active' && (
                <>
                  발주 완료 없이 운송장 처리를 완료합니다. 미배정 주문은 자동으로 발주 완료 처리됩니다.
                  <br />
                </>
              )}
              완료 후에는 운송장 업로드나 수동 매칭이 불가합니다.
              {totalUnmatched > 0 && (
                <>
                  <br />
                  <span className="text-amber-600">
                    미처리 {totalUnmatched}건은 처리되지 않은 상태로 남습니다.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <label className="flex cursor-pointer items-center gap-2 rounded-radius-md border border-line bg-bg-subtle px-3 py-2.5">
            <Checkbox
              checked={downloadChecked}
              onCheckedChange={(v) => setDownloadChecked(v === true)}
            />
            <span className="text-sm text-t-secondary">
              플랫폼 업로드 파일을 다운로드했습니다
            </span>
          </label>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCompleteOpen(false)}
              disabled={completing}
            >
              취소
            </Button>
            <Button
              disabled={!downloadChecked || completing}
              onClick={() => void handleComplete()}
            >
              {completing && <LoadingSpinner size="sm" />}
              완료하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PlatformCard({
  platform,
  label,
  count,
  unmatchedCount,
  downloading,
  hasTemplate,
  labels,
  countByLabel,
  onDownload,
}: {
  platform: Platform
  label: string
  count: number
  unmatchedCount: number
  downloading: string | null
  hasTemplate: boolean
  labels: string[]
  countByLabel: Record<string, number>
  onDownload: (filterLabel?: string) => void
}) {
  const today = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')
  const fileName = `${label}_운송장_${today}.xlsx`
  const isDownloading = downloading === platform || downloading?.startsWith(`${platform}:`)
  const hasMultipleLabels = labels.length > 1

  return (
    <div
      className={cn(
        'rounded-radius-md border bg-card p-5 shadow-level-1',
        platform === 'coupang' ? 'border-blue-200' : 'border-indigo-200'
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <PlatformLogo platform={platform} size={40} />
        <div>
          <div className="text-[15px] font-bold text-t-strong">
            {label} 운송장 파일
          </div>
          <div className="text-xs text-t-mute">
            운송장 일괄 업로드용
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-2xl font-bold text-t-strong">
          {count}
          <span className="text-sm font-normal text-t-mute">건</span>
        </div>
        {hasMultipleLabels ? (
          <div className="text-xs text-t-mute">
            {labels.map((l) => `${l}: ${countByLabel[l] ?? 0}건`).join(', ')}
          </div>
        ) : (
          <div className="text-xs text-t-mute">파일에 포함되는 매칭 건수</div>
        )}
        {unmatchedCount > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle size={12} />
            미매칭 {unmatchedCount}건은 파일에서 제외
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-radius-md bg-bg-subtle px-3 py-2">
        <FileSpreadsheet size={16} className="text-green-700" />
        <span className="flex-1 font-mono text-xs text-t-secondary">
          {fileName}
        </span>
      </div>

      <div className="space-y-2">
        <Button
          className="w-full"
          disabled={count === 0 || isDownloading || !hasTemplate}
          onClick={() => onDownload()}
        >
          {downloading === platform ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Download size={16} />
          )}
          {hasMultipleLabels ? '전체 다운로드' : '엑셀 다운로드'}
        </Button>

        {hasMultipleLabels && (
          <div className="flex flex-wrap gap-1.5">
            {labels.map((l) => {
              const key = `${platform}:${l}`
              return (
                <Button
                  key={l}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={!hasTemplate || downloading !== null}
                  onClick={() => onDownload(l)}
                >
                  {downloading === key ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Download size={12} />
                  )}
                  {l}
                </Button>
              )
            })}
          </div>
        )}
      </div>

      {!hasTemplate && (
        <div className="mt-2 text-center text-xs text-amber-600">
          <Link to="/settings?tab=platform" className="underline">
            양식을 먼저 등록해 주세요
          </Link>
        </div>
      )}
      {hasTemplate && count === 0 && (
        <div className="mt-2 text-center text-xs text-t-mute">
          매칭된 {label} 주문이 없습니다
        </div>
      )}
    </div>
  )
}

function GuideStep({
  step,
  platform,
  title,
  body,
}: {
  step: number
  platform: string
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-xs font-bold text-white',
          platform === '쿠팡' ? 'bg-blue-500' : 'bg-indigo-500'
        )}
      >
        {step}
      </span>
      <div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              platform === '쿠팡'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-indigo-50 text-indigo-700'
            )}
          >
            {platform}
          </span>
          <span className="text-sm font-medium text-t-strong">{title}</span>
        </div>
        <div className="mt-0.5 text-xs text-t-mute">{body}</div>
      </div>
    </div>
  )
}
