import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Upload,
  Check,
  AlertCircle,
  Truck,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FileUpload } from '@/components/ui/FileUpload'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TrackingTabs } from '@/components/TrackingTabs'
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
import { useSuppliers } from '@/hooks/useSuppliers'
import { useTrackingUpload } from '@/hooks/useTrackingUpload'

import type { TrackingParseResult, MatchingResult } from '@/types'

const MAX_DISPLAY_ROWS = 20

export default function TrackingUpload() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { session, loading: sessionLoading } = useWorkSession(sessionId!)
  const { suppliers, loading: suppliersLoading } = useSuppliers()
  const { trackingImports, isLoading: importsLoading, uploadTracking, reuploadTracking } =
    useTrackingUpload(sessionId!)

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [uploadResult, setUploadResult] = useState<{
    parseResult: TrackingParseResult
    matchingResult: MatchingResult
  } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [confirmReupload, setConfirmReupload] = useState<{
    file: File
    importId: string
    supplierName: string
  } | null>(null)

  const isCompleted = session?.status === 'completed'

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.isActive),
    [suppliers]
  )

  const selectedSupplier = useMemo(
    () => activeSuppliers.find((s) => s.id === selectedSupplierId),
    [activeSuppliers, selectedSupplierId]
  )

  const existingImportForSupplier = useMemo(
    () => trackingImports.find((i) => i.sourceSupplierId === selectedSupplierId),
    [trackingImports, selectedSupplierId]
  )

  const canOpenMatch = trackingImports.length > 0
  const canOpenDownload = false

  const handleFileUpload = async (file: File) => {
    if (!selectedSupplierId || !selectedSupplier) return

    if (existingImportForSupplier) {
      setConfirmReupload({
        file,
        importId: existingImportForSupplier.id,
        supplierName: selectedSupplier.name,
      })
      return
    }

    try {
      setUploading(true)
      const result = await uploadTracking(file, selectedSupplierId)
      setUploadResult(result)
      toast.success(
        `${selectedSupplier.name} 운송장 ${result.parseResult.meta.validCount}건을 업로드했습니다`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  const handleReuploadConfirm = async () => {
    if (!confirmReupload || !selectedSupplierId) return

    try {
      setUploading(true)
      const result = await reuploadTracking(
        confirmReupload.file,
        selectedSupplierId,
        confirmReupload.supplierName,
        confirmReupload.importId
      )
      setUploadResult(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '재업로드 실패')
    } finally {
      setUploading(false)
      setConfirmReupload(null)
    }
  }

  if (sessionLoading || suppliersLoading || importsLoading) {
    return (
      <>
        <PageHeader title="운송장 업로드" />
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  if (!session) return null

  const displayedTrackings = uploadResult?.parseResult.trackings.slice(0, MAX_DISPLAY_ROWS) ?? []
  const remainingCount = (uploadResult?.parseResult.trackings.length ?? 0) - MAX_DISPLAY_ROWS

  return (
    <>
      <PageHeader
        title="운송장 업로드"
        actions={
          <Link to="/tracking" className="text-sm text-primary hover:underline">
            작업건 변경
          </Link>
        }
      />

      <div className="space-y-5">
        <TrackingTabs
          sessionId={sessionId!}
          currentTab="upload"
          canOpenMatch={canOpenMatch}
          canOpenDownload={canOpenDownload}
        />

        {isCompleted && (
          <div className="rounded-radius-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            완료된 작업건은 수정할 수 없습니다. 조회만 가능합니다.
          </div>
        )}

        {/* 공급처 업로드 상태 스트립 */}
        {trackingImports.length > 0 && (
          <div className="rounded-radius-md border border-line bg-white p-4 shadow-level-1">
            <div className="mb-2 text-xs font-semibold text-t-mute">업로드된 공급처</div>
            <div className="flex flex-wrap gap-2">
              {trackingImports.map((imp) => {
                const supplier = activeSuppliers.find((s) => s.id === imp.sourceSupplierId)
                return (
                  <div
                    key={imp.id}
                    className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs"
                  >
                    <Check size={12} className="text-green-600" />
                    <span className="font-medium text-green-800">
                      {supplier?.name ?? '알 수 없음'}
                    </span>
                    <span className="text-green-600">{imp.validCount}건</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 01. 공급처 선택 */}
        <section className="rounded-radius-md border border-line bg-white p-6 shadow-level-1">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-white">
              01
            </span>
            <div>
              <div className="text-[15px] font-bold text-t-strong">공급처 선택</div>
              <div className="text-sm text-t-mute">
                어느 공급처에서 받은 운송장인지 선택하세요
              </div>
            </div>
          </div>
          <Select
            value={selectedSupplierId}
            onValueChange={setSelectedSupplierId}
            disabled={isCompleted}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="공급처를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {activeSuppliers.map((s) => {
                const hasImport = trackingImports.some(
                  (i) => i.sourceSupplierId === s.id
                )
                return (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      {s.name}
                      {hasImport && (
                        <Check size={12} className="text-green-600" />
                      )}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </section>

        {/* 02. 파일 업로드 */}
        <section className="rounded-radius-md border border-line bg-white p-6 shadow-level-1">
          <div className="mb-4 flex items-start gap-3">
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                selectedSupplierId
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-t-mute'
              }`}
            >
              02
            </span>
            <div>
              <div className="text-[15px] font-bold text-t-strong">파일 업로드</div>
              <div className="text-sm text-t-mute">
                운송장 엑셀 파일을 끌어다 놓거나, 파일 선택 버튼을 눌러주세요
              </div>
            </div>
          </div>

          {existingImportForSupplier && !uploadResult ? (
            <div className="flex items-center gap-3 rounded-radius-md border border-line bg-bg-subtle px-4 py-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-t-strong">
                  {existingImportForSupplier.fileName}
                </div>
                <div className="text-xs text-t-mute">
                  파싱 완료 {existingImportForSupplier.validCount}건
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                <Check size={12} />
                파싱 완료
              </span>
              {!isCompleted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.xlsx,.xls'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) void handleFileUpload(file)
                    }
                    input.click()
                  }}
                >
                  <RefreshCw size={14} />
                  다시 업로드
                </Button>
              )}
            </div>
          ) : (
            <FileUpload
              accept=".xlsx,.xls"
              onFileSelect={(file) => void handleFileUpload(file)}
              disabled={!selectedSupplierId || isCompleted || uploading}
            />
          )}
        </section>

        {/* 03. 파싱 결과 */}
        {uploadResult && (
          <section className="rounded-radius-md border border-line bg-white p-6 shadow-level-1">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                03
              </span>
              <div>
                <div className="text-[15px] font-bold text-t-strong">파싱 결과</div>
                <div className="text-sm text-t-mute">엑셀에서 읽어온 운송장 데이터를 확인해 주세요</div>
              </div>
            </div>

            {/* 요약 카드 */}
            <div className="mb-4 flex items-center gap-6 rounded-radius-md border border-line bg-bg-subtle px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-green-100">
                  <Check size={16} className="text-green-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-t-strong">
                    {uploadResult.parseResult.meta.validCount}
                    <span className="text-sm font-normal text-t-mute">건</span>
                  </div>
                  <div className="text-xs text-t-mute">정상 파싱</div>
                </div>
              </div>
              <div className="h-8 w-px bg-line" />
              <div className="flex items-center gap-2">
                <div className={`grid h-8 w-8 place-items-center rounded-full ${uploadResult.parseResult.meta.invalidCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <AlertCircle size={16} className={uploadResult.parseResult.meta.invalidCount > 0 ? 'text-red-600' : 'text-t-mute'} />
                </div>
                <div>
                  <div className={`text-lg font-bold ${uploadResult.parseResult.meta.invalidCount > 0 ? 'text-red-600' : 'text-t-mute'}`}>
                    {uploadResult.parseResult.meta.invalidCount}
                    <span className="text-sm font-normal text-t-mute">건</span>
                  </div>
                  <div className="text-xs text-t-mute">오류</div>
                </div>
              </div>
              <div className="h-8 w-px bg-line" />
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100">
                  <Truck size={16} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm font-bold text-t-strong">
                    {uploadResult.parseResult.meta.detectedCourier ?? '-'}
                  </div>
                  <div className="text-xs text-t-mute">감지된 택배사</div>
                </div>
              </div>
            </div>

            {/* 매칭 요약 */}
            <div className="mb-4 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-700">
                <Check size={14} /> 매칭 {uploadResult.matchingResult.matched.length}건
              </span>
              {uploadResult.matchingResult.unmatched.length > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle size={14} /> 미매칭 {uploadResult.matchingResult.unmatched.length}건
                </span>
              )}
              {uploadResult.matchingResult.duplicated.length > 0 && (
                <span className="text-amber-600">
                  중복 {uploadResult.matchingResult.duplicated.length}건
                </span>
              )}
            </div>

            {/* 운송장 테이블 */}
            {displayedTrackings.length > 0 && (
              <div className="rounded-radius-md border border-line overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>원본 주문번호</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>수령인</TableHead>
                      <TableHead>택배사</TableHead>
                      <TableHead>운송장번호</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedTrackings.map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-t-mute">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{t.rawOrderKey}</TableCell>
                        <TableCell>{t.productName ?? '-'}</TableCell>
                        <TableCell>{t.recipientName ?? '-'}</TableCell>
                        <TableCell>{t.trackingCompany}</TableCell>
                        <TableCell className="font-mono text-xs">{t.trackingNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {remainingCount > 0 && (
                  <div className="border-t border-line bg-bg-subtle px-4 py-2 text-center text-xs text-t-mute">
                    ... 외 {remainingCount}건
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* 하단 CTA */}
      <div className="sticky bottom-0 mt-6 flex items-center justify-between border-t border-line bg-white px-6 py-4">
        <div className="text-sm">
          {canOpenMatch ? (
            <span className="flex items-center gap-1 text-green-700">
              <Check size={16} />
              운송장 {trackingImports.reduce((s, i) => s + i.validCount, 0)}건이 정상적으로
              업로드됐어요
            </span>
          ) : (
            <span className="flex items-center gap-1 text-t-mute">
              <Upload size={16} />
              공급처 운송장을 업로드해 주세요
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/tracking')}
          >
            <ChevronLeft size={14} />
            이전
          </Button>
          <Button
            disabled={!canOpenMatch}
            onClick={() => navigate(`/tracking/${sessionId}/match`)}
          >
            다음: 매칭 결과
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmReupload}
        onOpenChange={(open) => {
          if (!open) setConfirmReupload(null)
        }}
        title={`${confirmReupload?.supplierName ?? ''} 운송장을 다시 업로드할까요?`}
        description="기존 운송장 데이터가 대체되고, 매칭 결과도 새로 계산됩니다."
        confirmText="다시 업로드"
        onConfirm={handleReuploadConfirm}
      />
    </>
  )
}
