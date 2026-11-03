import { convertCourierName } from '@/lib/matching/courierConverter'

import type { AllocationWithOrder } from '@/lib/supabase/allocations'
import type { PriceSummary } from '@/lib/priceSummary/model'
import type {
  CourierMapping,
  CourierWarning,
  Platform,
  Tracking,
  TrackingExportItem,
} from '@/types'

/** 가격정리 양식에서 주문이 시작되는 엑셀 행 */
const PRICE_SUMMARY_FIRST_ROW = 3

export type PricePasteRow = {
  orderId: string
  rowNumber: number
  orderNo: string
  recipient: string
  productName: string
  optionName: string
  trackingCompany: string
  trackingNumber: string
  courierMapped: boolean
}

export type PricePastePreview = {
  id: string
  name: string
  label: string
  rows: PricePasteRow[]
  filledCount: number
  emptyCount: number
}

/** 플랫폼 파일과 가격정리 복사가 같은 운송장을 쓰도록 선택·택배사 변환을 한곳에서 처리한다. */
export function buildExportItems(
  trackings: Tracking[],
  allocations: AllocationWithOrder[],
  mappings: CourierMapping[],
  platform: Platform,
  filterLabel?: string
): { items: TrackingExportItem[]; warnings: CourierWarning[] } {
  const allocMap = new Map(allocations.map((a) => [a.id, a]))
  const items: TrackingExportItem[] = []
  const warnings: CourierWarning[] = []

  for (const t of trackings) {
    if (t.status !== 'matched' || !t.allocationId || !t.trackingNumber) continue

    const alloc = allocMap.get(t.allocationId)
    if (!alloc) continue
    if (alloc.order.platform !== platform) continue
    if (filterLabel && alloc.order.orderImportLabel !== filterLabel) continue

    const converted = convertCourierName(t.trackingCompany, platform, mappings)

    if (!converted.isMapped) {
      warnings.push({
        trackingId: t.id,
        platform,
        supplierId: t.sourceSupplierId,
        supplierName: alloc.supplierName,
        originalCourier: t.trackingCompany,
        trackingNumber: t.trackingNumber,
      })
    }

    items.push({
      trackingId: t.id,
      allocationId: t.allocationId,
      orderId: alloc.orderId,
      orderNo: alloc.order.orderNo,
      orderItemNo: alloc.order.orderItemNo,
      matchingKey: alloc.order.matchingKey,
      trackingCompany: converted.name,
      trackingNumber: t.trackingNumber,
      courierMapped: converted.isMapped,
      originalRow: t.raw,
      originalRowValues: alloc.order.rawValues,
      originalRowNumber: alloc.order.rawRowNumber,
      orderImportLabel: alloc.order.orderImportLabel,
    })
  }

  return { items, warnings }
}

/** 가격정리 조회 결과의 순서를 그대로 따른다. 정렬 기준을 따로 두면 두 파일이 어긋난다. */
export function sortByPriceSummaryOrder(
  items: TrackingExportItem[],
  summaries: PriceSummary[]
): TrackingExportItem[] {
  const positions = new Map(
    summaries.flatMap((s) => s.rows).map((row, index) => [row.id, index])
  )
  const position = (item: TrackingExportItem) =>
    positions.get(item.orderId) ?? Number.POSITIVE_INFINITY

  return [...items].sort((a, b) => {
    const [pa, pb] = [position(a), position(b)]
    return pa === pb ? 0 : pa - pb
  })
}

function cellText(value: string | number | null | undefined): string {
  return value == null ? '' : String(value)
}

/** 붙여 넣은 행이 밀리지 않도록 운송장이 없는 주문도 빈 줄로 남긴다. */
export function buildPastePreview(
  summary: PriceSummary,
  items: TrackingExportItem[]
): PricePastePreview {
  const itemByOrderId = new Map(items.map((item) => [item.orderId, item]))

  const rows = summary.rows.map((row, index): PricePasteRow => {
    const item = itemByOrderId.get(row.id)
    return {
      orderId: row.id,
      rowNumber: PRICE_SUMMARY_FIRST_ROW + index,
      orderNo: cellText(row.cells[3]),
      recipient: cellText(row.cells[4]),
      productName: cellText(row.cells[5]),
      optionName: cellText(row.cells[6]),
      trackingCompany: item?.trackingCompany ?? '',
      trackingNumber: item?.trackingNumber ?? '',
      courierMapped: item?.courierMapped ?? true,
    }
  })
  const filledCount = rows.filter((row) => row.trackingNumber).length

  return {
    id: summary.id,
    name: summary.name,
    label: summary.label,
    rows,
    filledCount,
    emptyCount: rows.length - filledCount,
  }
}

function pasteCell(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** 공급처 파일에서 온 값이 일반 텍스트 붙여넣기에서 수식으로 실행되지 않게 한다. */
function plainTextCell(value: string): string {
  const cell = pasteCell(value)
  return /^[=+\-@]/.test(cell) ? `'${cell}` : cell
}

export function toPasteText(rows: PricePasteRow[]): string {
  return rows
    .map(
      (row) =>
        `${plainTextCell(row.trackingCompany)}\t${plainTextCell(row.trackingNumber)}`
    )
    .join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 가격정리 A3·B3 칸과 같은 모양으로 붙도록 양식의 글꼴·테두리·정렬을 지정한다.
 * B열은 금액 서식이라 숫자로 붙으면 번호가 ₩ 금액으로 보이므로 텍스트 서식도 함께 지정한다.
 */
const PASTE_CELL_STYLE = [
  "mso-number-format:'\\@'",
  'font-family:Arial',
  'font-size:11pt',
  'color:#000000',
  'background:#ffffff',
  'text-align:center',
  'vertical-align:middle',
  'border:.5pt solid windowtext',
].join(';')

export function toPasteHtml(rows: PricePasteRow[]): string {
  const cell = (value: string) =>
    `<td style="${PASTE_CELL_STYLE}">${escapeHtml(pasteCell(value))}</td>`
  const body = rows
    .map(
      (row) =>
        `<tr>${cell(row.trackingCompany)}${cell(row.trackingNumber)}</tr>`
    )
    .join('')
  return `<html><body><!--StartFragment--><table style="border-collapse:collapse">${body}</table><!--EndFragment--></body></html>`
}
