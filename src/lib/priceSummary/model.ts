import { cellToDateString } from '@/utils/excel'

export type PriceOrder = {
  id: string
  raw: Record<string, unknown>
  raw_row_number: number
  created_at: string
  platform: 'coupang' | 'toss'
  quantity: number
  allocations: {
    supplier_price: number | null
    supplier_product_name: string
    suppliers: { name: string }
  }[]
}
export type PriceRow = {
  id: string
  cells: (string | number | null)[]
  supplier: string
  unitPrice: number | null
  issues: string[]
}
export type PriceSummary = {
  id: string
  name: string
  label: string
  excluded: number
  rows: PriceRow[]
}

export function money(value: unknown): number | null {
  if (value == null || String(value).trim() === '') return null
  const cleaned = String(value).replace(/[,₩원\s]/g, '')
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 ? n : null
}
export function buildPriceRow(order: PriceOrder): PriceRow {
  const raw = order.raw
  const text = (key: string) => (raw[key] == null ? '' : String(raw[key]))
  const cp = order.platform === 'coupang'
  const alloc =
    order.allocations.length === 1 ? order.allocations[0] : undefined
  const unitPrice = alloc ? money(alloc.supplier_price) : null
  const sale = money(raw[cp ? '결제액' : '주문금액'])
  const issues: string[] = []
  if (!alloc) issues.push('공급처 미배정 또는 배정 확인 필요')
  else if (unitPrice === null)
    issues.push('공급처 단가 없음 — 배정 화면에서 상품 확인')
  if (sale === null) issues.push('판매금액 누락 또는 형식 오류')
  return {
    id: order.id,
    supplier: alloc?.suppliers.name ?? '',
    unitPrice,
    issues,
    cells: [
      '', // 가격정리의 택배사 칸은 원본 값과 관계없이 비워 둔다.
      text(cp ? '운송장번호' : '송장번호'),
      cellToDateString(raw[cp ? '주문일' : '주문일시']),
      text('주문번호'),
      text(cp ? '수취인이름' : '수령인명'),
      text(cp ? '등록상품명' : '상품명'),
      text(cp ? '등록옵션명' : '옵션명'),
      order.quantity,
      text(cp ? '수취인전화번호' : '수령인 연락처'),
      text('우편번호'),
      text(cp ? '수취인 주소' : '배송지'),
      unitPrice === null ? null : unitPrice * order.quantity,
      sale,
    ],
  }
}
export function priceFileName(name: string): string {
  return `${name.replace(/\.(xlsx|xls)$/i, '').replace(/[\\/:*?"<>|]/g, '_')}_가격정리.xlsx`
}
