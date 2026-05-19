import type { WorkBook } from 'xlsx'

import { sheetToRows, cellToString } from '@/utils/excel'

import type {
  ParsedTracking,
  InvalidRow,
  TrackingParseResult,
  SupplierTrackingTemplate,
} from '@/types'

const ORDER_KEY_HEADERS = ['업체주문번호', '거래처주문번호'] as const
const TRACKING_NUMBER_HEADERS = ['송장번호', '운송장번호'] as const
const COURIER_HEADER = '택배사'
const PRODUCT_NAME_HEADER = '상품명'
const RECIPIENT_HEADER = '수령인'

type ColumnMap = {
  orderKey: number
  trackingCompany: number
  trackingNumber: number
  productName: number | null
  recipientName: number | null
}

function detectColumns(headerRow: unknown[]): ColumnMap {
  let orderKey = -1
  let trackingCompany = -1
  let trackingNumber = -1
  let productName: number | null = null
  let recipientName: number | null = null

  for (let i = 0; i < headerRow.length; i++) {
    const h = cellToString(headerRow[i]).trim()
    if (h === '') continue

    if (orderKey === -1 && ORDER_KEY_HEADERS.some((k) => h === k)) {
      orderKey = i
    }
    if (trackingCompany === -1 && h === COURIER_HEADER) {
      trackingCompany = i
    }
    if (trackingNumber === -1 && TRACKING_NUMBER_HEADERS.some((k) => h === k)) {
      trackingNumber = i
    }
    if (productName === null && h === PRODUCT_NAME_HEADER) {
      productName = i
    }
    if (recipientName === null && h === RECIPIENT_HEADER) {
      recipientName = i
    }
  }

  if (orderKey === -1 || trackingCompany === -1 || trackingNumber === -1) {
    throw new Error('운송장 형식을 인식할 수 없습니다')
  }

  return { orderKey, trackingCompany, trackingNumber, productName, recipientName }
}

function buildRaw(headerRow: unknown[], dataRow: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (let i = 0; i < headerRow.length; i++) {
    const key = cellToString(headerRow[i])
    if (key) {
      obj[key] = dataRow[i] ?? null
    }
  }
  return obj
}

export function parseTracking(workbook: WorkBook): TrackingParseResult {
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('운송장 형식을 인식할 수 없습니다')
  }
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error('운송장 형식을 인식할 수 없습니다')
  }

  const allRows = sheetToRows(sheet)
  if (allRows.length === 0) {
    throw new Error('운송장 형식을 인식할 수 없습니다')
  }

  const headerRow = allRows[0]!
  const cols = detectColumns(headerRow)

  const trackings: ParsedTracking[] = []
  const invalidRows: InvalidRow[] = []
  let skippedRows = 0
  const courierCounts = new Map<string, number>()

  const dataRows = allRows.slice(1)

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!
    const excelRowNumber = i + 2

    const rawOrderKey = cellToString(row[cols.orderKey])
    const trackingNumber = cellToString(row[cols.trackingNumber])
    const trackingCompany = cellToString(row[cols.trackingCompany])

    // 빈 행 또는 수량분할 연속행(주문번호 없이 운송장번호만 있는 행) — 매칭 불가이므로 스킵
    if (rawOrderKey === '') {
      skippedRows++
      continue
    }

    const rawData = Array.from({ length: row.length }, (_, idx) => row[idx] ?? null)

    if (trackingNumber === '') {
      invalidRows.push({ rowNumber: excelRowNumber, reason: '운송장번호 누락', rawData })
      continue
    }
    if (trackingCompany === '') {
      invalidRows.push({ rowNumber: excelRowNumber, reason: '택배사 누락', rawData })
      continue
    }

    const productName = cols.productName !== null ? cellToString(row[cols.productName]) || undefined : undefined
    const recipientName = cols.recipientName !== null ? cellToString(row[cols.recipientName]) || undefined : undefined

    courierCounts.set(trackingCompany, (courierCounts.get(trackingCompany) ?? 0) + 1)

    trackings.push({
      rawOrderKey,
      trackingCompany,
      trackingNumber,
      productName,
      recipientName,
      raw: buildRaw(headerRow, row),
      rawRowNumber: excelRowNumber,
    })
  }

  let detectedCourier: string | null = null
  let maxCount = 0
  for (const [name, count] of courierCounts) {
    if (count > maxCount) {
      maxCount = count
      detectedCourier = name
    }
  }

  return {
    trackings,
    invalidRows,
    meta: {
      totalRows: dataRows.length,
      validCount: trackings.length,
      invalidCount: invalidRows.length,
      skippedRows,
      detectedCourier,
    },
  }
}

