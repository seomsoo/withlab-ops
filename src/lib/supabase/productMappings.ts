import { supabase } from '@/lib/supabase/client'
import {
  productMappingFormSchema,
  toProductMapping,
} from '@/lib/schemas'
import { toFriendlyDbError } from '@/lib/supabase/errors'

import type { ProductMapping, Platform } from '@/types'
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

export async function switchDefaultSupplier(input: {
  platform: Platform
  productName: string
  optionName: string
  newSupplierId: string
}): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from('product_mappings')
    .select('*')
    .eq('platform', input.platform)
    .eq('product_name', input.productName)
    .eq('option_name', input.optionName)

  if (fetchErr) throw new Error(`매핑 조회 실패: ${fetchErr.message}`)

  const rows = existing as ProductMappingRow[]

  const currentDefaults = rows.filter((r) => r.is_default)
  for (const row of currentDefaults) {
    if (row.supplier_id !== input.newSupplierId) {
      const { error } = await supabase
        .from('product_mappings')
        .update({ is_default: false })
        .eq('id', row.id)
      if (error) throw new Error(`기존 기본 매핑 해제 실패: ${error.message}`)
    }
  }

  const existingForNewSupplier = rows.find(
    (r) => r.supplier_id === input.newSupplierId
  )

  if (existingForNewSupplier) {
    const { error } = await supabase
      .from('product_mappings')
      .update({ is_default: true, priority: 0 })
      .eq('id', existingForNewSupplier.id)
    if (error) throw new Error(`매핑 기본 설정 실패: ${error.message}`)
  } else {
    const { error } = await supabase
      .from('product_mappings')
      .insert({
        platform: input.platform,
        product_name: input.productName,
        option_name: input.optionName,
        supplier_id: input.newSupplierId,
        is_default: true,
        priority: 0,
      })
    if (error) throw new Error(toFriendlyDbError(error, 'product_mapping'))
  }
}

export async function createAutoProductMapping(input: {
  platform: Platform
  productName: string
  optionName: string
  supplierId: string
}): Promise<void> {
  const { error } = await supabase
    .from('product_mappings')
    .upsert(
      {
        platform: input.platform,
        product_name: input.productName,
        option_name: input.optionName,
        supplier_id: input.supplierId,
        is_default: true,
        priority: 0,
      },
      { onConflict: 'platform,product_name,option_name,supplier_id', ignoreDuplicates: true }
    )
  if (error) throw new Error(toFriendlyDbError(error, 'product_mapping'))
}
