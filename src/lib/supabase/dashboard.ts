import { supabase } from '@/lib/supabase/client'

import type { WorkSession, WorkSessionStatus } from '@/types'

export type DashboardWorkSession = WorkSession & {
  orderCount: number
  allocationCount: number
  supplierCount: number
  trackingCount: number
  matchedTrackingCount: number
  unmatchedTrackingCount: number
}

export type DashboardStats = {
  activeSessionCount: number
  orderedSessionCount: number
  totalSupplierCount: number
  totalMappingCount: number
  unmatchedTrackingCount: number
}

type DashboardViewRow = {
  id: string
  name: string
  status: string
  created_at: string
  created_by: string | null
  completed_at: string | null
  order_count: number
  allocation_count: number
  supplier_count: number
  tracking_count: number
  matched_tracking_count: number
  unmatched_tracking_count: number
}

function toDashboardWorkSession(row: DashboardViewRow): DashboardWorkSession {
  return {
    id: row.id,
    name: row.name,
    status: row.status as WorkSessionStatus,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
    completedAt: row.completed_at ?? undefined,
    orderCount: Number(row.order_count),
    allocationCount: Number(row.allocation_count),
    supplierCount: Number(row.supplier_count),
    trackingCount: Number(row.tracking_count),
    matchedTrackingCount: Number(row.matched_tracking_count),
    unmatchedTrackingCount: Number(row.unmatched_tracking_count),
  }
}

export async function getRecentWorkSessions(
  limit = 5
): Promise<DashboardWorkSession[]> {
  const { data, error } = await supabase
    .from('work_session_dashboard_view')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error)
    throw new Error(`최근 작업건 조회 실패: ${error.message}`)
  return (data as DashboardViewRow[]).map(toDashboardWorkSession)
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    activeRes,
    orderedRes,
    supplierRes,
    mappingRes,
    unmatchedRes,
  ] = await Promise.all([
    supabase
      .from('work_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('work_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ordered'),
    supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('product_mappings')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('trackings')
      .select('*, work_sessions!inner(status)', {
        count: 'exact',
        head: true,
      })
      .in('status', ['unmatched', 'duplicated', 'invalid'])
      .eq('work_sessions.status', 'ordered'),
  ])

  for (const res of [activeRes, orderedRes, supplierRes, mappingRes]) {
    if (res.error) throw new Error(`통계 조회 실패: ${res.error.message}`)
  }

  let unmatchedCount = 0
  if (unmatchedRes.error) {
    // join 필터가 실패하면 fallback — 0으로 처리
    console.error('미매칭 카운트 조회 실패:', unmatchedRes.error.message)
  } else {
    unmatchedCount = unmatchedRes.count ?? 0
  }

  return {
    activeSessionCount: activeRes.count ?? 0,
    orderedSessionCount: orderedRes.count ?? 0,
    totalSupplierCount: supplierRes.count ?? 0,
    totalMappingCount: mappingRes.count ?? 0,
    unmatchedTrackingCount: unmatchedCount,
  }
}
