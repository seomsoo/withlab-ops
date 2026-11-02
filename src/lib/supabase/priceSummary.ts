import { z } from 'zod'
import { supabase } from './client'
import { fetchAllPages } from './pagination'
import { buildPriceRow } from '@/lib/priceSummary/model'
import type { PriceSummary } from '@/lib/priceSummary/model'

const importSchema = z.object({
  id: z.string(),
  file_name: z.string(),
  original_file_name: z.string().nullable(),
  label: z.string(),
  invalid_count: z.number(),
  duplicate_count: z.number(),
})
const allocationSchema = z.object({
  supplier_price: z.number().nullable(),
  supplier_product_name: z.string(),
  suppliers: z.object({ name: z.string() }),
})
const orderSchema = z.object({
  id: z.string(),
  order_import_id: z.string(),
  raw: z.record(z.string(), z.unknown()),
  raw_row_number: z.number(),
  created_at: z.string(),
  platform: z.enum(['coupang', 'toss']),
  quantity: z.number().positive(),
  // unique(order_id) makes PostgREST return an object (or null) for this join.
  // Normalize at the API boundary so the export model stays independent of joins.
  allocations: z
    .union([allocationSchema, z.array(allocationSchema), z.null()])
    .transform((value) =>
      value === null ? [] : Array.isArray(value) ? value : [value]
    ),
})
export async function getPriceSummaries(
  sessionId: string
): Promise<PriceSummary[]> {
  const { data, error } = await supabase
    .from('order_imports')
    .select(
      'id,file_name,original_file_name,label,invalid_count,duplicate_count'
    )
    .eq('work_session_id', sessionId)
    .order('uploaded_at')
    .order('id')
  if (error) throw new Error(`가격정리 목록 조회 실패: ${error.message}`)
  const importResult = importSchema.array().safeParse(data)
  if (!importResult.success)
    throw new Error(
      '가격정리 목록 정보 형식을 확인할 수 없습니다. 관리자에게 문의해주세요.'
    )
  const imports = importResult.data
  const raw = await fetchAllPages<unknown>(async (from, to) => {
    const result = await supabase
      .from('orders')
      .select(
        'id,order_import_id,raw,raw_row_number,created_at,platform,quantity,allocations(supplier_price,supplier_product_name,suppliers(name))'
      )
      .eq('work_session_id', sessionId)
      .order('raw_row_number')
      .order('created_at')
      .order('id')
      .range(from, to)
    return { data: result.data ?? [], error: result.error }
  }, '가격정리 주문 조회 실패')
  const orderResult = orderSchema.array().safeParse(raw)
  if (!orderResult.success) {
    const issue = orderResult.error.issues[0]
    const field = issue?.path.slice(1).join('.') || '주문 정보'
    throw new Error(
      `가격정리 주문 정보 형식을 확인할 수 없습니다 (${field}). 관리자에게 문의해주세요.`
    )
  }
  const orders = orderResult.data
  return imports.map((i) => ({
    id: i.id,
    name: i.original_file_name ?? '',
    label: i.label || i.file_name,
    excluded: i.invalid_count + i.duplicate_count,
    rows: orders.filter((o) => o.order_import_id === i.id).map(buildPriceRow),
  }))
}
export async function getPriceTemplate(): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from('templates')
    .download('price-summary/v1.xlsx')
  if (error)
    throw new Error(
      '가격정리 양식이 등록되지 않았거나 불러올 수 없습니다. 관리자에게 문의해주세요.'
    )
  return data
}
