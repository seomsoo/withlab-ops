import { supabase } from '@/lib/supabase/client'
import { toSupplierProduct } from '@/lib/schemas'
import { chunkArray, fetchAllPages } from '@/lib/supabase/pagination'

import type { SupplierProduct } from '@/types'
import type { SupplierProductRow } from '@/lib/schemas'

export async function getSupplierProducts(
  supplierId: string
): Promise<SupplierProduct[]> {
  const allRows = await fetchAllPages<SupplierProductRow>(async (from, to) => {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('product_name')
      .order('id', { ascending: true })
      .range(from, to)
    return { data: (data ?? []) as SupplierProductRow[], error }
  }, '공급처 상품 조회 실패')

  return allRows.map(toSupplierProduct)
}

export async function getAllSupplierProducts(): Promise<SupplierProduct[]> {
  const allRows = await fetchAllPages<SupplierProductRow>(async (from, to) => {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('*')
      .order('uploaded_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
    return { data: (data ?? []) as SupplierProductRow[], error }
  }, '전체 공급처 상품 조회 실패')

  return allRows.map(toSupplierProduct)
}

export async function replaceSupplierProducts(
  supplierId: string,
  products: Omit<SupplierProduct, 'id' | 'uploadedAt' | 'supplierId'>[]
): Promise<{ count: number }> {
  const existingRows = await fetchAllPages<{ id: string }>(async (from, to) => {
    const { data, error } = await supabase
      .from('supplier_products')
      .select('id')
      .eq('supplier_id', supplierId)
      .order('id', { ascending: true })
      .range(from, to)
    return { data: (data ?? []) as { id: string }[], error }
  }, '기존 공급처 상품 조회 실패')

  const rows = products.map((p) => ({
    supplier_id: supplierId,
    product_code: p.productCode,
    product_name: p.productName,
    option_name: p.optionName,
    category: p.category,
    price: p.price,
    stock_status: p.stockStatus,
    stock_raw: p.stockRaw,
    courier: p.courier,
    extra: p.extra,
  }))

  const insertedIds: string[] = []
  for (const batch of chunkArray(rows)) {
    const { data, error } = await supabase
      .from('supplier_products')
      .insert(batch)
      .select('id')
    if (error) {
      for (const ids of chunkArray(insertedIds)) {
        await supabase.from('supplier_products').delete().in('id', ids)
      }
      throw new Error(`공급처 상품 교체 실패: ${error.message}`)
    }
    insertedIds.push(...((data ?? []) as { id: string }[]).map((row) => row.id))
  }

  for (const ids of chunkArray(existingRows.map((row) => row.id))) {
    const { error } = await supabase
      .from('supplier_products')
      .delete()
      .in('id', ids)
    if (error) throw new Error(`기존 공급처 상품 삭제 실패: ${error.message}`)
  }

  return { count: rows.length }
}

export async function getSupplierProductCount(
  supplierId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('supplier_products')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', supplierId)

  if (error) throw new Error(`상품 수 조회 실패: ${error.message}`)
  return count ?? 0
}

export async function getSupplierProductCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('get_supplier_product_counts')

  if (error) throw new Error(`상품 수 일괄 조회 실패: ${error.message}`)

  const counts = new Map<string, number>()
  for (const row of (data ?? []) as { supplier_id: string; count: number }[]) {
    counts.set(row.supplier_id, row.count)
  }
  return counts
}
