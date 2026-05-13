import type { WorkSessionStatus } from '@/types'

type DashboardSessionLike = {
  id: string
  status: WorkSessionStatus
  orderCount: number
  allocationCount: number
  trackingCount: number
  matchedTrackingCount: number
  unmatchedTrackingCount: number
}

export function getDefaultWorkSessionName(now?: Date): string {
  const base = now ?? new Date()
  const kst = new Date(
    base.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  )
  const y = kst.getFullYear()
  const m = String(kst.getMonth() + 1).padStart(2, '0')
  const d = String(kst.getDate()).padStart(2, '0')
  const period = kst.getHours() < 12 ? '오전' : '오후'
  return `${y}-${m}-${d} ${period}`
}

export function getSessionProgress(session: DashboardSessionLike): {
  label: string
  percentage: number
} {
  if (session.status === 'completed') {
    return { label: '운송장 처리 완료', percentage: 100 }
  }

  if (session.status === 'ordered') {
    if (session.trackingCount === 0) {
      return { label: '발주 완료 · 운송장 업로드 대기', percentage: 75 }
    }
    if (session.matchedTrackingCount === 0) {
      return { label: '운송장 업로드 완료 · 매칭 확인 필요', percentage: 85 }
    }
    if (session.unmatchedTrackingCount > 0) {
      return { label: '운송장 일부 매칭 · 확인 필요', percentage: 90 }
    }
    return { label: '운송장 매칭 완료 · 완료 처리 대기', percentage: 95 }
  }

  if (session.orderCount === 0) {
    return { label: '주문 업로드 대기', percentage: 0 }
  }
  if (session.allocationCount === 0) {
    return { label: '주문 업로드 완료 · 공급처 배정 대기', percentage: 25 }
  }
  if (session.trackingCount > 0) {
    if (session.unmatchedTrackingCount > 0) {
      return { label: '운송장 일부 매칭 · 확인 필요', percentage: 70 }
    }
    if (session.matchedTrackingCount > 0) {
      return { label: '운송장 매칭 완료 · 완료 처리 대기', percentage: 80 }
    }
    return { label: '운송장 업로드 완료 · 매칭 확인 필요', percentage: 60 }
  }
  return { label: '공급처 배정 완료 · 발주서 다운로드 대기', percentage: 50 }
}

export function getSessionEntryPath(session: DashboardSessionLike): string {
  if (session.status === 'completed') {
    return `/tracking/${session.id}/download`
  }

  if (session.status === 'ordered') {
    if (session.trackingCount > 0 && session.matchedTrackingCount > 0) {
      return `/tracking/${session.id}/download`
    }
    if (session.trackingCount > 0) {
      return `/tracking/${session.id}/match`
    }
    return `/tracking/${session.id}/upload`
  }

  if (session.orderCount === 0) {
    return `/orders/${session.id}/upload`
  }
  if (session.allocationCount === 0) {
    return `/orders/${session.id}/allocation`
  }
  if (session.trackingCount > 0 && session.matchedTrackingCount > 0) {
    return `/tracking/${session.id}/download`
  }
  if (session.trackingCount > 0) {
    return `/tracking/${session.id}/match`
  }
  return `/orders/${session.id}/download`
}
