import type { WorkBook } from 'xlsx'

import {
  sheetToRows,
  cellToString,
  cellToInt,
  cellToDateString,
} from '@/utils/excel'
import { extractDigits } from '@/utils/phone'
import { buildCoupangOrderKey } from '@/utils/orderKey'

import type {
  StandardOrder,
  InvalidRow,
  DuplicateRow,
  ParseResult,
} from '@/types'

const SHEET_NAME = 'Delivery'

const REQUIRED_HEADERS = {
  shipmentBoxId: '묶음배송번호',
  orderNo: '주문번호',
  optionId: '옵션ID',
  orderDate: '주문일',
  productName: '등록상품명',
  optionName: '등록옵션명',
  displayProductName: '노출상품명(옵션명)',
  quantity: '구매수(수량)',
  buyerName: '구매자',
  buyerPhone: '구매자전화번호',
  recipientName: '수취인이름',
  recipientPhone: '수취인전화번호',
  zipCode: '우편번호',
  address: '수취인 주소',
  deliveryMessage: '배송메세지',
} as const

type ColMap = Record<keyof typeof REQUIRED_HEADERS, number>

const COUPANG_MARKERS = ['번호', '묶음배송번호', '주문번호']
const MAX_HEADER_SCAN_ROWS = 10

function buildColMap(headerRow: unknown[]): ColMap | null {
  const values = headerRow.map((v) => cellToString(v))
  const map = {} as Record<string, number>
  for (const [key, label] of Object.entries(REQUIRED_HEADERS)) {
    const idx = values.indexOf(label)
    if (idx === -1) return null
    map[key] = idx
  }
  return map as ColMap
}

function normalizeRowValues(row: unknown[], columnCount: number): unknown[] {
  return Array.from({ length: columnCount }, (_, i) => row[i] ?? null)
}

function buildRaw(
  row: unknown[],
  headerRow: unknown[]
): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (let i = 0; i < headerRow.length; i++) {
    const key = cellToString(headerRow[i])
    if (key) obj[key] = row[i] ?? null
  }
  return obj
}

function findHeaderRowIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(MAX_HEADER_SCAN_ROWS, rows.length); i++) {
    const row = rows[i]
    if (!row) continue
    const values = row.map((v) => cellToString(v))
    const matchCount = COUPANG_MARKERS.filter((m) => values.includes(m)).length
    if (matchCount >= 2) return i
  }
  return -1
}

function findCoupangSheet(workbook: WorkBook): {
  rows: unknown[][]
  headerIdx: number
} | null {
  const preferredSheet = workbook.Sheets[SHEET_NAME]
  if (preferredSheet) {
    const rows = sheetToRows(preferredSheet)
    const headerIdx = findHeaderRowIndex(rows)
    if (headerIdx !== -1) return { rows, headerIdx }
  }

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === SHEET_NAME) continue
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const rows = sheetToRows(sheet)
    const headerIdx = findHeaderRowIndex(rows)
    if (headerIdx !== -1) return { rows, headerIdx }
  }

  return null
}

