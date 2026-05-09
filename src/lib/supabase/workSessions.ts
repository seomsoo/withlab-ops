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
