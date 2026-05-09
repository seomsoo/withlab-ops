import { supabase } from '@/lib/supabase/client'
import {
  nameMappingFormSchema,
  toNameMapping,
} from '@/lib/schemas'
import { toFriendlyDbError } from '@/lib/supabase/errors'

import type { NameMapping } from '@/types'
import type {
  NameMappingFormData,
  NameMappingWithSupplier,
  NameMappingRow,
} from '@/lib/schemas'

type NameMappingJoinRow = NameMappingRow & {
  supplier: { id: string; name: string; is_active: boolean } | null
}

function toNameMappingWithSupplier(
  row: NameMappingJoinRow
): NameMappingWithSupplier {
  return {
    ...toNameMapping(row),
    supplierName: row.supplier?.name ?? '알 수 없음',
    supplierIsActive: row.supplier?.is_active ?? false,
  }
}

export async function getNameMappings(): Promise<NameMappingWithSupplier[]> {
  const { data, error } = await supabase
    .from('name_mappings')
    .select('*, supplier:suppliers(id, name, is_active)')
    .order('platform')
    .order('platform_product_name')
    .order('platform_option_name')
  if (error) throw new Error(`상품명 변환 매핑 조회 실패: ${error.message}`)
  return (data as NameMappingJoinRow[]).map(toNameMappingWithSupplier)
}

export async function createNameMapping(
  input: NameMappingFormData
): Promise<NameMapping> {
  const parsed = nameMappingFormSchema.parse(input)
  const { data, error } = await supabase
    .from('name_mappings')
    .insert({
      platform: parsed.platform,
      platform_product_name: parsed.platformProductName,
      platform_option_name: parsed.platformOptionName,
      supplier_id: parsed.supplierId,
      supplier_product_name: parsed.supplierProductName,
      supplier_product_code: parsed.supplierProductCode || '',
    })
    .select()
    .single()
  if (error) throw new Error(toFriendlyDbError(error, 'name_mapping'))
  return toNameMapping(data as NameMappingRow)
}

export async function updateNameMapping(
  id: string,
  input: NameMappingFormData
): Promise<NameMapping> {
  const parsed = nameMappingFormSchema.parse(input)
  const { data, error } = await supabase
    .from('name_mappings')
    .update({
      platform: parsed.platform,
      platform_product_name: parsed.platformProductName,
      platform_option_name: parsed.platformOptionName,
      supplier_id: parsed.supplierId,
      supplier_product_name: parsed.supplierProductName,
      supplier_product_code: parsed.supplierProductCode || '',
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(toFriendlyDbError(error, 'name_mapping'))
  return toNameMapping(data as NameMappingRow)
}

export async function deleteNameMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('name_mappings')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`상품명 변환 매핑 삭제 실패: ${error.message}`)
}
