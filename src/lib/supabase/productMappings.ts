import { supabase } from '@/lib/supabase/client'
import {
  productMappingFormSchema,
  toProductMapping,
} from '@/lib/schemas'
import { toFriendlyDbError } from '@/lib/supabase/errors'

import type { ProductMapping } from '@/types'
import type {
  ProductMappingFormData,
  ProductMappingWithSupplier,
  ProductMappingRow,
} from '@/lib/schemas'

type ProductMappingJoinRow = ProductMappingRow & {
  supplier: { id: string; name: string; is_active: boolean } | null
}

function toProductMappingWithSupplier(
  row: ProductMappingJoinRow
): ProductMappingWithSupplier {
  return {
    ...toProductMapping(row),
    supplierName: row.supplier?.name ?? '알 수 없음',
    supplierIsActive: row.supplier?.is_active ?? false,
  }
}

export async function getProductMappings(): Promise<
  ProductMappingWithSupplier[]
> {
  const { data, error } = await supabase
    .from('product_mappings')
    .select('*, supplier:suppliers(id, name, is_active)')
    .order('platform')
    .order('product_name')
    .order('option_name')
    .order('priority')
  if (error) throw new Error(`품목 매핑 조회 실패: ${error.message}`)
  return (data as ProductMappingJoinRow[]).map(toProductMappingWithSupplier)
}

export async function createProductMapping(
  input: ProductMappingFormData
): Promise<ProductMapping> {
  const parsed = productMappingFormSchema.parse(input)
  const { data, error } = await supabase
    .from('product_mappings')
    .insert({
      platform: parsed.platform,
      product_name: parsed.productName,
      option_name: parsed.optionName,
      supplier_id: parsed.supplierId,
      is_default: parsed.isDefault,
      priority: parsed.priority,
    })
    .select()
    .single()
  if (error) throw new Error(toFriendlyDbError(error, 'product_mapping'))
  return toProductMapping(data as ProductMappingRow)
}

export async function updateProductMapping(
  id: string,
  input: ProductMappingFormData
): Promise<ProductMapping> {
  const parsed = productMappingFormSchema.parse(input)
  const { data, error } = await supabase
    .from('product_mappings')
    .update({
      platform: parsed.platform,
      product_name: parsed.productName,
      option_name: parsed.optionName,
      supplier_id: parsed.supplierId,
      is_default: parsed.isDefault,
      priority: parsed.priority,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(toFriendlyDbError(error, 'product_mapping'))
  return toProductMapping(data as ProductMappingRow)
}

export async function deleteProductMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('product_mappings')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`품목 매핑 삭제 실패: ${error.message}`)
}
