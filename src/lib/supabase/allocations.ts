import { supabase } from '@/lib/supabase/client'
import { toAllocation, toStandardOrder } from '@/lib/schemas'
import { chunkArray, fetchAllPages } from '@/lib/supabase/pagination'
import { toFriendlyDbError } from '@/lib/supabase/errors'

import type { Allocation, StandardOrder, Platform } from '@/types'
import type { AllocationRow, OrderRow } from '@/lib/schemas'
import type { PendingAllocation } from '@/lib/allocation/autoAllocator'

export type AllocationWithOrder = Allocation & {
  order: Pick<
    StandardOrder,
    | 'platform'
    | 'productName'
    | 'optionName'
    | 'displayProductName'
    | 'quantity'
    | 'matchingKey'
    | 'orderNo'
    | 'recipientName'
    | 'recipientPhone'
    | 'address'
    | 'zipCode'
    | 'deliveryMessage'
    | 'buyerName'
    | 'buyerPhone'
    | 'rawValues'
    | 'rawRowNumber'
    | 'orderItemNo'
    | 'orderDate'
  > & { orderImportLabel?: string }
  supplierName: string
}

export async function createAllocations(
  workSessionId: string,
  allocations: PendingAllocation[]
): Promise<Allocation[]> {
  if (allocations.length === 0) return []

  const rows = allocations.map((a) => ({
    work_session_id: workSessionId,
    order_id: a.orderId,
    supplier_id: a.supplierId,
    supplier_product_name: a.supplierProductName,
    supplier_product_code: a.supplierProductCode ?? null,
    allocated_quantity: a.allocatedQuantity,
    status: 'pending' as const,
    is_temporary_override: a.isTemporaryOverride,
    name_mapping_applied: a.nameMappingApplied,
    smart_allocation_applied: a.smartAllocationApplied,
    supplier_price: a.supplierPrice ?? null,
    allocation_reason: a.allocationReason ?? null,
  }))

  const created: AllocationRow[] = []
  for (const batch of chunkArray(rows)) {
    const { data, error } = await supabase
      .from('allocations')
      .insert(batch)
      .select()

    if (error) throw new Error(toFriendlyDbError(error, 'allocation'))
    created.push(...((data ?? []) as AllocationRow[]))
  }

  return created.map(toAllocation)
}

export async function getAllocations(
  workSessionId: string
): Promise<AllocationWithOrder[]> {
  const allData = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('allocations')
        .select(
          `
        *,
        orders!inner (
          platform, product_name, option_name, display_product_name,
          quantity, matching_key,
          order_no, order_item_no, order_date, recipient_name, recipient_phone,
          address, zip_code, delivery_message, buyer_name, buyer_phone,
          raw_values, raw_row_number,
          order_imports!inner ( label )
        ),
        suppliers!inner ( name )
      `
        )
        .eq('work_session_id', workSessionId)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: (data ?? []) as Record<string, unknown>[], error }
    },
    '배정 조회 실패'
  )

  return allData.map((row: Record<string, unknown>) => {
    const alloc = toAllocation(row as AllocationRow)
    const orderRow = row.orders as Record<string, unknown>
    const supplierRow = row.suppliers as { name: string }
    const importRow = orderRow.order_imports as { label: string } | null

    return {
      ...alloc,
      order: {
        platform: orderRow.platform as Platform,
        productName: orderRow.product_name as string,
        optionName: orderRow.option_name as string,
        displayProductName: (orderRow.display_product_name as string) ?? '',
        quantity: orderRow.quantity as number,
        matchingKey: orderRow.matching_key as string,
        orderNo: orderRow.order_no as string,
        orderItemNo: orderRow.order_item_no as string,
        orderDate: (orderRow.order_date as string) ?? '',
        recipientName: orderRow.recipient_name as string,
        recipientPhone: (orderRow.recipient_phone as string) ?? '',
        address: orderRow.address as string,
        zipCode: (orderRow.zip_code as string) ?? '',
        deliveryMessage: (orderRow.delivery_message as string) ?? '',
        buyerName: (orderRow.buyer_name as string) ?? '',
        buyerPhone: (orderRow.buyer_phone as string) ?? '',
        rawValues: orderRow.raw_values as unknown[],
        rawRowNumber: orderRow.raw_row_number as number,
        orderImportLabel: importRow?.label,
      },
      supplierName: supplierRow.name,
    }
  })
}

