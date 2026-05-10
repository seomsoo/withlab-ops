import { supabase } from '@/lib/supabase/client'
import { toTracking, toTrackingImport } from '@/lib/schemas'

import type { Tracking, TrackingImport, TrackingStatus, TrackingStats, InvalidRow } from '@/types'
import type { TrackingRow, TrackingImportRow } from '@/lib/schemas'

export async function createTrackingImport(input: {
  workSessionId: string
  sourceSupplierId: string
  fileName: string
  totalRows: number
  validCount: number
  invalidCount: number
  skippedRows: number
  detectedCourier: string | null
  invalidRows: InvalidRow[]
}): Promise<TrackingImport> {
  const { data, error } = await supabase
    .from('tracking_imports')
    .insert({
      work_session_id: input.workSessionId,
      source_supplier_id: input.sourceSupplierId,
      file_name: input.fileName,
      total_rows: input.totalRows,
      valid_count: input.validCount,
      invalid_count: input.invalidCount,
      skipped_rows: input.skippedRows,
      detected_courier: input.detectedCourier,
      invalid_rows: input.invalidRows,
    })
    .select()
    .single()

  if (error) throw new Error(`운송장 임포트 생성 실패: ${error.message}`)
  return toTrackingImport(data as TrackingImportRow)
}

export async function getTrackingImports(
  workSessionId: string
): Promise<TrackingImport[]> {
  const { data, error } = await supabase
    .from('tracking_imports')
    .select('*')
    .eq('work_session_id', workSessionId)
    .order('uploaded_at')

  if (error) throw new Error(`운송장 임포트 조회 실패: ${error.message}`)
  return (data as TrackingImportRow[]).map(toTrackingImport)
}

export async function deleteTrackingImport(importId: string): Promise<void> {
  const { error } = await supabase
    .from('tracking_imports')
    .delete()
    .eq('id', importId)

  if (error) throw new Error(`운송장 임포트 삭제 실패: ${error.message}`)
}

export async function saveTrackings(
  workSessionId: string,
  trackingImportId: string,
  trackings: Array<{
    allocationId: string | null
    status: TrackingStatus
    invalidReason: string | null
    trackingCompany: string | null
    trackingNumber: string | null
    sourceSupplierId: string
    rawOrderKey: string | null
    raw: Record<string, unknown>
    rawRowNumber: number
  }>
): Promise<void> {
  if (trackings.length === 0) return

  const rows = trackings.map((t) => ({
    work_session_id: workSessionId,
    tracking_import_id: trackingImportId,
    allocation_id: t.allocationId,
    status: t.status,
    invalid_reason: t.invalidReason,
    tracking_company: t.trackingCompany,
    tracking_number: t.trackingNumber,
    source_supplier_id: t.sourceSupplierId,
    raw_order_key: t.rawOrderKey,
    raw: t.raw,
    raw_row_number: t.rawRowNumber,
    matched_at: t.status === 'matched' ? new Date().toISOString() : null,
  }))

  const { error } = await supabase.from('trackings').insert(rows)
  if (error) throw new Error(`운송장 저장 실패: ${error.message}`)
}

export async function getTrackings(
  workSessionId: string
): Promise<Tracking[]> {
  const { data, error } = await supabase
    .from('trackings')
    .select('*')
    .eq('work_session_id', workSessionId)
    .order('raw_row_number')

  if (error) throw new Error(`운송장 조회 실패: ${error.message}`)
  return (data as TrackingRow[]).map(toTracking)
}

export async function getTrackingsByImport(
  trackingImportId: string
): Promise<Tracking[]> {
  const { data, error } = await supabase
    .from('trackings')
    .select('*')
    .eq('tracking_import_id', trackingImportId)
    .order('raw_row_number')

  if (error) throw new Error(`운송장 조회 실패: ${error.message}`)
  return (data as TrackingRow[]).map(toTracking)
}

export async function updateTrackingMatch(
  trackingId: string,
  allocationId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('trackings')
    .select('id')
    .eq('allocation_id', allocationId)
    .eq('status', 'matched')
    .maybeSingle()

  if (existing) {
    throw new Error('이 주문에 이미 운송장이 연결되어 있습니다')
  }

  const { error } = await supabase
    .from('trackings')
    .update({
      status: 'matched',
      allocation_id: allocationId,
      matched_at: new Date().toISOString(),
      invalid_reason: null,
    })
    .eq('id', trackingId)

  if (error) throw new Error(`수동 매칭 실패: ${error.message}`)
}

export async function overwriteTrackingMatch(
  trackingId: string,
  allocationId: string
): Promise<void> {
  const { error: demoteErr } = await supabase
    .from('trackings')
    .update({
      status: 'duplicated',
      invalid_reason: '수동 매칭으로 대체됨',
    })
    .eq('allocation_id', allocationId)
    .eq('status', 'matched')

  if (demoteErr) throw new Error(`기존 매칭 해제 실패: ${demoteErr.message}`)

  const { error } = await supabase
    .from('trackings')
    .update({
      status: 'matched',
      allocation_id: allocationId,
      matched_at: new Date().toISOString(),
      invalid_reason: null,
    })
    .eq('id', trackingId)

  if (error) throw new Error(`수동 매칭 실패: ${error.message}`)
}

export async function getTrackingStats(
  workSessionId: string
): Promise<TrackingStats> {
  const { data, error } = await supabase
    .from('trackings')
    .select('status')
    .eq('work_session_id', workSessionId)

  if (error) throw new Error(`매칭 통계 조회 실패: ${error.message}`)

  const stats: TrackingStats = {
    total: 0,
    matched: 0,
    unmatched: 0,
    duplicated: 0,
    invalid: 0,
  }

  for (const row of data ?? []) {
    stats.total++
    const s = row.status as TrackingStatus
    stats[s]++
  }

  return stats
}
