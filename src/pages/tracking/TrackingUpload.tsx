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
  Trash2,
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
import { getTrackingsByImport } from '@/lib/supabase/trackings'

import type { TrackingParseResult, MatchingResult, Tracking, TrackingImport } from '@/types'

const MAX_DISPLAY_ROWS = 20

export default function TrackingUpload() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { session, loading: sessionLoading } = useWorkSession(sessionId!)
  const { suppliers, loading: suppliersLoading } = useSuppliers()
  const {
    trackingImports,
    isLoading: importsLoading,
    uploadTracking,
    reuploadTracking,
    removeImport,
  } = useTrackingUpload(sessionId!)

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
  const [confirmDelete, setConfirmDelete] = useState<{
    importId: string
    supplierName: string
    trackingCount: number
  } | null>(null)
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)
  const [selectedImportTrackings, setSelectedImportTrackings] = useState<Tracking[]>([])
  const [loadingImportDetail, setLoadingImportDetail] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedImport = useMemo(
    () => trackingImports.find((i) => i.id === selectedImportId) ?? null,
    [trackingImports, selectedImportId]
  )

  const handleImportCardClick = async (imp: TrackingImport) => {
    if (selectedImportId === imp.id) {
      setSelectedImportId(null)
      setSelectedImportTrackings([])
      return
    }
    setSelectedImportId(imp.id)
    setUploadResult(null)
    try {
      setLoadingImportDetail(true)
      const trackings = await getTrackingsByImport(imp.id)
      setSelectedImportTrackings(trackings)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '상세 조회 실패')
      setSelectedImportId(null)
      setSelectedImportTrackings([])
    } finally {
      setLoadingImportDetail(false)
    }
  }

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
      setSelectedImportId(null)
      setSelectedImportTrackings([])
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
      setSelectedImportId(null)
      setSelectedImportTrackings([])
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

        {/* 공급처 업로드 현황 */}
        {trackingImports.length > 0 && (
          <div className="rounded-radius-md border border-line bg-card p-5 shadow-level-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-t-primary">업로드 현황</h3>
              <span className="text-xs text-t-mute">
                {trackingImports.length}개 공급처 · 총 {trackingImports.reduce((s, i) => s + i.validCount, 0)}건
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {trackingImports.map((imp) => {
                const supplier = activeSuppliers.find((s) => s.id === imp.sourceSupplierId)
                const uploadTime = new Date(imp.uploadedAt)
                const timeStr = uploadTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div
                    key={imp.id}
                    className={`group relative cursor-pointer rounded-radius-md border p-4 transition-colors ${
                      selectedImportId === imp.id
                        ? 'border-primary bg-blue-50/50'
                        : 'border-line bg-bg-subtle hover:border-green-200 hover:bg-green-50/50'
                    }`}
                    onClick={() => void handleImportCardClick(imp)}
                  >
                    {!isCompleted && (
                      <button
                        className="absolute right-3 top-3 rounded-md p-1 text-t-faint opacity-0 transition-all hover:bg-red-100 hover:text-status-error group-hover:opacity-100"
                        title="삭제"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDelete({
                            importId: imp.id,
                            supplierName: supplier?.name ?? '알 수 없음',
                            trackingCount: imp.validCount,
                          })
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-green-100">
                        <Check size={14} className="text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-t-primary">
                          {supplier?.name ?? '알 수 없음'}
                        </p>
                        <p className="truncate text-[11px] text-t-mute" title={imp.fileName}>
                          {imp.fileName}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-t-secondary">
                      <span className="font-medium">{imp.validCount}건</span>
                      {imp.invalidCount > 0 && (
                        <span className="text-status-error">오류 {imp.invalidCount}</span>
                      )}
                      {imp.detectedCourier && (
                        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-t-mute">
                          {imp.detectedCourier}
                        </span>
                      )}
                      <span className="ml-auto text-t-faint">{timeStr}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 선택된 import 상세 뷰 */}
            {selectedImport && (
              <div className="mt-4 rounded-radius-md border border-line bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-t-strong">
                    {activeSuppliers.find((s) => s.id === selectedImport.sourceSupplierId)?.name ?? '알 수 없음'} 파싱 결과
                  </h4>
                  <button
                    className="text-xs text-t-faint hover:text-t-mute"
                    onClick={() => {
                      setSelectedImportId(null)
                      setSelectedImportTrackings([])
                    }}
                  >
                    닫기
                  </button>
                </div>

                {loadingImportDetail ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <>
                    {/* 요약 */}
                    <div className="mb-4 flex items-center gap-6 rounded-radius-md border border-line bg-bg-subtle px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-green-100">
                          <Check size={16} className="text-green-600" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-t-strong">
                            {selectedImport.validCount}
                            <span className="text-sm font-normal text-t-mute">건</span>
                          </div>
                          <div className="text-xs text-t-mute">정상 파싱</div>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-line" />
                      <div className="flex items-center gap-2">
                        <div className={`grid h-8 w-8 place-items-center rounded-full ${selectedImport.invalidCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                          <AlertCircle size={16} className={selectedImport.invalidCount > 0 ? 'text-red-600' : 'text-t-mute'} />
                        </div>
                        <div>
                          <div className={`text-lg font-bold ${selectedImport.invalidCount > 0 ? 'text-red-600' : 'text-t-mute'}`}>
                            {selectedImport.invalidCount}
                            <span className="text-sm font-normal text-t-mute">건</span>
                          </div>
                          <div className="text-xs text-t-mute">오류</div>
                        </div>
                      </div>
                      {selectedImport.detectedCourier && (
                        <>
                          <div className="h-8 w-px bg-line" />
                          <div className="flex items-center gap-2">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100">
                              <Truck size={16} className="text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-t-strong">
                                {selectedImport.detectedCourier}
                              </div>
                              <div className="text-xs text-t-mute">택배사</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 매칭 요약 */}
                    {selectedImportTrackings.length > 0 && (
                      <div className="mb-4 flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-700">
                          <Check size={14} /> 매칭 {selectedImportTrackings.filter((t) => t.status === 'matched').length}건
                        </span>
                        {selectedImportTrackings.filter((t) => t.status === 'unmatched').length > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertCircle size={14} /> 미매칭 {selectedImportTrackings.filter((t) => t.status === 'unmatched').length}건
                          </span>
                        )}
                        {selectedImportTrackings.filter((t) => t.status === 'duplicated').length > 0 && (
                          <span className="text-amber-600">
                            중복 {selectedImportTrackings.filter((t) => t.status === 'duplicated').length}건
                          </span>
                        )}
                      </div>
                    )}

                    {/* 오류 행 상세 */}
                    {selectedImport.invalidRows.length > 0 && (
                      <div className="mb-4 rounded-radius-md border border-red-200 bg-red-50 p-3">
                        <p className="mb-2 text-sm font-medium text-red-700">
                          파싱 오류 {selectedImport.invalidRows.length}건
                        </p>
                        <div className="space-y-1">
                          {selectedImport.invalidRows.slice(0, 10).map((row, i) => (
                            <p key={i} className="text-xs text-red-600">
                              {row.rowNumber}행: {row.reason}
                            </p>
                          ))}
                          {selectedImport.invalidRows.length > 10 && (
                            <p className="text-xs text-red-400">
                              ... 외 {selectedImport.invalidRows.length - 10}건
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 운송장 테이블 */}
                    {selectedImportTrackings.length > 0 && (
                      <div className="rounded-radius-md border border-line overflow-x-auto">
                        <Table className="min-w-[600px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>원본 매칭번호</TableHead>
                              <TableHead>택배사</TableHead>
                              <TableHead>운송장번호</TableHead>
                              <TableHead>매칭 상태</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedImportTrackings.slice(0, MAX_DISPLAY_ROWS).map((t, i) => (
                              <TableRow key={t.id}>
                                <TableCell className="text-t-mute">{i + 1}</TableCell>
                                <TableCell className="font-mono text-xs">{t.rawOrderKey}</TableCell>
                                <TableCell>{t.trackingCompany}</TableCell>
                                <TableCell className="font-mono text-xs">{t.trackingNumber}</TableCell>
                                <TableCell>
                                  {t.status === 'matched' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                      <Check size={10} /> 매칭
                                    </span>
                                  )}
                                  {t.status === 'unmatched' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                      미매칭
                                    </span>
                                  )}
                                  {t.status === 'duplicated' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                      중복
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {selectedImportTrackings.length > MAX_DISPLAY_ROWS && (
                          <div className="border-t border-line bg-bg-subtle px-4 py-2 text-center text-xs text-t-mute">
                            ... 외 {selectedImportTrackings.length - MAX_DISPLAY_ROWS}건
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 01. 공급처 선택 */}
        <section className="rounded-radius-md border border-line bg-card p-6 shadow-level-1">
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
        <section className="rounded-radius-md border border-line bg-card p-6 shadow-level-1">
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
          <section className="rounded-radius-md border border-line bg-card p-6 shadow-level-1">
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

            {/* 오류 행 상세 */}
            {uploadResult.parseResult.invalidRows.length > 0 && (
              <div className="mb-4 rounded-radius-md border border-red-200 bg-red-50 p-3">
                <p className="mb-2 text-sm font-medium text-red-700">
                  파싱 오류 {uploadResult.parseResult.invalidRows.length}건
                </p>
                <div className="space-y-1">
                  {uploadResult.parseResult.invalidRows.slice(0, 10).map((row, i) => (
                    <p key={i} className="text-xs text-red-600">
                      {row.rowNumber}행: {row.reason}
                    </p>
                  ))}
                  {uploadResult.parseResult.invalidRows.length > 10 && (
                    <p className="text-xs text-red-400">
                      ... 외 {uploadResult.parseResult.invalidRows.length - 10}건
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 운송장 테이블 */}
            {displayedTrackings.length > 0 && (
              <div className="rounded-radius-md border border-line overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>원본 매칭번호</TableHead>
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
      <div className="sticky bottom-0 mt-6 flex items-center justify-between border-t border-line bg-card px-6 py-4">
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

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null)
        }}
        title={`${confirmDelete?.supplierName ?? ''} 운송장을 삭제할까요?`}
        description={`이 파일의 매칭 결과 ${confirmDelete?.trackingCount ?? 0}건도 함께 삭제됩니다. 삭제 후 플랫폼 운송장 다운로드 파일에서 해당 건이 제외됩니다.`}
        confirmText="삭제"
        variant="destructive"
        loading={deleting}
        onConfirm={async () => {
          if (!confirmDelete) return
          setDeleting(true)
          try {
            await removeImport(confirmDelete.importId)
            toast.success(`${confirmDelete.supplierName} 운송장을 삭제했습니다`)
            setUploadResult(null)
          } catch (err) {
            toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다')
          } finally {
            setDeleting(false)
            setConfirmDelete(null)
          }
        }}
      />
    </>
  )
}
