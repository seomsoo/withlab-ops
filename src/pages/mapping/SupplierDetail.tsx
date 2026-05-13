import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, FileSpreadsheet, Trash2, Upload, Search, Package } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { getSupplierById, updateSupplier, deleteSupplier } from '@/lib/supabase/suppliers'
import {
  getSupplierTemplate,
  upsertSupplierTemplate,
  deleteSupplierTemplate,
  uploadTemplateFile,
  removeStorageFile,
} from '@/lib/supabase/supplierTemplates'
import { supplierFormSchema } from '@/lib/schemas'
import { validateExcelFile } from '@/utils/file'
import { readExcelFile, sheetToRows } from '@/utils/excel'

import { useSupplierProducts } from '@/hooks/useSupplierProducts'

import type {
  Supplier,
  SupplierTemplate,
  ColumnMappingItem,
  SystemField,
  PhoneFormat,
  SupplierProductColumnMapping,
  SupplierProductSystemField,
} from '@/types'
import type { SupplierFormData } from '@/lib/schemas'

const SYSTEM_FIELDS: { value: SystemField; label: string; required: boolean }[] = [
  { value: 'matchingKey', label: '매칭키 (주문번호)', required: true },
  { value: 'supplierProductName', label: '공급처 상품명', required: false },
  { value: 'platformProductName', label: '플랫폼 상품명 (쿠팡: 노출상품명, 토스: 상품명+옵션명)', required: false },
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
  { value: 'orderDate', label: '주문일시', required: false },
  { value: 'senderAddress', label: '보내는분 주소 (=수취인 주소)', required: false },
  { value: 'empty', label: '(빈 칸)', required: false },
]

const REQUIRED_FIELDS: SystemField[] = [
  'matchingKey',
  'quantity',
  'recipientName',
  'recipientPhone',
  'address',
]

const PRODUCT_SYSTEM_FIELDS: { value: SupplierProductSystemField; label: string }[] = [
  { value: 'productName', label: '상품명' },
  { value: 'productCode', label: '상품코드' },
  { value: 'optionName', label: '옵션명' },
  { value: 'category', label: '분류' },
  { value: 'price', label: '가격' },
  { value: 'stockStatus', label: '재고상태' },
  { value: 'courier', label: '택배사' },
  { value: 'empty', label: '(사용 안 함)' },
]

const STOCK_BADGE: Record<string, { label: string; className: string }> = {
  available: { label: '재고있음', className: 'bg-success/10 text-success' },
  soldout: { label: '품절', className: 'bg-error/10 text-error' },
  unknown: { label: '재고미확인', className: 'bg-gray-100 text-gray-500' },
}

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

