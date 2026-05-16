import { supabase } from '@/lib/supabase/client'

export type SupplierEnrichment = {
  supplierId: string
  mappingCount: number
  avgPrice: number | null
}

async function fetchAllRows<T>(
  table: string,
  select: string
): Promise<T[]> {
  const PAGE_SIZE = 1000
  const allRows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    const rows = (data ?? []) as T[]
    allRows.push(...rows)
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allRows
}

export async function getSupplierEnrichments(): Promise<Map<string, SupplierEnrichment>> {
  const [mappingsData, productsData] = await Promise.all([
    fetchAllRows<{ supplier_id: string }>('product_mappings', 'supplier_id'),
    fetchAllRows<{ supplier_id: string; price: number | null }>('supplier_products', 'supplier_id, price'),
  ])

  const map = new Map<string, SupplierEnrichment>()

  for (const m of mappingsData) {
    const id = m.supplier_id
    const existing = map.get(id)
    if (existing) {
      existing.mappingCount++
    } else {
      map.set(id, { supplierId: id, mappingCount: 1, avgPrice: null })
    }
  }

  const priceSums = new Map<string, { total: number; count: number }>()
  for (const p of productsData) {
    const id = p.supplier_id
    const price = p.price
    if (price == null) continue
    const existing = priceSums.get(id)
    if (existing) {
      existing.total += price
      existing.count++
    } else {
      priceSums.set(id, { total: price, count: 1 })
    }
  }

  for (const [id, ps] of priceSums) {
    const existing = map.get(id)
    const avg = Math.round(ps.total / ps.count)
    if (existing) {
      existing.avgPrice = avg
    } else {
      map.set(id, { supplierId: id, mappingCount: 0, avgPrice: avg })
    }
  }

  return map
}

export type MappingStats = {
  supplierCount: number
  templateCount: number
  activeSupplierCount: number
  catalogCount: number
  productMappingCount: number
  nameMappingCount: number
  courierMappingCount: number
  dictionaryCount: number
}

export async function getMappingStats(): Promise<MappingStats> {
  const [suppliers, templates, catalog, productMappings, nameMappings, couriers] =
    await Promise.all([
      supabase.from('suppliers').select('id, is_active', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('supplier_templates').select('id', { count: 'exact', head: true }),
      supabase.from('supplier_products').select('id', { count: 'exact', head: true }),
      supabase.from('product_mappings').select('id', { count: 'exact', head: true }),
      supabase.from('name_mappings').select('id', { count: 'exact', head: true }),
      supabase.from('courier_mappings').select('id', { count: 'exact', head: true }),
    ])

  const dictionary = await supabase
    .from('fruit_dictionary')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
  const dictionaryCount = dictionary.error?.code === 'PGRST205' ? 0 : (dictionary.count ?? 0)

  return {
    supplierCount: suppliers.count ?? 0,
    activeSupplierCount: suppliers.count ?? 0,
    templateCount: templates.count ?? 0,
    catalogCount: catalog.count ?? 0,
    productMappingCount: productMappings.count ?? 0,
    nameMappingCount: nameMappings.count ?? 0,
    courierMappingCount: couriers.count ?? 0,
    dictionaryCount,
  }
}
