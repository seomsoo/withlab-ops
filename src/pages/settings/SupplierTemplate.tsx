import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  FileSpreadsheet,
  Plus,
  Trash2,
} from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useSupplierTemplates } from '@/hooks/useSupplierTemplate'
import { useSuppliers } from '@/hooks/useSuppliers'
import { validateExcelFile } from '@/utils/file'
import { readExcelFile, sheetToRows } from '@/utils/excel'
import { upsertSupplierTemplate } from '@/lib/supabase/supplierTemplates'

import type { ColumnMappingItem, SystemField, PhoneFormat, SupplierTemplate as SupplierTemplateType } from '@/types'

const SYSTEM_FIELDS: { value: SystemField; label: string; required: boolean }[] = [
  { value: 'matchingKey', label: '매칭키 (주문번호)', required: true },
  { value: 'supplierProductName', label: '공급처 상품명', required: true },
  { value: 'quantity', label: '수량', required: true },
  { value: 'recipientName', label: '수취인명', required: true },
  { value: 'recipientPhone', label: '수취인 연락처', required: true },
  { value: 'address', label: '주소', required: true },
  { value: 'orderNo', label: '주문번호', required: false },
  { value: 'orderItemNo', label: '주문상품번호', required: false },
  { value: 'supplierProductCode', label: '공급처 상품코드', required: false },
  { value: 'zipCode', label: '우편번호', required: false },
  { value: 'deliveryMessage', label: '배송메시지', required: false },
  { value: 'buyerName', label: '주문자명', required: false },
  { value: 'buyerPhone', label: '주문자 연락처', required: false },
  { value: 'empty', label: '(빈 칸)', required: false },
]

const REQUIRED_FIELDS: SystemField[] = [
  'matchingKey',
  'supplierProductName',
  'quantity',
  'recipientName',
  'recipientPhone',
  'address',
]

