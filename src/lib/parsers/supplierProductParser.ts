import type { StockStatus, SupplierProductColumnMapping } from '@/types'

export type ParsedSupplierProduct = {
  productCode: string
  productName: string
  optionName: string
  category: string
  price: number | null
  stockStatus: StockStatus
  stockRaw: string
  courier: string
  extra: Record<string, unknown>
}

export type SupplierProductParseResult = {
  products: ParsedSupplierProduct[]
  invalidRows: { rowNumber: number; reason: string; rawData: unknown[] }[]
  meta: {
    totalRows: number
    validCount: number
    invalidCount: number
    skippedRows: number
  }
}

export function parseSupplierProducts(input: {
  rows: unknown[][]
  columnMappings: SupplierProductColumnMapping[]
  headerRow: number
  dataStartRow: number
}): SupplierProductParseResult {
  const { rows, columnMappings, headerRow, dataStartRow } = input
  const products: ParsedSupplierProduct[] = []
  const invalidRows: { rowNumber: number; reason: string; rawData: unknown[] }[] = []
  let skippedRows = 0

  const headerRowData = rows[headerRow - 1] as unknown[] | undefined

  const dataRows = rows.slice(dataStartRow - 1)
  const totalRows = dataRows.length

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!
    const rowNumber = dataStartRow + i

    if (isEmptyRow(row)) {
      skippedRows++
      continue
    }

    const fieldMap = extractFields(row, columnMappings)
    const productName = cellToString(fieldMap.get('productName'))

    if (!productName) {
      invalidRows.push({
        rowNumber,
        reason: '상품명 누락',
        rawData: row,
      })
      continue
    }

    const extra = buildExtra(row, columnMappings, headerRowData)
    const stockResult = normalizeStockStatus(fieldMap.get('stockStatus'))

    products.push({
      productCode: cellToString(fieldMap.get('productCode')),
      productName,
      optionName: cellToString(fieldMap.get('optionName')),
      category: cellToString(fieldMap.get('category')),
      price: parsePrice(fieldMap.get('price')),
      stockStatus: stockResult.status,
      stockRaw: stockResult.rawText,
      courier: cellToString(fieldMap.get('courier')),
      extra,
    })
  }

  return {
    products,
    invalidRows,
    meta: {
      totalRows,
      validCount: products.length,
      invalidCount: invalidRows.length,
      skippedRows,
    },
  }
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every(
    (cell) => cell === null || cell === undefined || String(cell).trim() === ''
  )
}

function extractFields(
  row: unknown[],
  mappings: SupplierProductColumnMapping[]
): Map<string, unknown> {
  const map = new Map<string, unknown>()
  for (const m of mappings) {
    if (m.systemField !== 'empty') {
      map.set(m.systemField, row[m.targetColumnIndex])
    }
  }
  return map
}

function buildExtra(
  row: unknown[],
  mappings: SupplierProductColumnMapping[],
  headerRowData: unknown[] | undefined
): Record<string, unknown> {
  const mappedIndices = new Set(mappings.map((m) => m.targetColumnIndex))
  const extra: Record<string, unknown> = {}

  for (let col = 0; col < row.length; col++) {
    if (mappedIndices.has(col)) continue
    const val = row[col]
    if (val === null || val === undefined || String(val).trim() === '') continue

    const headerName = headerRowData?.[col]
    const key =
      headerName && String(headerName).trim()
        ? String(headerName).trim()
        : `column_${col + 1}`
    extra[key] = val
  }

  return extra
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined) return null

  const str = String(value).trim()
  if (!str) return null

  const cleaned = str
    .replace(/[₩￦원]/g, '')
    .replace(/\/\s*.*/g, '')
    .replace(/,/g, '')
    .trim()

  if (!cleaned) return null

  const num = Number(cleaned)
  if (!Number.isFinite(num)) return null
  if (num < 0) return null
  if (!Number.isInteger(num)) return null

  return num
}

export function normalizeStockStatus(raw: unknown): {
  status: StockStatus
  rawText: string
} {
  if (raw === null || raw === undefined) {
    return { status: 'unknown', rawText: '' }
  }

  const rawText = String(raw).trim()
  if (!rawText) return { status: 'unknown', rawText: '' }

  if (typeof raw === 'number') {
    if (raw === 0) return { status: 'soldout', rawText }
    if (raw > 0) return { status: 'available', rawText }
    return { status: 'unknown', rawText }
  }

  const lower = rawText.toLowerCase()

  const availablePatterns = ['판매중', '재고있음', '있음', 'o', 'y']
  if (availablePatterns.includes(lower)) {
    return { status: 'available', rawText }
  }

  const soldoutPatterns = ['품절', '재고없음', '없음', 'x', 'n', '0']
  if (soldoutPatterns.includes(lower)) {
    return { status: 'soldout', rawText }
  }

  const num = Number(rawText)
  if (Number.isFinite(num)) {
    if (num === 0) return { status: 'soldout', rawText }
    if (num > 0) return { status: 'available', rawText }
  }

  return { status: 'unknown', rawText }
}
