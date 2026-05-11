import { supabase } from '@/lib/supabase/client'
import { toSupplierProduct } from '@/lib/schemas'

import type { SupplierProduct } from '@/types'
import type { SupplierProductRow } from '@/lib/schemas'

export async function getSupplierProducts(
  supplierId: string
): Promise<SupplierProduct[]> {
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('product_name')

  if (error) throw new Error(`공급처 상품 조회 실패: ${error.message}`)
  return (data as SupplierProductRow[]).map(toSupplierProduct)
}

export async function getAllSupplierProducts(): Promise<SupplierProduct[]> {
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*')

  if (error) throw new Error(`전체 공급처 상품 조회 실패: ${error.message}`)
  return (data as SupplierProductRow[]).map(toSupplierProduct)
}

export async function replaceSupplierProducts(
  supplierId: string,
  products: Omit<SupplierProduct, 'id' | 'uploadedAt' | 'supplierId'>[]
): Promise<{ count: number }> {
  const payload = products.map((p) => ({
    productCode: p.productCode,
    productName: p.productName,
    optionName: p.optionName,
    category: p.category,
    price: p.price,
    stockStatus: p.stockStatus,
    stockRaw: p.stockRaw,
    courier: p.courier,
    extra: p.extra,
  }))

  const { data, error } = await supabase.rpc('replace_supplier_products', {
    p_supplier_id: supplierId,
    p_products: payload,
  })

  if (error) throw new Error(`공급처 상품 교체 실패: ${error.message}`)
  return { count: (data as number) ?? 0 }
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
