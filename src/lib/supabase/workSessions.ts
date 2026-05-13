import { supabase } from '@/lib/supabase/client'
import { toWorkSession } from '@/lib/schemas'

import type { WorkSession, WorkSessionStatus } from '@/types'
import type { WorkSessionRow } from '@/lib/schemas'

export async function createWorkSession(name: string): Promise<WorkSession> {
  const { data, error } = await supabase
    .from('work_sessions')
    .insert({ name })
    .select()
    .single()
  if (error) throw new Error(`작업건 생성 실패: ${error.message}`)
  return toWorkSession(data as WorkSessionRow)
}

export async function getWorkSessions(): Promise<WorkSession[]> {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`작업건 목록 조회 실패: ${error.message}`)
  return (data as WorkSessionRow[]).map(toWorkSession)
}

export async function getWorkSession(id: string): Promise<WorkSession> {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(`작업건 조회 실패: ${error.message}`)
  return toWorkSession(data as WorkSessionRow)
}

export async function updateWorkSessionStatus(
  id: string,
  status: WorkSessionStatus
): Promise<void> {
  const update: Record<string, unknown> = { status }
  if (status === 'completed') {
    update.completed_at = new Date().toISOString()
  }
  const { error } = await supabase
    .from('work_sessions')
    .update(update)
    .eq('id', id)
  if (error)
    throw new Error(`작업건 상태 변경 실패: ${error.message}`)
}

export async function deleteWorkSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('work_sessions')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`작업건 삭제 실패: ${error.message}`)
}

export async function completeWorkSession(
  sessionId: string
): Promise<void> {
  const session = await getWorkSession(sessionId)

  if (session.status === 'completed') return

  if (session.status !== 'ordered' && session.status !== 'active') {
    throw new Error('진행중 또는 발주완료 상태의 작업건만 완료할 수 있습니다')
  }

  const { count, error: countError } = await supabase
    .from('trackings')
    .select('*', { count: 'exact', head: true })
    .eq('work_session_id', sessionId)
    .eq('status', 'matched')

  if (countError) throw new Error(`매칭 건수 확인 실패: ${countError.message}`)
  if (!count || count === 0) {
    throw new Error('매칭된 운송장이 없습니다. 운송장을 먼저 업로드해 주세요.')
  }

  if (session.status === 'active') {
    const { data: orderIds, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('work_session_id', sessionId)
    if (orderError) throw new Error(`주문 조회 실패: ${orderError.message}`)

    if (orderIds && orderIds.length > 0) {
      const { error: allocError } = await supabase
        .from('allocations')
        .update({ status: 'ordered' })
        .in('order_id', orderIds.map((o) => o.id as string))
        .eq('status', 'pending')
      if (allocError) throw new Error(`배정 상태 변경 실패: ${allocError.message}`)
    }

    const { error: orderedAtError } = await supabase
      .from('work_sessions')
      .update({ ordered_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (orderedAtError) throw new Error(`발주 시점 기록 실패: ${orderedAtError.message}`)
  }

  await updateWorkSessionStatus(sessionId, 'completed')
}
