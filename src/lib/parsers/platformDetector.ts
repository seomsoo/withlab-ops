import type { WorkBook } from 'xlsx'

import { sheetToRows, cellToString } from '@/utils/excel'

type DetectedPlatform = 'coupang' | 'toss' | null

function hasHeaderMarkers(
  rows: unknown[][],
  markers: string[],
  maxRows = 10
): boolean {
  for (let i = 0; i < Math.min(maxRows, rows.length); i++) {
    const headerRow = rows[i]
    if (!headerRow) continue
    const headerValues = headerRow.map((v) => cellToString(v))
    const matchCount = markers.filter((m) =>
      headerValues.includes(m)
    ).length
    if (matchCount >= 2) return true
  }
  return false
}

export function detectPlatform(workbook: WorkBook): DetectedPlatform {
  const coupangMarkers = ['번호', '묶음배송번호', '주문번호']
  const deliverySheet = workbook.Sheets['Delivery']
  if (deliverySheet) {
    const rows = sheetToRows(deliverySheet)
    if (hasHeaderMarkers(rows, coupangMarkers)) return 'coupang'
  }

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'Delivery') continue
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const rows = sheetToRows(sheet)
    if (hasHeaderMarkers(rows, coupangMarkers)) return 'coupang'
  }

  const tossSheet = workbook.Sheets['주문내역']
  if (tossSheet) {
    const rows = sheetToRows(tossSheet)
    const tossMarkers = ['주문일시', '주문번호', '주문상품번호']
    if (hasHeaderMarkers(rows, tossMarkers)) return 'toss'
  }

  return null
}