function validateMappings(columnMappings: ColumnMappingItem[]): string | null {
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
  const hasProductName =
    mappedFields.has('supplierProductName') || mappedFields.has('platformProductName')
  if (!hasProductName) {
    return '품목명 필드 미매핑: 공급처 상품명 또는 플랫폼 상품명 중 하나를 매핑하세요'
  }
  return null
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [template, setTemplate] = useState<SupplierTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  // --- 기본 정보 ---
  const [infoForm, setInfoForm] = useState<SupplierFormData>({ name: '', contact: '', memo: '' })
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  // --- 상품 목록 (hook) ---
  const {
    products: spProducts,
    template: spTemplate,
    saveTemplate: spSaveTemplate,
    removeTemplate: spRemoveTemplate,
    uploadProducts: spUploadProducts,
  } = useSupplierProducts(id ?? '')

  // --- 상품 양식 편집 ---
  const [spEditing, setSpEditing] = useState(false)
  const [spFile, setSpFile] = useState<File | null>(null)
  const [spSheetNames, setSpSheetNames] = useState<string[]>([])
  const [spSheetName, setSpSheetName] = useState('')
  const [spHeaderRow, setSpHeaderRow] = useState(1)
  const [spDataStartRow, setSpDataStartRow] = useState(2)
  const [spColMappings, setSpColMappings] = useState<SupplierProductColumnMapping[]>([])
  const [spWorkbook, setSpWorkbook] = useState<Awaited<ReturnType<typeof readExcelFile>> | null>(null)
  const [spSaving, setSpSaving] = useState(false)
  const [spUploading, setSpUploading] = useState(false)
  const [spSearch, setSpSearch] = useState('')
  const [spDeleteOpen, setSpDeleteOpen] = useState(false)

  // --- 발주서 양식 ---
  const [templateEditing, setTemplateEditing] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheetName, setSheetName] = useState('')
  const [headerRow, setHeaderRow] = useState(1)
  const [dataStartRow, setDataStartRow] = useState(2)
  const [columnMappings, setColumnMappings] = useState<ColumnMappingItem[]>([])
  const [workbook, setWorkbook] = useState<Awaited<ReturnType<typeof readExcelFile>> | null>(null)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [deleteTemplateOpen, setDeleteTemplateOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const [s, t] = await Promise.all([
        getSupplierById(id),
        getSupplierTemplate(id),
      ])
      if (!s) {
        toast.error('공급처를 찾을 수 없습니다')
        navigate('/mapping/suppliers', { replace: true })
        return
      }
      setSupplier(s)
      setTemplate(t)
      setInfoForm({ name: s.name, contact: s.contact ?? '', memo: s.memo ?? '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '데이터 조회 실패')
      navigate('/mapping/suppliers', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    let alive = true
    void (async () => {
      if (!id) return
      try {
        setLoading(true)
        const [s, t] = await Promise.all([
          getSupplierById(id),
          getSupplierTemplate(id),
        ])
        if (!alive) return
        if (!s) {
          toast.error('공급처를 찾을 수 없습니다')
          navigate('/mapping/suppliers', { replace: true })
          return
        }
        setSupplier(s)
        setTemplate(t)
        setInfoForm({ name: s.name, contact: s.contact ?? '', memo: s.memo ?? '' })
      } catch (err) {
        if (!alive) return
        toast.error(err instanceof Error ? err.message : '데이터 조회 실패')
        navigate('/mapping/suppliers', { replace: true })
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id, navigate])

  // --- 기본 정보 핸들러 ---
  async function handleInfoSave() {
    const result = supplierFormSchema.safeParse(infoForm)
    if (!result.success) {
      setInfoError(result.error.issues[0]?.message ?? '입력값을 확인해주세요')
      return
    }
    if (!id) return
    setInfoSaving(true)
    try {
      const updated = await updateSupplier(id, result.data)
      setSupplier(updated)
      setInfoError(null)
      toast.success('공급처 정보를 저장했습니다')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setInfoSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!id) return
    setDeactivating(true)
    try {
      await deleteSupplier(id)
      toast.success('공급처를 비활성화했습니다')
      navigate('/mapping/suppliers', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '비활성화 실패')
    } finally {
      setDeactivating(false)
    }
  }

  // --- 발주서 양식 핸들러 ---
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

  function startTemplateEdit() {
    if (template) {
      setSheetName(template.sheetName)
      setHeaderRow(template.headerRow)
      setDataStartRow(template.dataStartRow)
      setColumnMappings(template.columnMappings)
    } else {
      setSheetName('')
      setHeaderRow(1)
      setDataStartRow(2)
      setColumnMappings([])
    }
    setFile(null)
    setSheetNames([])
    setWorkbook(null)
    setTemplateEditing(true)
  }

  function cancelTemplateEdit() {
    setTemplateEditing(false)
    setFile(null)
    setSheetNames([])
    setWorkbook(null)
    setColumnMappings([])
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

  const handleSheetChange = useCallback(
    (newSheet: string) => {
      setSheetName(newSheet)
      if (workbook) {
        buildMappingsFromSheet(workbook, newSheet, headerRow)
      }
    },
    [workbook, headerRow, buildMappingsFromSheet]
  )

  function updateMapping(idx: number, field: 'systemField' | 'format', value: string) {
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

  async function handleTemplateSave() {
    if (!id) return
    if (!file && !template) {
      toast.error('템플릿 파일을 업로드해주세요')
      return
    }

    const error = validateMappings(columnMappings)
    if (error) {
      toast.error(error)
      return
    }

    setTemplateSaving(true)
    try {
      if (file) {
        const templatePath = await uploadTemplateFile(id, file)
        try {
          await upsertSupplierTemplate({
            supplierId: id,
            templatePath,
            templateFileName: file.name,
            sheetName,
            headerRow,
            dataStartRow,
            columnMappings,
          })
        } catch (upsertErr) {
          await removeStorageFile(templatePath)
          throw upsertErr
        }
        if (template?.templatePath && template.templatePath !== templatePath) {
          await removeStorageFile(template.templatePath)
        }
      } else if (template) {
        await upsertSupplierTemplate({
          supplierId: id,
          templatePath: template.templatePath,
          templateFileName: template.templateFileName,
          sheetName,
          headerRow,
          dataStartRow,
          columnMappings,
        })
      }
      toast.success('양식이 저장되었습니다')
      setTemplateEditing(false)
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '양식 저장 실패')
    } finally {
      setTemplateSaving(false)
    }
  }

  async function handleTemplateDelete() {
    if (!template) return
    try {
      await deleteSupplierTemplate(template.id)
      toast.success('양식이 삭제되었습니다')
      setTemplateEditing(false)
      setTemplate(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '양식 삭제 실패')
    } finally {
      setDeleteTemplateOpen(false)
    }
  }

  // --- 상품 양식 핸들러 ---
  async function handleSpFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      validateExcelFile(f)
      const wb = await readExcelFile(f)
      setSpFile(f)
      setSpWorkbook(wb)
      setSpSheetNames(wb.SheetNames)
      setSpSheetName(wb.SheetNames[0] ?? '')
      if (wb.SheetNames[0]) {
        const sheet = wb.Sheets[wb.SheetNames[0]]
        if (sheet) {
          const rows = sheetToRows(sheet)
          const headerData = rows[0] ?? []
          setSpColMappings(
            headerData.map((cell, idx) => ({
              targetColumnIndex: idx,
              targetHeaderName: cell !== null && cell !== undefined ? String(cell).trim() : '',
              systemField: 'empty' as SupplierProductSystemField,
            }))
          )
        }
      }
      setSpEditing(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '파일을 읽을 수 없습니다')
    }
  }

  function handleSpSheetChange(name: string) {
    setSpSheetName(name)
    if (!spWorkbook) return
    const sheet = spWorkbook.Sheets[name]
    if (!sheet) return
    const rows = sheetToRows(sheet)
    const headerData = rows[spHeaderRow - 1] ?? []
    setSpColMappings(
      headerData.map((cell, idx) => ({
        targetColumnIndex: idx,
        targetHeaderName: cell !== null && cell !== undefined ? String(cell).trim() : '',
        systemField: 'empty' as SupplierProductSystemField,
      }))
    )
  }

  function handleSpHeaderRowChange(row: number) {
    setSpHeaderRow(row)
    if (row >= spDataStartRow) setSpDataStartRow(row + 1)
    if (!spWorkbook || !spSheetName) return
    const sheet = spWorkbook.Sheets[spSheetName]
    if (!sheet) return
    const rows = sheetToRows(sheet)
    const headerData = rows[row - 1] ?? []
    setSpColMappings(
      headerData.map((cell, idx) => ({
        targetColumnIndex: idx,
        targetHeaderName: cell !== null && cell !== undefined ? String(cell).trim() : '',
        systemField: 'empty' as SupplierProductSystemField,
      }))
    )
  }

  async function handleSpTemplateSave() {
    if (!spFile || !id) return
    const hasProductName = spColMappings.some((m) => m.systemField === 'productName')
    if (!hasProductName) {
      toast.error('필수 필드 미매핑: 상품명')
      return
    }
    try {
      setSpSaving(true)
      const savedTpl = await spSaveTemplate({
        file: spFile,
        sheetName: spSheetName,
        headerRow: spHeaderRow,
        dataStartRow: spDataStartRow,
        columnMappings: spColMappings,
        existingTemplatePath: spTemplate?.templatePath,
      })

      await spUploadProducts(spFile, savedTpl)

      setSpEditing(false)
      setSpFile(null)
      setSpWorkbook(null)
    } catch {
      // toast handled in hook
    } finally {
      setSpSaving(false)
    }
  }

  async function handleSpUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (!f) return
      try {
        validateExcelFile(f)
        setSpUploading(true)
        await spUploadProducts(f)
      } catch {
        // toast handled in hook or validateExcelFile
      } finally {
        setSpUploading(false)
      }
    }
    input.click()
  }

  async function handleSpTemplateDelete() {
    try {
      await spRemoveTemplate()
      setSpEditing(false)
    } catch {
      // toast handled in hook
    } finally {
      setSpDeleteOpen(false)
    }
  }

  const filteredProducts = spSearch
    ? spProducts.filter(
        (p) =>
          p.productName.includes(spSearch) ||
          p.productCode.includes(spSearch) ||
          p.optionName.includes(spSearch)
      )
    : spProducts

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!supplier) return null

  const infoChanged =
    infoForm.name !== supplier.name ||
    (infoForm.contact ?? '') !== (supplier.contact ?? '') ||
    (infoForm.memo ?? '') !== (supplier.memo ?? '')

  return (
    <>
      <Link
        to="/mapping/suppliers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-t-mute hover:text-t-strong"
      >
        <ChevronLeft size={16} />
        공급처 목록
      </Link>

      <PageHeader
        title={supplier.name}
        actions={
          !supplier.isActive ? (
            <StatusBadge variant="muted">비활성</StatusBadge>
          ) : undefined
        }
      />

      {/* 기본 정보 */}
      <section className="rounded-radius-lg border border-line bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-t-strong">기본 정보</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>
              공급처 이름 <span className="text-error">*</span>
            </Label>
            <Input
              value={infoForm.name}
              onChange={(e) => {
                setInfoForm((f) => ({ ...f, name: e.target.value }))
                setInfoError(null)
              }}
              placeholder="예: A농장"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>연락처</Label>
            <Input
              value={infoForm.contact ?? ''}
              onChange={(e) =>
                setInfoForm((f) => ({ ...f, contact: e.target.value }))
              }
              placeholder="064-123-4567"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <Label>메모</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-t-faint focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={infoForm.memo ?? ''}
            onChange={(e) =>
              setInfoForm((f) => ({ ...f, memo: e.target.value }))
            }
            placeholder="주요 품목, 시즌 등 자유롭게 적어주세요"
            rows={3}
          />
        </div>
        {infoError && (
          <p className="mt-2 text-sm text-error" role="alert">
            {infoError}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <div>
            {supplier.isActive && (
              <Button
                variant="outline"
                size="sm"
                className="text-error hover:bg-error-light hover:text-error"
                onClick={() => setDeactivateOpen(true)}
              >
                비활성화
              </Button>
            )}
          </div>
          <Button
            onClick={handleInfoSave}
            disabled={infoSaving || !infoChanged}
          >
            {infoSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </section>

      {/* 발주서 양식 */}
      <section className="mt-6 rounded-radius-lg border border-line bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-t-strong">발주서 양식</h2>
          {template && !templateEditing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={startTemplateEdit}>
                수정
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTemplateOpen(true)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>

        {!template && !templateEditing ? (
          <EmptyState
            icon={<FileSpreadsheet size={32} />}
            title="등록된 양식이 없습니다"
            description="공급처별 발주서 양식을 등록하면 발주서를 자동 생성할 수 있습니다."
            action={
              <Button onClick={startTemplateEdit}>양식 등록</Button>
            }
          />
        ) : !templateEditing && template ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-t-mute">파일</span>
                <p className="mt-0.5 font-medium text-t-strong">
                  {template.templateFileName}
                </p>
              </div>
              <div>
                <span className="text-t-mute">시트</span>
                <p className="mt-0.5 font-medium text-t-strong">
                  {template.sheetName}
                </p>
              </div>
              <div>
                <span className="text-t-mute">헤더행 / 데이터 시작행</span>
                <p className="mt-0.5 font-medium text-t-strong">
                  {template.headerRow}행 / {template.dataStartRow}행
                </p>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-t-strong">
                컬럼 매핑 ({template.columnMappings.length}개)
              </h3>
              <div className="max-h-[300px] overflow-auto rounded-md border border-line">
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
                    {template.columnMappings.map((m, idx) => {
                      const sf = SYSTEM_FIELDS.find((f) => f.value === m.systemField)
                      return (
                        <tr key={idx} className="border-t border-line/50">
                          <td className="px-3 py-1.5 font-mono text-xs text-t-mute">
                            {colIndexToLetter(m.targetColumnIndex)}
                          </td>
                          <td className="px-3 py-1.5 text-xs">
                            {m.targetHeaderName}
                          </td>
                          <td className="px-3 py-1.5 text-xs">
                            {sf?.label ?? m.systemField}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-t-mute">
                            {m.format ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 grid grid-cols-2 gap-4">
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
                {template && !file && (
                  <p className="mt-1 text-xs text-t-mute">
                    현재: {template.templateFileName}
                  </p>
                )}
              </div>
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
                    placeholder={template?.sheetName ?? 'Sheet1'}
                  />
                )}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
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
              <Button variant="outline" onClick={cancelTemplateEdit}>
                취소
              </Button>
              <Button onClick={handleTemplateSave} disabled={templateSaving}>
                {templateSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 상품 목록 */}
      <section className="rounded-radius-lg border border-line bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-t-strong">
            <Package size={16} className="mr-1.5 inline-block" />
            상품 목록
          </h2>
          <div className="flex gap-2">
            {spTemplate && !spEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSpDeleteOpen(true)}
                >
                  <Trash2 size={14} className="mr-1" />
                  양식 삭제
                </Button>
                <Button
                  size="sm"
                  onClick={handleSpUpload}
                  disabled={spUploading}
                >
                  <Upload size={14} className="mr-1" />
                  {spUploading ? '업로드 중...' : '상품 업로드'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 양식 미등록 */}
        {!spTemplate && !spEditing && (
          <EmptyState
            title="상품 양식이 등록되지 않았습니다"
            description="공급처 상품 목록 엑셀의 컬럼 매핑을 먼저 설정해주세요."
            action={
              <label className="cursor-pointer">
                <Button size="sm" asChild>
                  <span>
                    <FileSpreadsheet size={14} className="mr-1" />
                    양식 설정
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleSpFileChange}
                />
              </label>
            }
          />
        )}

        {/* 양식 등록됨, 상품 없음 */}
        {spTemplate && !spEditing && spProducts.length === 0 && (
          <div className="py-8 text-center">
            <p className="mb-1 text-sm text-t-mute">
              양식: {spTemplate.templateFileName}
            </p>
            <p className="mb-4 text-xs text-t-faint">
              시트: {spTemplate.sheetName} / 헤더: {spTemplate.headerRow}행 /
              데이터: {spTemplate.dataStartRow}행
            </p>
            <Button size="sm" onClick={handleSpUpload} disabled={spUploading}>
              <Upload size={14} className="mr-1" />
              {spUploading ? '업로드 중...' : '상품 업로드'}
            </Button>
          </div>
        )}

        {/* 양식 등록됨 + 상품 있음 */}
        {spTemplate && !spEditing && spProducts.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between text-xs text-t-mute">
              <div>
                <span>양식: {spTemplate.templateFileName}</span>
                {spTemplate.lastUploadedAt && (
                  <span className="ml-3">
                    마지막 갱신:{' '}
                    {new Date(spTemplate.lastUploadedAt).toLocaleDateString('ko-KR')}{' '}
                    {new Date(spTemplate.lastUploadedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{spTemplate.lastUploadedCount}개
                    {spTemplate.lastInvalidCount > 0 && (
                      <span className="text-error"> (오류 {spTemplate.lastInvalidCount}건)</span>
                    )}
                  </span>
                )}
              </div>
              <label className="cursor-pointer text-primary hover:underline">
                양식 재설정
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleSpFileChange}
                />
              </label>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-t-faint"
                />
                <Input
                  value={spSearch}
                  onChange={(e) => setSpSearch(e.target.value)}
                  placeholder="상품명 또는 코드 검색..."
                  className="pl-8"
                />
              </div>
              <span className="text-xs text-t-mute">
                {filteredProducts.length}/{spProducts.length}개
              </span>
            </div>

            <div className="max-h-[400px] overflow-auto rounded-md border border-line">
              <table className="min-w-[600px] w-full text-sm">
                <thead className="sticky top-0 bg-bg-subtle">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-t-mute">
                      코드
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-t-mute">
                      상품명
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-t-mute">
                      옵션명
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-t-mute">
                      가격
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-t-mute">
                      재고
                    </th>
                    <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-t-mute">
                      택배사
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.slice(0, 100).map((p) => {
                    const badge = STOCK_BADGE[p.stockStatus] ?? STOCK_BADGE.unknown!
                    return (
                      <tr key={p.id} className="border-t border-line hover:bg-bg-subtle/50">
                        <td className="px-3 py-1.5 font-mono text-xs text-t-mute">
                          {p.productCode || '-'}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-1.5" title={p.productName}>
                          {p.productName}
                        </td>
                        <td className="px-3 py-1.5 text-t-mute">
                          {p.optionName || '-'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {p.price !== null
                            ? p.price.toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-t-mute">
                          {p.courier || '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-t-faint">
                        {spSearch ? '검색 결과가 없습니다' : '등록된 상품이 없습니다'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredProducts.length > 100 && (
              <p className="mt-2 text-center text-xs text-t-faint">
                처음 100개만 표시됩니다 (총 {filteredProducts.length}개)
              </p>
            )}
          </div>
        )}

        {/* 상품 양식 편집 */}
        {spEditing && spFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-md bg-bg-subtle px-4 py-3">
              <FileSpreadsheet size={18} className="text-primary" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{spFile.name}</p>
                <p className="text-xs text-t-faint">
                  시트: {spSheetNames.join(', ')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>시트</Label>
                <Select value={spSheetName} onValueChange={handleSpSheetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {spSheetNames.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>헤더 행</Label>
                <Input
                  type="number"
                  min={1}
                  value={spHeaderRow}
                  onChange={(e) => handleSpHeaderRowChange(Number(e.target.value) || 1)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>데이터 시작 행</Label>
                <Input
                  type="number"
                  min={spHeaderRow + 1}
                  value={spDataStartRow}
                  onChange={(e) =>
                    setSpDataStartRow(Math.max(spHeaderRow + 1, Number(e.target.value) || spHeaderRow + 1))
                  }
                />
              </div>
            </div>

            {spColMappings.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-t-strong">
                  컬럼 매핑
                  <span className="ml-2 text-xs font-normal text-t-faint">
                    (상품명 필수)
                  </span>
                </h3>
                <div className="max-h-[300px] overflow-auto rounded-md border border-line">
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
                      </tr>
                    </thead>
                    <tbody>
                      {spColMappings.map((m, idx) => (
                        <tr key={idx} className="border-t border-line">
                          <td className="px-3 py-1.5 font-mono text-xs text-t-faint">
                            {colIndexToLetter(idx + 1)}열
                          </td>
                          <td className="px-3 py-1.5">
                            {m.targetHeaderName || '(비어있음)'}
                          </td>
                          <td className="px-3 py-1.5">
                            <select
                              value={m.systemField}
                              onChange={(e) => {
                                const updated = [...spColMappings]
                                updated[idx] = {
                                  ...m,
                                  systemField: e.target.value as SupplierProductSystemField,
                                }
                                setSpColMappings(updated)
                              }}
                              className="rounded border border-line px-2 py-1 text-xs"
                            >
                              {PRODUCT_SYSTEM_FIELDS.map((f) => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
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
                  setSpEditing(false)
                  setSpFile(null)
                  setSpWorkbook(null)
                }}
              >
                취소
              </Button>
              <Button onClick={handleSpTemplateSave} disabled={spSaving}>
                {spSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 상품 양식 삭제 ConfirmDialog */}
      <ConfirmDialog
        open={spDeleteOpen}
        title="상품 양식 삭제"
        description="상품 양식을 삭제하면 등록된 상품 데이터도 함께 삭제됩니다."
        confirmText="삭제"
        variant="destructive"
        onConfirm={handleSpTemplateDelete}
        onOpenChange={(open) => {
          if (!open) setSpDeleteOpen(false)
        }}
      />

      {/* 비활성화 ConfirmDialog */}
      <ConfirmDialog
        open={deactivateOpen}
        title="공급처 비활성화"
        description={`${supplier.name}을(를) 비활성화하시겠습니까? 기존 매핑과 과거 데이터는 유지되지만, 새 매핑 생성 시에는 선택할 수 없습니다.`}
        confirmText="비활성화"
        variant="destructive"
        loading={deactivating}
        onConfirm={handleDeactivate}
        onOpenChange={(open) => {
          if (!open) setDeactivateOpen(false)
        }}
      />

      {/* 양식 삭제 ConfirmDialog */}
      <ConfirmDialog
        open={deleteTemplateOpen}
        title="양식 삭제"
        description="이 양식을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
        confirmText="삭제"
        variant="destructive"
        onConfirm={handleTemplateDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteTemplateOpen(false)
        }}
      />
    </>
  )
}