export function parseCoupangOrders(workbook: WorkBook): ParseResult {
  const detectedSheet = findCoupangSheet(workbook)
  if (!detectedSheet) {
    throw new Error('쿠팡 헤더 행을 찾을 수 없습니다')
  }

  const { rows: allRows, headerIdx } = detectedSheet
  const headerRow = allRows[headerIdx]
  if (!headerRow) {
    throw new Error('쿠팡 헤더 행을 찾을 수 없습니다')
  }

  const col = buildColMap(headerRow)
  if (!col) {
    const found = headerRow.map((v) => cellToString(v)).filter(Boolean)
    throw new Error(
      `쿠팡 헤더에서 필수 컬럼을 찾을 수 없습니다. 발견된 컬럼: ${found.slice(0, 10).join(', ')}`
    )
  }

  const columnCount = headerRow.length
  const dataStartIndex = headerIdx + 1
  const dataRows = allRows.slice(dataStartIndex)

  const orders: StandardOrder[] = []
  const invalidRows: InvalidRow[] = []
  let skippedRows = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!
    const excelRowNumber = i + dataStartIndex + 1
    const normalized = normalizeRowValues(row, columnCount)

    const shipmentBoxId = cellToString(row[col.shipmentBoxId])
    const orderNo = cellToString(row[col.orderNo])
    const productName = cellToString(row[col.productName])

    if (shipmentBoxId === '' && orderNo === '' && productName === '') {
      skippedRows++
      continue
    }

    if (shipmentBoxId === '' || orderNo === '' || productName === '') {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '묶음배송번호, 주문번호 또는 상품명 누락',
        rawData: normalized,
      })
      continue
    }

    const optionId = cellToString(row[col.optionId])
    if (optionId === '') {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '옵션ID 누락',
        rawData: normalized,
      })
      continue
    }

    const recipientName = cellToString(row[col.recipientName])
    if (recipientName === '') {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '수취인 이름 누락',
        rawData: normalized,
      })
      continue
    }

    const address = cellToString(row[col.address])
    if (address === '') {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '주소 누락',
        rawData: normalized,
      })
      continue
    }

    const recipientPhone = cellToString(row[col.recipientPhone])
    if (recipientPhone === '') {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '수취인 전화번호 누락',
        rawData: normalized,
      })
      continue
    }

    const recipientPhoneDigits = extractDigits(recipientPhone)
    if (recipientPhoneDigits.length < 8) {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '수취인 전화번호 형식 오류',
        rawData: normalized,
      })
      continue
    }

    const quantity = cellToInt(row[col.quantity])
    if (quantity === null || quantity <= 0) {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: quantity === null ? '수량 파싱 실패' : '수량이 0 이하',
        rawData: normalized,
      })
      continue
    }

    const buyerPhone = cellToString(row[col.buyerPhone])
    const matchingKey = buildCoupangOrderKey(shipmentBoxId, optionId)

    orders.push({
      id: crypto.randomUUID(),
      platform: 'coupang',
      orderNo,
      orderItemNo: matchingKey,
      matchingKey,
      orderDate: cellToDateString(row[col.orderDate]),
      productName,
      optionName: cellToString(row[col.optionName]),
      displayProductName:
        cellToString(row[col.displayProductName]) || productName,
      quantity,
      buyerName: cellToString(row[col.buyerName]),
      buyerPhone,
      buyerPhoneDigits: extractDigits(buyerPhone),
      recipientName,
      recipientPhone,
      recipientPhoneDigits,
      zipCode: cellToString(row[col.zipCode]),
      address,
      deliveryMessage: cellToString(row[col.deliveryMessage]),
      raw: buildRaw(row, headerRow),
      rawValues: normalized,
      rawRowNumber: excelRowNumber,
    })
  }

  const { deduplicated, duplicateRows } = deduplicateOrders(orders)

  return {
    orders: deduplicated,
    invalidRows,
    duplicateRows,
    meta: {
      platform: 'coupang',
      totalRows:
        deduplicated.length + invalidRows.length + duplicateRows.length,
      skippedRows,
      validRows: deduplicated.length,
      invalidRows: invalidRows.length,
      duplicateRows: duplicateRows.length,
    },
  }
}

function deduplicateOrders(orders: StandardOrder[]): {
  deduplicated: StandardOrder[]
  duplicateRows: DuplicateRow[]
} {
  const seen = new Map<string, number>()
  const deduplicated: StandardOrder[] = []
  const duplicateRows: DuplicateRow[] = []

  for (const order of orders) {
    const firstRow = seen.get(order.matchingKey)
    if (firstRow !== undefined) {
      duplicateRows.push({
        rowNumber: order.rawRowNumber,
        reason: `중복 주문 (최초 행: ${firstRow})`,
        matchingKey: order.matchingKey,
        firstRowNumber: firstRow,
        rawData: order.rawValues,
      })
    } else {
      seen.set(order.matchingKey, order.rawRowNumber)
      deduplicated.push(order)
    }
  }

  return { deduplicated, duplicateRows }
}
