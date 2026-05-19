import { supabase } from '@/lib/supabase/client'
import { toSupplierTrackingTemplate } from '@/lib/schemas'

import type { SupplierTrackingTemplate } from '@/types'
import type { SupplierTrackingTemplateRow } from '@/lib/schemas'

export async function getSupplierTrackingTemplate(
  supplierId: string
): Promise<SupplierTrackingTemplate | null> {
  const { data, error } = await supabase
    .from('supplier_tracking_templates')
    .select('*')
    .eq('supplier_id', supplierId)
    .maybeSingle()

  if (error) throw new Error(`운송장 양식 조회 실패: ${error.message}`)
  if (!data) return null
  return toSupplierTrackingTemplate(data as SupplierTrackingTemplateRow)
}

export async function upsertSupplierTrackingTemplate(input: {
  supplierId: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  orderKeyColumn: number
  orderKeyHeader: string
  trackingNumberColumn: number
  trackingNumberHeader: string
  courierColumn: number | null
  courierHeader: string | null
  defaultCourier: string | null
  productNameColumn: number | null
  productNameHeader: string | null
  recipientColumn: number | null
  recipientHeader: string | null
}): Promise<SupplierTrackingTemplate> {
  const { data, error } = await supabase
    .from('supplier_tracking_templates')
    .upsert(
      {
        supplier_id: input.supplierId,
        sheet_name: input.sheetName,
        header_row: input.headerRow,
        data_start_row: input.dataStartRow,
        order_key_column: input.orderKeyColumn,
        order_key_header: input.orderKeyHeader,
        tracking_number_column: input.trackingNumberColumn,
        tracking_number_header: input.trackingNumberHeader,
        courier_column: input.courierColumn,
        courier_header: input.courierHeader,
        default_courier: input.defaultCourier,
        product_name_column: input.productNameColumn,
        product_name_header: input.productNameHeader,
        recipient_column: input.recipientColumn,
        recipient_header: input.recipientHeader,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'supplier_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`운송장 양식 저장 실패: ${error.message}`)
  return toSupplierTrackingTemplate(data as SupplierTrackingTemplateRow)
}

export async function deleteSupplierTrackingTemplate(
  supplierId: string
): Promise<void> {
  const { error } = await supabase
    .from('supplier_tracking_templates')
    .delete()
    .eq('supplier_id', supplierId)

  if (error) throw new Error(`운송장 양식 삭제 실패: ${error.message}`)
}
