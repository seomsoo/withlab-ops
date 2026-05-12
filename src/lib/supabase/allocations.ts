import { supabase } from '@/lib/supabase/client'
import { toAllocation, toStandardOrder } from '@/lib/schemas'

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
  >
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

  const { data, error } = await supabase
    .from('allocations')
    .insert(rows)
    .select()

  if (error) throw new Error(`배정 생성 실패: ${error.message}`)
  return (data as AllocationRow[]).map(toAllocation)
}

export async function getAllocations(
  workSessionId: string
): Promise<AllocationWithOrder[]> {
  const { data, error } = await supabase
    .from('allocations')
    .select(`
      *,
      orders!inner (
        platform, product_name, option_name, display_product_name,
        quantity, matching_key,
        order_no, order_item_no, recipient_name, recipient_phone,
        address, zip_code, delivery_message, buyer_name, buyer_phone,
        raw_values, raw_row_number
      ),
      suppliers!inner ( name )
    `)
    .eq('work_session_id', workSessionId)

  if (error) throw new Error(`배정 조회 실패: ${error.message}`)

  return (data ?? []).map((row: Record<string, unknown>) => {
    const alloc = toAllocation(row as AllocationRow)
    const orderRow = row.orders as Record<string, unknown>
    const supplierRow = row.suppliers as { name: string }

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
        recipientName: orderRow.recipient_name as string,
        recipientPhone: (orderRow.recipient_phone as string) ?? '',
        address: orderRow.address as string,
        zipCode: (orderRow.zip_code as string) ?? '',
        deliveryMessage: (orderRow.delivery_message as string) ?? '',
        buyerName: (orderRow.buyer_name as string) ?? '',
        buyerPhone: (orderRow.buyer_phone as string) ?? '',
        rawValues: orderRow.raw_values as unknown[],
        rawRowNumber: orderRow.raw_row_number as number,
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
  isTemporaryOverride: boolean
  nameMappingApplied: boolean
}): Promise<Allocation[]> {
  const { data, error } = await supabase
    .from('allocations')
    .update({
      supplier_id: input.newSupplierId,
      supplier_product_name: input.supplierProductName,
      supplier_product_code: input.supplierProductCode ?? null,
      is_temporary_override: input.isTemporaryOverride,
      name_mapping_applied: input.nameMappingApplied,
      smart_allocation_applied: false,
      supplier_price: null,
    })
    .eq('work_session_id', input.workSessionId)
    .in('order_id', input.orderIds)
    .select()

  if (error) throw new Error(`공급처 변경 실패: ${error.message}`)
  return (data as AllocationRow[]).map(toAllocation)
}

export async function replaceAllocationsForGroup(
  workSessionId: string,
  orderIds: string[],
  newAllocations: PendingAllocation[]
): Promise<Allocation[]> {
  const { error: deleteError } = await supabase
    .from('allocations')
    .delete()
    .eq('work_session_id', workSessionId)
    .in('order_id', orderIds)

  if (deleteError) throw new Error(`기존 배정 삭제 실패: ${deleteError.message}`)

  return createAllocations(workSessionId, newAllocations)
}

export async function updateGroupSupplierProduct(input: {
  workSessionId: string
  orderIds: string[]
  supplierProductName: string
  supplierProductCode?: string
  supplierPrice?: number
}): Promise<void> {
  const { error } = await supabase
    .from('allocations')
    .update({
      supplier_product_name: input.supplierProductName,
      supplier_product_code: input.supplierProductCode ?? null,
      supplier_price: input.supplierPrice ?? null,
    })
    .eq('work_session_id', input.workSessionId)
    .in('order_id', input.orderIds)

  if (error) throw new Error(`상품 변경 실패: ${error.message}`)
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

export async function getUnallocatedOrders(
  workSessionId: string
): Promise<StandardOrder[]> {
  const [ordersResult, allocsResult] = await Promise.all([
    supabase.from('orders').select('*').eq('work_session_id', workSessionId),
    supabase
      .from('allocations')
      .select('order_id')
      .eq('work_session_id', workSessionId),
  ])

  if (ordersResult.error) throw new Error(`주문 조회 실패: ${ordersResult.error.message}`)
  if (allocsResult.error) throw new Error(`배정 조회 실패: ${allocsResult.error.message}`)

  const allocatedIds = new Set(
    (allocsResult.data ?? []).map((a: { order_id: string }) => a.order_id)
  )
  return (ordersResult.data as OrderRow[])
    .filter((o) => !allocatedIds.has(o.id))
    .map(toStandardOrder)
}
