import type { WorkBook } from 'xlsx'

import { sheetToRows, cellToString, cellToInt } from '@/utils/excel'
import { extractDigits } from '@/utils/phone'

import type { StandardOrder, InvalidRow, DuplicateRow, ParseResult } from '@/types'

const SHEET_NAME = '주문내역'
const COLUMN_COUNT = 30
const DATA_START_INDEX = 4

const COL = {
  orderDate: 0,
  orderNo: 1,
  orderItemNo: 2,
  productName: 8,
  optionName: 11,
  quantity: 12,
  buyerName: 15,
  buyerPhone: 16,
  recipientName: 17,
  recipientPhone: 18,
  address: 19,
  zipCode: 20,
  deliveryMessage: 21,
} as const

const HEADER_KEYS = [
  '주문일시', '주문번호', '주문상품번호', '주문상태', '발송기한',
  '택배사', '송장번호', '상품ID', '상품명', '상품 관리 코드',
  '옵션 ID', '옵션명', '주문건수', '옵션 관리 코드', '받은 혜택',
  '구매자명', '구매자 연락처', '수령인명', '수령인 연락처', '배송지',
  '우편번호', '주문요청사항', '구매확정일', '희망배송일', '발송처리일시',
  '배송완료일시', '취소일시', '주문금액', '배송비 묶음 번호', '배송비 합계',
]

function normalizeRowValues(row: unknown[], columnCount: number): unknown[] {
  return Array.from({ length: columnCount }, (_, i) => row[i] ?? null)
}

function buildRaw(row: unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (let i = 0; i < HEADER_KEYS.length; i++) {
    obj[HEADER_KEYS[i]!] = row[i] ?? null
  }
  return obj
}

export function parseTossOrders(workbook: WorkBook): ParseResult {
  const sheet = workbook.Sheets[SHEET_NAME]
  if (!sheet) {
    throw new Error('토스 주문 시트(주문내역)를 찾을 수 없습니다')
  }

  const allRows = sheetToRows(sheet)
  const dataRows = allRows.slice(DATA_START_INDEX)

  const orders: StandardOrder[] = []
  const invalidRows: InvalidRow[] = []
  let skippedRows = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!
    const excelRowNumber = i + DATA_START_INDEX + 1
    const normalized = normalizeRowValues(row, COLUMN_COUNT)

    const matchingKey = cellToString(row[COL.orderItemNo])
    const productName = cellToString(row[COL.productName])

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

    const recipientName = cellToString(row[COL.recipientName])
    if (recipientName === '') {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '수취인 이름 누락',
        rawData: normalized,
      })
      continue
    }

    const address = cellToString(row[COL.address])
    if (address === '') {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '주소 누락',
        rawData: normalized,
      })
      continue
    }

    const recipientPhone = cellToString(row[COL.recipientPhone])
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

    const quantity = cellToInt(row[COL.quantity])
    if (quantity === null || quantity <= 0) {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: quantity === null ? '수량 파싱 실패' : '수량이 0 이하',
        rawData: normalized,
      })
      continue
    }

    const orderNo = cellToString(row[COL.orderNo])
    const buyerPhone = cellToString(row[COL.buyerPhone])

    orders.push({
      id: crypto.randomUUID(),
      platform: 'toss',
      orderNo,
      orderItemNo: matchingKey,
      matchingKey,
      orderDate: cellToString(row[COL.orderDate]),
      productName,
      optionName: cellToString(row[COL.optionName]),
      quantity,
      buyerName: cellToString(row[COL.buyerName]),
      buyerPhone,
      buyerPhoneDigits: extractDigits(buyerPhone),
      recipientName,
      recipientPhone,
      recipientPhoneDigits,
      zipCode: cellToString(row[COL.zipCode]),
      address,
      deliveryMessage: cellToString(row[COL.deliveryMessage]),
      raw: buildRaw(row),
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
