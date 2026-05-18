import { supabase } from '@/lib/supabase/client'
import { fetchAllPages } from '@/lib/supabase/pagination'

export type HistoryEntry = {
  supplierId: string
  supplierName: string
}

export type FrequencyEntry = {
  supplierId: string
  supplierName: string
  count: number
}

export async function getYesterdayAllocations(
  excludeSessionId?: string
): Promise<Map<string, HistoryEntry>> {
  let query = supabase
    .from('work_sessions')
    .select('id')
    .in('status', ['ordered', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (excludeSessionId) {
    query = query.neq('id', excludeSessionId)
  }

  const { data: sessions, error: sessionErr } = await query

  if (sessionErr) throw new Error(`세션 조회 실패: ${sessionErr.message}`)
  if (!sessions || sessions.length === 0) return new Map()

  const sessionId = (sessions[0] as { id: string }).id

  type AllocRow = {
    supplier_id: string
    suppliers: { name: string }
    orders: { product_name: string }
  }

  const allRows = await fetchAllPages<AllocRow>(async (from, to) => {
    const { data, error } = await supabase
      .from('allocations')
      .select(
        `
        supplier_id,
        suppliers!inner(name),
        orders!inner(product_name)
      `
      )
      .eq('work_session_id', sessionId)
      .order('id', { ascending: true })
      .range(from, to)
    return { data: (data ?? []) as unknown as AllocRow[], error }
  }, '전날 배정 조회 실패')

  const result = new Map<string, HistoryEntry>()
  for (const row of allRows) {
    const productName = row.orders.product_name
    if (!result.has(productName)) {
      result.set(productName, {
        supplierId: row.supplier_id,
        supplierName: row.suppliers.name,
      })
    }
  }

  return result
}

export async function getAllocationFrequency(
  days = 30
): Promise<Map<string, FrequencyEntry[]>> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  type FreqRow = {
    supplier_id: string
    suppliers: { name: string }
    orders: { product_name: string }
    work_sessions: { status: string; created_at: string }
  }

  const allRows = await fetchAllPages<FreqRow>(async (from, to) => {
    const { data, error } = await supabase
      .from('allocations')
      .select(
        `
        supplier_id,
        suppliers!inner(name),
        orders!inner(product_name),
        work_sessions!inner(status, created_at)
      `
      )
      .in('work_sessions.status', ['ordered', 'completed'])
      .gte('work_sessions.created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
    return { data: (data ?? []) as unknown as FreqRow[], error }
  }, '빈도 조회 실패')

  const counter = new Map<
    string,
    Map<string, { name: string; count: number }>
  >()

  for (const row of allRows) {
    const productName = row.orders.product_name
    if (!counter.has(productName)) {
      counter.set(productName, new Map())
    }
    const supplierMap = counter.get(productName)!
    const entry = supplierMap.get(row.supplier_id)
    if (entry) {
      entry.count++
    } else {
      supplierMap.set(row.supplier_id, {
        name: row.suppliers.name,
        count: 1,
      })
    }
  }

  const result = new Map<string, FrequencyEntry[]>()
  for (const [productName, supplierMap] of counter) {
    const entries: FrequencyEntry[] = []
    for (const [supplierId, info] of supplierMap) {
      entries.push({
        supplierId,
        supplierName: info.name,
        count: info.count,
      })
    }
    entries.sort((a, b) => b.count - a.count)
    result.set(productName, entries)
  }

  return result
}
