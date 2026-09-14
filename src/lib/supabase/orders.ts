import { supabase } from '@/lib/supabase/client'
import {
  standardOrderSchema,
  toOrderImport,
  toStandardOrder,
} from '@/lib/schemas'
import { chunkArray, fetchAllPages } from '@/lib/supabase/pagination'
import { toFriendlyDbError } from '@/lib/supabase/errors'
import { z } from 'zod'

import type {
  StandardOrder,
  OrderImport,
  InvalidRow,
  DuplicateRow,
  Platform,
} from '@/types'
import type { OrderImportRow, OrderRow } from '@/lib/schemas'

type CreateOrderImportInput = {
  workSessionId: string
  platform: Platform
  fileName: string
  label: string
  totalRows: number
  validCount: number
  invalidCount: number
  duplicateCount: number
  invalidRows: InvalidRow[]
  duplicateRows: DuplicateRow[]
}

export async function createOrderImport(
  input: CreateOrderImportInput
): Promise<OrderImport> {
  const { data, error } = await supabase
    .from('order_imports')
    .insert({
      work_session_id: input.workSessionId,
      platform: input.platform,
      file_name: input.fileName,
      label: input.label,
      total_rows: input.totalRows,
      valid_count: input.validCount,
      invalid_count: input.invalidCount,
      duplicate_count: input.duplicateCount,
      invalid_rows: input.invalidRows,
      duplicate_rows: input.duplicateRows,
    })
    .select()
    .single()
  if (error) throw new Error(toFriendlyDbError(error, 'order_import'))
  return toOrderImport(data as OrderImportRow)
}

export async function saveOrders(
  workSessionId: string,
  orderImportId: string,
  orders: StandardOrder[]
): Promise<void> {
  if (orders.length === 0) return

  const rows = toOrderInsertRows(workSessionId, orderImportId, orders)

  for (const batch of chunkArray(rows)) {
    const { error } = await supabase.from('orders').insert(batch)
    if (error) throw new Error(toFriendlyDbError(error, 'order'))
  }
}

function toOrderInsertRows(
  workSessionId: string,
  orderImportId: string,
  orders: StandardOrder[]
) {
  standardOrderSchema.array().parse(orders)
  return orders.map((o) => ({
    id: o.id,
    work_session_id: workSessionId,
    order_import_id: orderImportId,
    platform: o.platform,
    order_no: o.orderNo,
    order_item_no: o.orderItemNo,
    matching_key: o.matchingKey,
    order_date: o.orderDate || null,
    product_name: o.productName,
    option_name: o.optionName,
    display_product_name: o.displayProductName,
    quantity: o.quantity,
    buyer_name: o.buyerName || null,
    buyer_phone: o.buyerPhone || null,
    buyer_phone_digits: o.buyerPhoneDigits || null,
    recipient_name: o.recipientName,
    recipient_phone: o.recipientPhone || null,
    recipient_phone_digits: o.recipientPhoneDigits || null,
    zip_code: o.zipCode || null,
    address: o.address,
    delivery_message: o.deliveryMessage || null,
    raw: o.raw,
    raw_values: o.rawValues,
    raw_row_number: o.rawRowNumber,
  }))
}

const appendResultSchema = z.object({
  inserted_count: z.number().int().nonnegative(),
  duplicate_count: z.number().int().nonnegative(),
  total_count: z.number().int().nonnegative(),
})

/** 중복 판정과 주문/집계 저장은 서버의 단일 트랜잭션에서 수행한다. */
export async function appendOrdersToImport(input: {
  workSessionId: string
  orderImportId: string
  platform: Platform
  fileName: string
  orders: StandardOrder[]
  invalidRows: InvalidRow[]
  duplicateRows: DuplicateRow[]
}): Promise<{ insertedCount: number; duplicateCount: number; totalCount: number }> {
  if (input.orders.some((order) => order.platform !== input.platform)) {
    throw new Error('추가할 주문의 플랫폼이 일치하지 않습니다')
  }
  const { data, error } = await supabase.rpc('append_orders_to_import', {
    p_work_session_id: input.workSessionId,
    p_order_import_id: input.orderImportId,
    p_platform: input.platform,
    p_file_name: input.fileName,
    p_orders: toOrderInsertRows(input.workSessionId, input.orderImportId, input.orders),
    p_invalid_rows: input.invalidRows,
    p_duplicate_rows: input.duplicateRows,
  })
  if (error) throw new Error(toFriendlyDbError(error, 'order'))
  const result = appendResultSchema.parse(data)
  return {
    insertedCount: result.inserted_count,
    duplicateCount: result.duplicate_count,
    totalCount: result.total_count,
  }
}

export async function getOrders(
  workSessionId: string
): Promise<StandardOrder[]> {
  const allRows = await fetchAllPages<OrderRow>(async (from, to) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('work_session_id', workSessionId)
      .order('platform')
      .order('raw_row_number')
      .order('id', { ascending: true })
      .range(from, to)
    return { data: (data ?? []) as OrderRow[], error }
  }, '주문 조회 실패')

  return allRows.map(toStandardOrder)
}

export async function getOrderImports(
  workSessionId: string
): Promise<OrderImport[]> {
  const { data, error } = await supabase
    .from('order_imports')
    .select('*')
    .eq('work_session_id', workSessionId)
    .order('uploaded_at')
  if (error) throw new Error(`주문 임포트 조회 실패: ${error.message}`)
  return (data as OrderImportRow[]).map(toOrderImport)
}

export async function deleteOrderImport(orderImportId: string): Promise<void> {
  const { error } = await supabase
    .from('order_imports')
    .delete()
    .eq('id', orderImportId)
  if (error) throw new Error(`주문 임포트 삭제 실패: ${error.message}`)
}

export async function updateOrderImportLabel(
  importId: string,
  label: string
): Promise<void> {
  const { error } = await supabase
    .from('order_imports')
    .update({ label })
    .eq('id', importId)
  if (error) throw new Error(`라벨 변경 실패: ${error.message}`)
}
