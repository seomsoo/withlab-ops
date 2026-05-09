import type { WorkBook } from 'xlsx'

import { sheetToRows, cellToString, cellToInt } from '@/utils/excel'
import { extractDigits } from '@/utils/phone'

import type { StandardOrder, InvalidRow, DuplicateRow, ParseResult } from '@/types'

const SHEET_NAME = 'Delivery'
const COLUMN_COUNT = 40

const COL = {
  orderNo: 2,
  orderDate: 9,
  productName: 10,
  optionName: 11,
  quantity: 22,
  buyerName: 24,
  buyerPhone: 25,
  recipientName: 26,
  recipientPhone: 27,
  zipCode: 28,
  address: 29,
  deliveryMessage: 30,
} as const

const HEADER_KEYS = [
  '번호', '묶음배송번호', '주문번호', '택배사', '운송장번호',
  '분리배송 Y/N', '분리배송 출고예정일', '주문시 출고예정일', '출고일(발송일)',
  '주문일', '등록상품명', '등록옵션명', '노출상품명(옵션명)', '노출상품ID',
  '옵션ID', '최초등록등록상품명/옵션명', '업체상품코드', '바코드',
  '결제액', '배송비구분', '배송비', '도서산간 추가배송비',
  '구매수(수량)', '옵션판매가(판매단가)', '구매자', '구매자전화번호',
  '수취인이름', '수취인전화번호', '우편번호', '수취인 주소',
  '배송메세지', '상품별 추가메시지', '주문자 추가메시지', '배송완료일',
  '구매확정일자', '개인통관번호(PCCC)', '통관용수취인전화번호', '기타',
  '결제위치', '배송유형',
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

export function parseCoupangOrders(workbook: WorkBook): ParseResult {
  const sheet = workbook.Sheets[SHEET_NAME]
  if (!sheet) {
    throw new Error('쿠팡 주문 시트(Delivery)를 찾을 수 없습니다')
  }

  const allRows = sheetToRows(sheet)
  const dataRows = allRows.slice(1)

  const orders: StandardOrder[] = []
  const invalidRows: InvalidRow[] = []
  let skippedRows = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!
    const excelRowNumber = i + 2
    const normalized = normalizeRowValues(row, COLUMN_COUNT)

    const orderNo = cellToString(row[COL.orderNo])
    const productName = cellToString(row[COL.productName])

    if (orderNo === '' && productName === '') {
      skippedRows++
      continue
    }

    if (orderNo === '' || productName === '') {
      invalidRows.push({
        rowNumber: excelRowNumber,
        reason: '주문번호 또는 상품명 누락',
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

    const buyerPhone = cellToString(row[COL.buyerPhone])

    orders.push({
      id: crypto.randomUUID(),
      platform: 'coupang',
      orderNo,
      orderItemNo: orderNo,
      matchingKey: orderNo,
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
      platform: 'coupang',
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
