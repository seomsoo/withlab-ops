import type { WorkBook } from 'xlsx'

import { sheetToRows, cellToString } from '@/utils/excel'

type DetectedPlatform = 'coupang' | 'toss' | null

export function detectPlatform(workbook: WorkBook): DetectedPlatform {
  const deliverySheet = workbook.Sheets['Delivery']
  if (deliverySheet) {
    const rows = sheetToRows(deliverySheet)
    const headerRow = rows[0]
    if (headerRow) {
      const headerValues = headerRow.map((v) => cellToString(v))
      const coupangMarkers = ['번호', '묶음배송번호', '주문번호']
      const matchCount = coupangMarkers.filter((m) =>
        headerValues.includes(m)
      ).length
      if (matchCount >= 2) return 'coupang'
    }
  }

  const tossSheet = workbook.Sheets['주문내역']
  if (tossSheet) {
    const rows = sheetToRows(tossSheet)
    const tossMarkers = ['주문일시', '주문번호', '주문상품번호']
    for (let i = 1; i <= Math.min(4, rows.length - 1); i++) {
      const headerRow = rows[i]
      if (!headerRow) continue
      const headerValues = headerRow.map((v) => cellToString(v))
      const matchCount = tossMarkers.filter((m) =>
        headerValues.includes(m)
      ).length
      if (matchCount >= 2) return 'toss'
    }
  }

  return null
}