function colIndexToLetter(idx: number): string {
  let result = ''
  let n = idx
  while (n > 0) {
    n--
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

export default function SupplierTemplate() {
  const { templates, loading, saveTemplate, removeTemplate } =
    useSupplierTemplates()
  const { suppliers } = useSuppliers()
  const [editMode, setEditMode] = useState(false)
  const [editTarget, setEditTarget] = useState<SupplierTemplateType | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetName, setSheetName] = useState('')
  const [headerRow, setHeaderRow] = useState(1)
  const [dataStartRow, setDataStartRow] = useState(2)
  const [columnMappings, setColumnMappings] = useState<ColumnMappingItem[]>([])
  const [saving, setSaving] = useState(false)
  const [workbook, setWorkbook] = useState<ReturnType<typeof readExcelFile> extends Promise<infer T> ? T : never>(null as never)

  const buildMappingsFromSheet = useCallback(
    (wb: Awaited<ReturnType<typeof readExcelFile>>, sheet: string, hRow: number) => {
      const ws = wb.Sheets[sheet]
      if (!ws) return
      const rows = sheetToRows(ws)
      const headerRowData = rows[hRow - 1] ?? []
      const headers = headerRowData.map((cell) =>
        cell != null ? String(cell) : ''
      )
      const mappings: ColumnMappingItem[] = headers
        .map((h, i) => ({
          targetColumnIndex: i + 1,
          targetHeaderName: h,
          systemField: 'empty' as SystemField,
        }))
        .filter((m) => m.targetHeaderName.trim() !== '')
      setColumnMappings(mappings)
    },
    []
  )

  const handleSheetChange = useCallback(
    (newSheet: string) => {
      setSheetName(newSheet)
      if (workbook) {
        buildMappingsFromSheet(workbook, newSheet, headerRow)
      }
    },
    [workbook, headerRow, buildMappingsFromSheet]
  )

  const resetForm = () => {
    setSelectedSupplierId('')
    setFile(null)
    setSheetNames([])
    setSheetName('')
    setHeaderRow(1)
    setDataStartRow(2)
    setColumnMappings([])
    setEditTarget(null)
    setWorkbook(null as never)
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f) return
      try {
        validateExcelFile(f)
        setFile(f)
        const wb = await readExcelFile(f)
        setWorkbook(wb)
        const names = wb.SheetNames
        setSheetNames(names)
        if (names.length > 0) {
          setSheetName(names[0]!)
          buildMappingsFromSheet(wb, names[0]!, headerRow)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '파일 읽기 실패')
      }
    },
    [headerRow, buildMappingsFromSheet]
  )

  const handleEdit = (template: SupplierTemplateType) => {
    setEditTarget(template)
    setSelectedSupplierId(template.supplierId)
    setSheetName(template.sheetName)
    setHeaderRow(template.headerRow)
    setDataStartRow(template.dataStartRow)
    setColumnMappings(template.columnMappings)
    setEditMode(true)
  }

  const handleNew = () => {
    resetForm()
    setEditMode(true)
  }

  const updateMapping = (
    idx: number,
    field: 'systemField' | 'format',
    value: string
  ) => {
    setColumnMappings((prev) =>
      prev.map((m, i) => {
        if (i !== idx) return m
        if (field === 'systemField') {
          const updated = { ...m, systemField: value as SystemField }
          if (value !== 'recipientPhone' && value !== 'buyerPhone') {
            delete updated.format
          }
          return updated
        }
        return { ...m, format: value as PhoneFormat }
      })
    )
  }

  const validateMappings = (): string | null => {
    const mappedFields = new Set<string>(
      columnMappings.map((m) => m.systemField).filter((f) => f !== 'empty')
    )
    const missing = REQUIRED_FIELDS.filter((f) => !mappedFields.has(f))
    if (missing.length > 0) {
      const labels = missing.map(
        (f) => SYSTEM_FIELDS.find((sf) => sf.value === f)?.label ?? f
      )
      return `필수 필드 미매핑: ${labels.join(', ')}`
    }
    return null
  }

  const handleSave = async () => {
    if (!selectedSupplierId) {
      toast.error('공급처를 선택해주세요')
      return
    }
    if (!file && !editTarget) {
      toast.error('템플릿 파일을 업로드해주세요')
      return
    }

    const error = validateMappings()
    if (error) {
      toast.error(error)
      return
    }

    const activeFile = file
    if (!activeFile && !editTarget) return

    try {
      setSaving(true)
      if (activeFile) {
        await saveTemplate({
          supplierId: selectedSupplierId,
          file: activeFile,
          sheetName,
          headerRow,
          dataStartRow,
          columnMappings,
          existingTemplatePath: editTarget?.templatePath,
        })
      } else if (editTarget) {
        await upsertSupplierTemplate({
          supplierId: selectedSupplierId,
          templatePath: editTarget.templatePath,
          templateFileName: editTarget.templateFileName,
          sheetName,
          headerRow,
          dataStartRow,
          columnMappings,
        })
        toast.success('양식이 저장되었습니다')
      }
      setEditMode(false)
      resetForm()
    } catch {
      // toast handled
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeTemplate(deleteId)
    setDeleteId(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
      <PageHeader title="발주서 양식 관리" />

      {!editMode ? (
        <>
          <div className="mb-4 flex justify-end">
            <Button onClick={handleNew}>
              <Plus size={16} className="mr-1" />
              양식 등록
            </Button>
          </div>

          {templates.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet size={32} />}
              title="등록된 양식이 없습니다"
              description="공급처별 발주서 양식을 등록하세요"
            />
          ) : (
            <div className="space-y-3">
              {templates.map((t) => {
                const supplier = suppliers.find(
                  (s) => s.id === t.supplierId
                )
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-radius-md border border-line bg-white px-4 py-3"
                  >
                    <div>
                      <div className="font-semibold text-t-strong">
                        {supplier?.name ?? '(삭제된 공급처)'}
                      </div>
                      <div className="mt-0.5 text-xs text-t-mute">
                        {t.templateFileName} · 시트: {t.sheetName} ·
                        매핑 {t.columnMappings.length}개
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(t)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(t.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-radius-md border border-line bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-t-strong">
            {editTarget ? '양식 수정' : '양식 등록'}
          </h2>

          <div className="mb-4 grid grid-cols-2 gap-4">
            {/* Supplier */}
            <div>
              <label className="mb-1 block text-sm font-medium text-t-secondary">
                공급처
              </label>
              <Select
                value={selectedSupplierId}
                onValueChange={setSelectedSupplierId}
                disabled={!!editTarget}
              >
                <SelectTrigger>
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
            </div>

            {/* File */}
            <div>
              <label className="mb-1 block text-sm font-medium text-t-secondary">
                템플릿 파일 (.xlsx)
              </label>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="block w-full text-sm text-t-secondary file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
              />
              {editTarget && !file && (
                <p className="mt-1 text-xs text-t-mute">
                  현재: {editTarget.templateFileName}
                </p>
              )}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-4">
            {/* Sheet */}
            <div>
              <label className="mb-1 block text-sm font-medium text-t-secondary">
                시트명
              </label>
              {sheetNames.length > 0 ? (
                <Select value={sheetName} onValueChange={handleSheetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetNames.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="w-full rounded-md border border-line px-3 py-2 text-sm"
                  placeholder="Sheet1"
                />
              )}
            </div>

            {/* Header row */}
            <div>
              <label className="mb-1 block text-sm font-medium text-t-secondary">
                헤더 행 번호
              </label>
              <input
                type="number"
                min={1}
                value={headerRow}
                onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)}
                className="w-full rounded-md border border-line px-3 py-2 text-sm"
              />
            </div>

            {/* Data start row */}
            <div>
              <label className="mb-1 block text-sm font-medium text-t-secondary">
                데이터 시작 행 번호
              </label>
              <input
                type="number"
                min={1}
                value={dataStartRow}
                onChange={(e) =>
                  setDataStartRow(parseInt(e.target.value) || 2)
                }
                className="w-full rounded-md border border-line px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Column Mappings Table */}
          {columnMappings.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-t-strong">
                컬럼 매핑
              </h3>
              <div className="max-h-[400px] overflow-auto rounded-md border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-bg-subtle">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-t-mute">
                        컬럼
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-t-mute">
                        헤더명
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-t-mute">
                        시스템 필드
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-t-mute">
                        포맷
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {columnMappings.map((m, idx) => (
                      <tr key={idx} className="border-t border-line/50">
                        <td className="px-3 py-1.5 font-mono text-xs text-t-mute">
                          {colIndexToLetter(m.targetColumnIndex)} ({m.targetColumnIndex})
                        </td>
                        <td className="px-3 py-1.5 text-xs">
                          {m.targetHeaderName}
                        </td>
                        <td className="px-3 py-1.5">
                          <select
                            value={m.systemField}
                            onChange={(e) =>
                              updateMapping(idx, 'systemField', e.target.value)
                            }
                            className="rounded border border-line px-2 py-1 text-xs"
                          >
                            {SYSTEM_FIELDS.map((sf) => (
                              <option key={sf.value} value={sf.value}>
                                {sf.label}
                                {sf.required ? ' *' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5">
                          {(m.systemField === 'recipientPhone' ||
                            m.systemField === 'buyerPhone') && (
                            <select
                              value={m.format ?? 'raw'}
                              onChange={(e) =>
                                updateMapping(idx, 'format', e.target.value)
                              }
                              className="rounded border border-line px-2 py-1 text-xs"
                            >
                              <option value="raw">원본</option>
                              <option value="hyphen">하이픈</option>
                              <option value="digits">숫자만</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditMode(false)
                resetForm()
              }}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장중...' : '저장'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="양식 삭제"
        description="이 양식을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
        confirmText="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
      />
    </>
  )
}
