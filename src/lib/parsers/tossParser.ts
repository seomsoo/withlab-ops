import type { WorkBook } from 'xlsx'

import { sheetToRows, cellToString, cellToInt } from '@/utils/excel'
import { extractDigits } from '@/utils/phone'

import type { StandardOrder, InvalidRow, DuplicateRow, ParseResult } from '@/types'

const SHEET_NAME = '주문내역'

const REQUIRED_HEADERS = {
  orderDate: '주문일시',
  orderNo: '주문번호',
  orderItemNo: '주문상품번호',
  productName: '상품명',
  optionName: '옵션명',
  quantity: '주문건수',
  buyerName: '구매자명',
  buyerPhone: '구매자 연락처',
  recipientName: '수령인명',
  recipientPhone: '수령인 연락처',
  address: '배송지',
  zipCode: '우편번호',
  deliveryMessage: '주문요청사항',
} as const

type ColMap = Record<keyof typeof REQUIRED_HEADERS, number>

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

function buildRaw(row: unknown[], headerRow: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (let i = 0; i < headerRow.length; i++) {
    const key = cellToString(headerRow[i])
    if (key) obj[key] = row[i] ?? null
  }
  return obj
}

function findHeaderRowIndex(rows: unknown[][]): number {
  const markers = ['주문일시', '주문번호', '주문상품번호']
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]
    if (!row) continue
    const values = row.map((v) => cellToString(v))
    const matchCount = markers.filter((m) => values.includes(m)).length
    if (matchCount >= 2) return i
  }
  return -1
}

export function parseTossOrders(workbook: WorkBook): ParseResult {
  const sheet = workbook.Sheets[SHEET_NAME]
  if (!sheet) {
    throw new Error('토스 주문 시트(주문내역)를 찾을 수 없습니다')
  }

  const allRows = sheetToRows(sheet)
  const headerIdx = findHeaderRowIndex(allRows)
  if (headerIdx === -1) {
    throw new Error('토스 헤더 행을 찾을 수 없습니다')
  }

  const headerRow = allRows[headerIdx]!
  const col = buildColMap(headerRow)
  if (!col) {
    const found = headerRow.map((v) => cellToString(v)).filter(Boolean)
    throw new Error(
      `토스 헤더에서 필수 컬럼을 찾을 수 없습니다. 발견된 컬럼: ${found.slice(0, 10).join(', ')}`
    )
  }

  const columnCount = headerRow.length
  const dataStartIndex = headerIdx + 2
  const dataRows = allRows.slice(dataStartIndex)

  const orders: StandardOrder[] = []
  const invalidRows: InvalidRow[] = []
  let skippedRows = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!
    const excelRowNumber = i + dataStartIndex + 1
    const normalized = normalizeRowValues(row, columnCount)

    const matchingKey = cellToString(row[col.orderItemNo])
    const productName = cellToString(row[col.productName])

    if (matchingKey === '' && productName === '') {
      skippedRows++
      continue
    }

    if (matchingKey === '' || productName === '') {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '주문상품번호 또는 상품명 누락',
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

    const orderNo = cellToString(row[col.orderNo])
    const buyerPhone = cellToString(row[col.buyerPhone])

    orders.push({
      id: crypto.randomUUID(),
      platform: 'toss',
      orderNo,
      orderItemNo: matchingKey,
      matchingKey,
      orderDate: cellToString(row[col.orderDate]),
      productName,
      optionName: cellToString(row[col.optionName]),
      displayProductName: [productName, cellToString(row[col.optionName])].filter(Boolean).join(' '),
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
      platform: 'toss',
      totalRows: deduplicated.length + invalidRows.length + duplicateRows.length,
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
