import { useState, useMemo, useCallback } from 'react'
import {
  FileUp,
  Check,
  Settings,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FileUpload } from '@/components/ui/FileUpload'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

import { usePlatformTemplate } from '@/hooks/usePlatformTemplate'
import { validateExcelFile } from '@/utils/file'

import { cn } from '@/lib/utils'

import type { Platform } from '@/types'
import type { PlatformTemplateInput } from '@/hooks/usePlatformTemplate'

type Step = 'file' | 'sheet' | 'columns' | 'preview'

const STEPS: { id: Step; label: string }[] = [
  { id: 'file', label: '파일 업로드' },
  { id: 'sheet', label: '시트/행 설정' },
  { id: 'columns', label: '컬럼 매핑' },
  { id: 'preview', label: '미리보기' },
]

const PLATFORM_DEFAULTS: Record<
  Platform,
  { headerRow: number; dataStartRow: number }
> = {
  coupang: { headerRow: 1, dataStartRow: 2 },
  toss: { headerRow: 3, dataStartRow: 5 },
}

export default function PlatformTemplate() {
  const [platform, setPlatform] = useState<Platform>('coupang')
  const { template, isLoading, saveTemplate } = usePlatformTemplate(platform)

  const [editing, setEditing] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>('file')
  const [saving, setSaving] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [headerRow, setHeaderRow] = useState(1)
  const [dataStartRow, setDataStartRow] = useState(2)

  const [matchKeyCol, setMatchKeyCol] = useState('')
  const [trackingCompanyCol, setTrackingCompanyCol] = useState('')
  const [trackingNumberCol, setTrackingNumberCol] = useState('')
  const [statusCol, setStatusCol] = useState('')
  const [statusValue, setStatusValue] = useState('배송중')

  const resetForm = useCallback(() => {
    setFile(null)
    setWorkbook(null)
    setSheetName('')
    setMatchKeyCol('')
    setTrackingCompanyCol('')
    setTrackingNumberCol('')
    setStatusCol('')
    setStatusValue('배송중')
    const defaults = PLATFORM_DEFAULTS[platform]
    setHeaderRow(defaults.headerRow)
    setDataStartRow(defaults.dataStartRow)
    setCurrentStep('file')
  }, [platform])

  const startEditing = useCallback(() => {
    resetForm()
    setEditing(true)
  }, [resetForm])

  const sheetNames = useMemo(() => {
    if (!workbook) return []
    return workbook.SheetNames
  }, [workbook])

  const headers = useMemo(() => {
    if (!workbook || !sheetName) return []
    const ws = workbook.Sheets[sheetName]
    if (!ws) return []
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    const row = headerRow - 1
    const result: { index: number; name: string }[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: row, c })]
      const val = cell ? String(cell.v ?? '') : ''
      result.push({ index: c + 1, name: val || `(컬럼 ${c + 1})` })
    }
    return result
  }, [workbook, sheetName, headerRow])

  const sampleRows = useMemo(() => {
    if (!workbook || !sheetName) return []
    const ws = workbook.Sheets[sheetName]
    if (!ws) return []
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    const rows: string[][] = []
    for (let r = dataStartRow - 1; r < Math.min(dataStartRow + 2, range.e.r + 1); r++) {
      const row: string[] = []
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        row.push(cell ? String(cell.v ?? '') : '')
      }
      rows.push(row)
    }
    return rows
  }, [workbook, sheetName, dataStartRow])

  const handleFileSelect = useCallback(
    (f: File) => {
      if (!f.name.endsWith('.xlsx')) {
        toast.error('.xlsx 파일만 허용됩니다')
        return
      }
      try {
        validateExcelFile(f, 10)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '파일 검증 실패')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          setFile(f)
          setWorkbook(wb)
          setSheetName(wb.SheetNames[0] ?? '')
          const defaults = PLATFORM_DEFAULTS[platform]
          setHeaderRow(defaults.headerRow)
          setDataStartRow(defaults.dataStartRow)
          setMatchKeyCol('')
          setTrackingCompanyCol('')
          setTrackingNumberCol('')
          setStatusCol('')
          setCurrentStep('sheet')
        } catch {
          toast.error('엑셀 파일을 읽을 수 없습니다')
        }
      }
      reader.readAsArrayBuffer(f)
    },
    [platform]
  )

  const columnDuplicateError = useMemo(() => {
    const selected = [matchKeyCol, trackingCompanyCol, trackingNumberCol]
    if (platform === 'toss' && statusCol) selected.push(statusCol)
    const nonEmpty = selected.filter(Boolean)
    const unique = new Set(nonEmpty)
    if (nonEmpty.length !== unique.size) {
      return '같은 컬럼을 여러 필드에 선택할 수 없습니다'
    }
    return null
  }, [matchKeyCol, trackingCompanyCol, trackingNumberCol, statusCol, platform])

  const canProceedToPreview = useMemo(() => {
    if (!matchKeyCol || !trackingCompanyCol || !trackingNumberCol) return false
    if (platform === 'toss' && !statusCol) return false
    return !columnDuplicateError
  }, [matchKeyCol, trackingCompanyCol, trackingNumberCol, statusCol, platform, columnDuplicateError])

  const handleSave = useCallback(async () => {
    if (!file || !canProceedToPreview) return

    const matchKeyHeader = headers.find((h) => String(h.index) === matchKeyCol)
    const companyHeader = headers.find((h) => String(h.index) === trackingCompanyCol)
    const numberHeader = headers.find((h) => String(h.index) === trackingNumberCol)
    const statusHeader = platform === 'toss' ? headers.find((h) => String(h.index) === statusCol) : undefined

    const input: PlatformTemplateInput = {
      platform,
      file,
      sheetName,
      headerRow,
      dataStartRow,
      matchKeyColumnIndex: Number(matchKeyCol),
      matchKeyColumnName: matchKeyHeader?.name ?? '',
      trackingCompanyColumnIndex: Number(trackingCompanyCol),
      trackingCompanyColumnName: companyHeader?.name ?? '',
      trackingNumberColumnIndex: Number(trackingNumberCol),
      trackingNumberColumnName: numberHeader?.name ?? '',
      ...(platform === 'toss' && statusHeader
        ? {
            statusColumnIndex: Number(statusCol),
            statusColumnName: statusHeader.name,
            statusValue,
          }
        : {}),
    }

    try {
      setSaving(true)
      await saveTemplate(input)
      setEditing(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '양식 저장 실패')
    } finally {
      setSaving(false)
    }
  }, [
    file, canProceedToPreview, headers, matchKeyCol, trackingCompanyCol,
    trackingNumberCol, statusCol, statusValue, platform, sheetName,
    headerRow, dataStartRow, saveTemplate, resetForm,
  ])

  const handlePlatformChange = useCallback(
    (p: Platform) => {
      setPlatform(p)
      setEditing(false)
      resetForm()
    },
    [resetForm]
  )

  if (isLoading) {
    return (
      <>
        <PageHeader title="운송장 양식 관리" />
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="운송장 양식 관리" />

      <div className="space-y-5">
        {/* 플랫폼 탭 */}
        <div className="flex gap-1 rounded-radius-md border border-line bg-white p-1.5 shadow-level-1">
          {(['coupang', 'toss'] as const).map((p) => (
            <button
              key={p}
              className={cn(
                'flex-1 rounded-[8px] px-4 py-2.5 text-sm font-semibold transition-colors',
                platform === p
                  ? 'bg-primary-50 text-primary'
                  : 'text-t-secondary hover:bg-bg-subtle cursor-pointer'
              )}
              onClick={() => handlePlatformChange(p)}
            >
              {p === 'coupang' ? '쿠팡' : '토스'}
            </button>
          ))}
        </div>

        {/* 양식 등록 완료 상태 */}
        {template && !editing ? (
          <div className="rounded-radius-md border border-line bg-white p-6 shadow-level-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-green-100">
                  <Check size={16} className="text-green-600" />
                </div>
                <div className="text-[15px] font-bold text-t-strong">
                  양식 등록 완료
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={startEditing}>
                <RefreshCw size={14} />
                양식 변경
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="파일명" value={template.templateFileName} />
              <InfoRow label="시트명" value={template.sheetName} />
              <InfoRow label="헤더 행" value={`${template.headerRow}행`} />
              <InfoRow label="데이터 시작 행" value={`${template.dataStartRow}행`} />
            </div>

            <div className="mt-4 border-t border-line pt-4">
              <div className="mb-2 text-xs font-semibold text-t-mute">
                컬럼 매핑
              </div>
              <div className="flex flex-wrap gap-2">
                <MappingBadge
                  label="매칭키"
                  name={template.matchKeyColumnName}
                  index={template.matchKeyColumnIndex}
                />
                <MappingBadge
                  label="택배사"
                  name={template.trackingCompanyColumnName}
                  index={template.trackingCompanyColumnIndex}
                />
                <MappingBadge
                  label="운송장번호"
                  name={template.trackingNumberColumnName}
                  index={template.trackingNumberColumnIndex}
                />
                {template.statusColumnIndex != null && template.statusColumnName && (
                  <MappingBadge
                    label="주문상태"
                    name={template.statusColumnName}
                    index={template.statusColumnIndex}
                    extra={template.statusValue}
                  />
                )}
              </div>
            </div>
          </div>
        ) : editing ? (
          /* 양식 등록 흐름 */
          <div className="rounded-radius-md border border-line bg-white p-6 shadow-level-1">
            {/* 스텝 인디케이터 */}
            <div className="mb-6 flex gap-1">
              {STEPS.map((s, i) => {
                const stepIdx = STEPS.findIndex((x) => x.id === currentStep)
                const done = i < stepIdx
                const active = s.id === currentStep
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'flex flex-1 items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium',
                      active
                        ? 'bg-primary-50 text-primary'
                        : done
                          ? 'text-green-700'
                          : 'text-t-mute'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-5 w-5 place-items-center rounded-full text-xs font-bold',
                        active
                          ? 'bg-primary text-white'
                          : done
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-t-mute'
                      )}
                    >
                      {done ? <Check size={12} /> : i + 1}
                    </span>
                    {s.label}
                  </div>
                )
              })}
            </div>

            {/* Step 1: 파일 업로드 */}
            {currentStep === 'file' && (
              <div className="space-y-4">
                <p className="text-sm text-t-mute">
                  플랫폼에서 다운로드한 빈 운송장 업로드 양식을 올려주세요.
                  (.xlsx만 허용)
                </p>
                <FileUpload
                  accept=".xlsx"
                  onFileSelect={handleFileSelect}
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false)
                      resetForm()
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: 시트/행 설정 */}
            {currentStep === 'sheet' && (
              <div className="space-y-4">
                <div>
                  <Label>시트 선택</Label>
                  <Select value={sheetName} onValueChange={setSheetName}>
                    <SelectTrigger className="mt-1 w-full max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <div>
                    <Label>헤더 행 번호</Label>
                    <Input
                      type="number"
                      min={1}
                      className="mt-1"
                      value={headerRow}
                      onChange={(e) => setHeaderRow(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>데이터 시작 행 번호</Label>
                    <Input
                      type="number"
                      min={1}
                      className="mt-1"
                      value={dataStartRow}
                      onChange={(e) => setDataStartRow(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep('file')}>
                    이전
                  </Button>
                  <Button
                    disabled={!sheetName}
                    onClick={() => setCurrentStep('columns')}
                  >
                    다음
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: 컬럼 매핑 */}
            {currentStep === 'columns' && (
              <div className="space-y-4">
                <p className="text-sm text-t-mute">
                  각 필수 컬럼이 어디에 있는지 선택해 주세요. (1-based 인덱스로 저장)
                </p>

                {headers.length === 0 ? (
                  <div className="py-6 text-center text-sm text-t-mute">
                    헤더 행에서 컬럼을 찾을 수 없습니다. 시트/행 설정을 확인하세요.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 max-w-lg">
                    <ColumnSelect
                      label="매칭키 컬럼"
                      value={matchKeyCol}
                      onChange={setMatchKeyCol}
                      headers={headers}
                      required
                    />
                    <ColumnSelect
                      label="택배사 컬럼"
                      value={trackingCompanyCol}
                      onChange={setTrackingCompanyCol}
                      headers={headers}
                      required
                    />
                    <ColumnSelect
                      label="운송장번호 컬럼"
                      value={trackingNumberCol}
                      onChange={setTrackingNumberCol}
                      headers={headers}
                      required
                    />
                    {platform === 'toss' && (
                      <>
                        <ColumnSelect
                          label="주문상태 컬럼"
                          value={statusCol}
                          onChange={setStatusCol}
                          headers={headers}
                          required
                        />
                        <div className="col-span-2">
                          <Label>주문상태 변경값</Label>
                          <Input
                            className="mt-1 max-w-xs"
                            value={statusValue}
                            onChange={(e) => setStatusValue(e.target.value)}
                            placeholder="배송중"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {columnDuplicateError && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle size={14} />
                    {columnDuplicateError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep('sheet')}>
                    이전
                  </Button>
                  <Button
                    disabled={!canProceedToPreview}
                    onClick={() => setCurrentStep('preview')}
                  >
                    다음
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: 미리보기 */}
            {currentStep === 'preview' && (
              <div className="space-y-4">
                <p className="text-sm text-t-mute">
                  샘플 데이터를 확인하고 매핑이 올바른지 확인하세요.
                </p>

                {sampleRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-radius-md border border-line">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          {headers.map((h) => {
                            const colIdx = String(h.index)
                            let hint = ''
                            if (colIdx === matchKeyCol) hint = '매칭키'
                            else if (colIdx === trackingCompanyCol) hint = '택배사'
                            else if (colIdx === trackingNumberCol) hint = '운송장번호'
                            else if (colIdx === statusCol) hint = '주문상태'
                            return (
                              <TableHead key={h.index}>
                                <div>{h.name}</div>
                                {hint && (
                                  <Badge
                                    variant="outline"
                                    className="mt-0.5 text-[10px] text-primary"
                                  >
                                    {hint}
                                  </Badge>
                                )}
                              </TableHead>
                            )
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sampleRows.map((row, ri) => (
                          <TableRow key={ri}>
                            <TableCell className="text-t-mute text-xs">
                              {dataStartRow + ri}
                            </TableCell>
                            {row.map((cell, ci) => (
                              <TableCell key={ci} className="text-xs">
                                {cell || '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-t-mute">
                    샘플 데이터가 없습니다.
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('columns')}
                  >
                    이전
                  </Button>
                  <Button onClick={() => void handleSave()} disabled={saving}>
                    {saving && <LoadingSpinner size="sm" />}
                    저장
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 양식 미등록 상태 */
          <EmptyState
            icon={<FileUp size={32} />}
            title="운송장 양식이 등록되지 않았습니다"
            description="플랫폼에서 다운로드한 빈 운송장 양식을 등록하면, 매칭된 운송장을 해당 양식에 맞춰 출력합니다."
            action={
              <Button onClick={startEditing}>
                <Settings size={14} />
                양식 등록
              </Button>
            }
          />
        )}
      </div>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-t-mute">{label}</div>
      <div className="text-sm font-medium text-t-strong">{value}</div>
    </div>
  )
}

function MappingBadge({
  label,
  name,
  index,
  extra,
}: {
  label: string
  name: string
  index: number
  extra?: string
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-line bg-bg-subtle px-3 py-1 text-xs">
      <span className="font-medium text-t-strong">{label}</span>
      <span className="text-t-mute">
        {name} (열 {index})
      </span>
      {extra && (
        <span className="text-primary">→ &quot;{extra}&quot;</span>
      )}
    </div>
  )
}

function ColumnSelect({
  label,
  value,
  onChange,
  headers,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  headers: { index: number; name: string }[]
  required?: boolean
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="컬럼 선택" />
        </SelectTrigger>
        <SelectContent>
          {headers.map((h) => (
            <SelectItem key={h.index} value={String(h.index)}>
              열 {h.index}: {h.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
