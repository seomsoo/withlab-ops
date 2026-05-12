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

export type UnmappedProduct = {
  platform: Platform
  productName: string
  optionName: string
  orderCount: number
}

export async function getUnmappedProducts(): Promise<UnmappedProduct[]> {
  const { data: orders, error: ordErr } = await supabase
    .from('orders')
    .select('platform, product_name, option_name')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (ordErr) throw new Error(`주문 조회 실패: ${ordErr.message}`)

  const { data: mappings, error: mapErr } = await supabase
    .from('product_mappings')
    .select('platform, product_name, option_name')
  if (mapErr) throw new Error(`매핑 조회 실패: ${mapErr.message}`)

  const mappedKeys = new Set(
    (mappings ?? []).map(
      (m: { platform: string; product_name: string; option_name: string }) =>
        `${m.platform}::${m.product_name}::${m.option_name}`
    )
  )

  const counts = new Map<string, { platform: Platform; productName: string; optionName: string; count: number }>()
  for (const o of orders ?? []) {
    const key = `${o.platform as string}::${o.product_name as string}::${o.option_name as string}`
    if (mappedKeys.has(key)) continue
    const commonKey = `common::${o.product_name as string}::${o.option_name as string}`
    if (mappedKeys.has(commonKey)) continue

    const existing = counts.get(key)
    if (existing) {
      existing.count++
    } else {
      counts.set(key, {
        platform: o.platform as Platform,
        productName: o.product_name as string,
        optionName: (o.option_name as string) ?? '',
        count: 1,
      })
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map((v) => ({
      platform: v.platform,
      productName: v.productName,
      optionName: v.optionName,
      orderCount: v.count,
    }))
}

export async function createProductMappingsBulk(
  items: Array<{
    platform: Platform
    productName: string
    optionName: string
    supplierId: string
  }>
): Promise<number> {
  if (items.length === 0) return 0
  const rows = items.map((i) => ({
    platform: i.platform,
    product_name: i.productName,
    option_name: i.optionName,
    supplier_id: i.supplierId,
    is_default: true,
    priority: 0,
  }))
  const { error } = await supabase
    .from('product_mappings')
    .upsert(rows, { onConflict: 'platform,product_name,option_name,supplier_id', ignoreDuplicates: true })
  if (error) throw new Error(`일괄 매핑 등록 실패: ${error.message}`)
  return items.length
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