export function parseTrackingWithTemplate(
  workbook: WorkBook,
  template: SupplierTrackingTemplate
): TrackingParseResult {
  const targetSheetName = template.sheetName || workbook.SheetNames[0]
  if (!targetSheetName) {
    throw new Error('운송장 파일에 시트가 없습니다')
  }
  const sheet = workbook.Sheets[targetSheetName]
  if (!sheet) {
    throw new Error(`시트 "${targetSheetName}"을(를) 찾을 수 없습니다`)
  }

  const allRows = sheetToRows(sheet)

  const headerRowIndex = template.headerRow - 1
  const headerRow = allRows[headerRowIndex] ?? []

  const dataStartIndex = template.dataStartRow - 1
  if (dataStartIndex >= allRows.length) {
    return {
      trackings: [],
      invalidRows: [],
      meta: { totalRows: 0, validCount: 0, invalidCount: 0, skippedRows: 0, detectedCourier: null },
    }
  }

  const trackings: ParsedTracking[] = []
  const invalidRows: InvalidRow[] = []
  let skippedRows = 0
  const courierCounts = new Map<string, number>()

  const dataRows = allRows.slice(dataStartIndex)

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!
    const excelRowNumber = dataStartIndex + i + 1

    const rawOrderKey = cellToString(row[template.orderKeyColumn])
    const trackingNumber = cellToString(row[template.trackingNumberColumn])
    const courierRaw =
      template.courierColumn !== null
        ? cellToString(row[template.courierColumn])
        : ''
    const trackingCompany = courierRaw || template.defaultCourier || ''

    // 빈 행 또는 수량분할 연속행(주문번호 없이 운송장번호만 있는 행) — 매칭 불가이므로 스킵
    if (rawOrderKey === '') {
      skippedRows++
      continue
    }

    const rawData = Array.from({ length: row.length }, (_, idx) => row[idx] ?? null)

    if (trackingNumber === '') {
      invalidRows.push({ rowNumber: excelRowNumber, reason: '운송장번호 누락', rawData })
      continue
    }
    if (trackingCompany === '') {
      invalidRows.push({ rowNumber: excelRowNumber, reason: '택배사 누락', rawData })
      continue
    }

    const productName =
      template.productNameColumn !== null
        ? cellToString(row[template.productNameColumn]) || undefined
        : undefined
    const recipientName =
      template.recipientColumn !== null
        ? cellToString(row[template.recipientColumn]) || undefined
        : undefined

    courierCounts.set(trackingCompany, (courierCounts.get(trackingCompany) ?? 0) + 1)

    trackings.push({
      rawOrderKey,
      trackingCompany,
      trackingNumber,
      productName,
      recipientName,
      raw: buildRaw(headerRow, row),
      rawRowNumber: excelRowNumber,
    })
  }

  let detectedCourier: string | null = null
  let maxCount = 0
  for (const [name, count] of courierCounts) {
    if (count > maxCount) {
      maxCount = count
      detectedCourier = name
    }
  }

  return {
    trackings,
    invalidRows,
    meta: {
      totalRows: dataRows.length,
      validCount: trackings.length,
      invalidCount: invalidRows.length,
      skippedRows,
      detectedCourier,
    },
  }
}
