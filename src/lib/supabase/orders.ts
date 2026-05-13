import { supabase } from '@/lib/supabase/client'
import { standardOrderSchema, toOrderImport, toStandardOrder } from '@/lib/schemas'

import type { StandardOrder, OrderImport, InvalidRow, DuplicateRow, Platform } from '@/types'
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
  if (error) throw new Error(`주문 임포트 생성 실패: ${error.message}`)
  return toOrderImport(data as OrderImportRow)
}

export async function saveOrders(
  workSessionId: string,
  orderImportId: string,
  orders: StandardOrder[]
): Promise<void> {
  if (orders.length === 0) return

  standardOrderSchema.array().parse(orders)

  const rows = orders.map((o) => ({
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

  const { error } = await supabase.from('orders').insert(rows)
  if (error) throw new Error(`주문 저장 실패: ${error.message}`)
}

export async function getOrders(
  workSessionId: string
): Promise<StandardOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('work_session_id', workSessionId)
    .order('platform')
    .order('raw_row_number')
  if (error) throw new Error(`주문 조회 실패: ${error.message}`)
  return (data as OrderRow[]).map(toStandardOrder)
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

export async function deleteOrderImport(
  orderImportId: string
): Promise<void> {
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