export async function updateGroupSupplier(input: {
  workSessionId: string
  orderIds: string[]
  newSupplierId: string
  supplierProductName: string
  supplierProductCode?: string
  supplierPrice?: number
  isTemporaryOverride: boolean
  nameMappingApplied: boolean
}): Promise<Allocation[]> {
  const updated: AllocationRow[] = []
  for (const orderIds of chunkArray(input.orderIds)) {
    const { data, error } = await supabase
      .from('allocations')
      .update({
        supplier_id: input.newSupplierId,
        supplier_product_name: input.supplierProductName,
        supplier_product_code: input.supplierProductCode ?? null,
        is_temporary_override: input.isTemporaryOverride,
        name_mapping_applied: input.nameMappingApplied,
        smart_allocation_applied: false,
        supplier_price: input.supplierPrice ?? null,
      })
      .eq('work_session_id', input.workSessionId)
      .in('order_id', orderIds)
      .select()

    if (error) throw new Error(`공급처 변경 실패: ${error.message}`)
    updated.push(...((data ?? []) as AllocationRow[]))
  }

  return updated.map(toAllocation)
}

export async function replaceAllocationsForGroup(
  workSessionId: string,
  orderIds: string[],
  newAllocations: PendingAllocation[]
): Promise<Allocation[]> {
  const jsonbPayload = newAllocations.map((a) => ({
    order_id: a.orderId,
    supplier_id: a.supplierId,
    supplier_product_name: a.supplierProductName,
    supplier_product_code: a.supplierProductCode ?? null,
    allocated_quantity: a.allocatedQuantity,
    is_temporary_override: a.isTemporaryOverride,
    name_mapping_applied: a.nameMappingApplied,
    smart_allocation_applied: a.smartAllocationApplied,
    supplier_price: a.supplierPrice ?? null,
    allocation_reason: a.allocationReason ?? null,
  }))

  const { data, error } = await supabase.rpc('replace_allocations_for_group', {
    p_work_session_id: workSessionId,
    p_order_ids: orderIds,
    p_new_allocations: jsonbPayload,
  })

  if (error) throw new Error(`배정 교체 실패: ${error.message}`)
  return ((data ?? []) as AllocationRow[]).map(toAllocation)
}

export async function updateGroupSupplierProduct(input: {
  workSessionId: string
  orderIds: string[]
  supplierProductName: string
  supplierProductCode?: string
  supplierPrice?: number
}): Promise<void> {
  for (const orderIds of chunkArray(input.orderIds)) {
    const { error } = await supabase
      .from('allocations')
      .update({
        supplier_product_name: input.supplierProductName,
        supplier_product_code: input.supplierProductCode ?? null,
        supplier_price: input.supplierPrice ?? null,
      })
      .eq('work_session_id', input.workSessionId)
      .in('order_id', orderIds)

    if (error) throw new Error(`상품 변경 실패: ${error.message}`)
  }
}

export async function completeOrder(workSessionId: string): Promise<void> {
  const { error } = await supabase.rpc('complete_order_session', {
    p_work_session_id: workSessionId,
  })
  if (error) throw new Error(`발주 완료 처리 실패: ${error.message}`)
}

export async function revertOrder(workSessionId: string): Promise<void> {
  const { error } = await supabase.rpc('revert_order_session', {
    p_work_session_id: workSessionId,
  })
  if (error) throw new Error(`발주 되돌리기 실패: ${error.message}`)
}

export async function deleteSupplierAllocations(
  workSessionId: string,
  supplierId: string
): Promise<void> {
  const { error } = await supabase
    .from('allocations')
    .delete()
    .eq('work_session_id', workSessionId)
    .eq('supplier_id', supplierId)

  if (error) throw new Error(`배정 삭제 실패: ${error.message}`)
}

export async function deleteAllAllocations(
  workSessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('allocations')
    .delete()
    .eq('work_session_id', workSessionId)
  if (error) throw new Error(`배정 초기화 실패: ${error.message}`)
}

export async function getUnallocatedOrders(
  workSessionId: string
): Promise<StandardOrder[]> {
  const [allOrders, allAllocs] = await Promise.all([
    fetchAllPages<OrderRow>(async (from, to) => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('work_session_id', workSessionId)
        .order('platform')
        .order('raw_row_number')
        .order('id', { ascending: true })
        .range(from, to)
      return { data: (data ?? []) as OrderRow[], error }
    }, '주문 조회 실패'),
    fetchAllPages<{ order_id: string }>(async (from, to) => {
      const { data, error } = await supabase
        .from('allocations')
        .select('order_id')
        .eq('work_session_id', workSessionId)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: (data ?? []) as { order_id: string }[], error }
    }, '배정 조회 실패'),
  ])

  const allocatedIds = new Set(allAllocs.map((a) => a.order_id))
  return allOrders.filter((o) => !allocatedIds.has(o.id)).map(toStandardOrder)
}
