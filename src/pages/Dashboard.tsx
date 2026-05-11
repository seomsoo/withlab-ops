import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Truck,
  ArrowLeftRight,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CreateWorkSessionDialog } from '@/components/work-session/CreateWorkSessionDialog'

import { useDashboard } from '@/hooks/useDashboard'
import { useWorkSessions } from '@/hooks/useWorkSessions'
import {
  getSessionProgress,
  getSessionEntryPath,
} from '@/utils/workSession'

import type { DashboardWorkSession } from '@/lib/supabase/dashboard'

function getKSTDate(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  )
}

function getGreeting(): string {
  const h = getKSTDate().getHours()
  if (h >= 6 && h < 12) return '좋은 아침이에요 👋'
  if (h >= 12 && h < 18) return '좋은 오후예요 👋'
  return '좋은 저녁이에요 👋'
}

function getFormattedDate(): string {
  const now = new Date()
  return now.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

const STATUS_CONFIG = {
  active: {
    label: '진행중',
    className:
      'inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11.5px] font-bold text-primary-hover',
  },
  ordered: {
    label: '발주완료',
    className:
      'inline-flex items-center gap-1.5 rounded-full bg-success-light px-2.5 py-1 text-[11.5px] font-bold text-success-dark',
  },
  completed: {
    label: '완료',
    className:
      'inline-flex items-center gap-1.5 rounded-full bg-gray-200 px-2.5 py-1 text-[11.5px] font-bold text-t-mid',
  },
} as const

function Greet() {
  return (
    <section className="flex items-end justify-between gap-6 pb-1">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-t-strong leading-[1.25]">
          {getGreeting()}
        </h1>
        <p className="mt-2 text-[13px] text-t-mute">
          {getFormattedDate()} &middot; WithLab 과일 발주 시스템
        </p>
      </div>
    </section>
  )
}

function QuickActions({
  onNewOrder,
}: {
  onNewOrder: () => void
}) {
  return (
    <section className="grid grid-cols-2 gap-4">
      <button
        onClick={onNewOrder}
        className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-[18px] bg-gradient-to-br from-primary to-primary-hover p-7 text-left text-white transition-transform hover:-translate-y-0.5 hover:shadow-lg"
        aria-label="새 발주 작업 시작"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/16">
            <ClipboardList size={22} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.08em] text-white/72">
            STEP 01
          </span>
        </div>
        <div className="text-[22px] font-bold tracking-[-0.02em]">
          새 발주 작업 시작
        </div>
        <p className="mt-2 max-w-[340px] text-[13.5px] leading-[1.55] text-white/78">
          쿠팡·토스 주문 엑셀을 올리면 공급처별 발주서가 자동으로 만들어져요.
        </p>
        <div className="mt-auto flex items-center gap-1.5 pt-6 text-[13.5px] font-bold">
          시작하기
          <ChevronRight size={14} />
        </div>
      </button>

      <Link
        to="/tracking"
        className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-[18px] bg-gradient-to-br from-[#1F2937] to-[#0F172A] p-7 text-left text-white transition-transform hover:-translate-y-0.5 hover:shadow-lg dark:from-[#2A3040] dark:to-[#1A2030]"
        aria-label="운송장 매칭 시작"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/16">
            <Truck size={22} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.08em] text-white/72">
            STEP 02
          </span>
        </div>
        <div className="text-[22px] font-bold tracking-[-0.02em]">
          운송장 매칭 시작
        </div>
        <p className="mt-2 max-w-[340px] text-[13.5px] leading-[1.55] text-white/78">
          공급처에서 받은 운송장 파일을 올리면 주문번호와 자동으로 연결돼요.
        </p>
        <div className="mt-auto flex items-center gap-1.5 pt-6 text-[13.5px] font-bold">
          시작하기
          <ChevronRight size={14} />
        </div>
      </Link>
    </section>
  )
}

function JobItem({ session }: { session: DashboardWorkSession }) {
  const progress = getSessionProgress(session)
  const entryPath = getSessionEntryPath(session)
  const config = STATUS_CONFIG[session.status]
  const createdDate = new Date(session.createdAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
  })

  return (
    <Link
      to={entryPath}
      className="grid grid-cols-[2fr_2fr_110px_24px] items-center gap-5 border-t border-line px-5 py-[18px] text-inherit no-underline transition-colors first:border-t-0 hover:bg-gray-50 dark:hover:bg-[var(--color-surface-hover)]"
    >
      <div>
        <div className="text-[14.5px] font-bold tracking-[-0.01em] text-t-strong">
          {session.name}
        </div>
        <div className="mt-1 text-[11.5px] text-t-mute">
          {createdDate} &middot; 공급처 {session.supplierCount} &middot; 주문{' '}
          {session.orderCount}건
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-xs text-t-mid">{progress.label}</div>
        <div className="h-1 overflow-hidden rounded-full bg-gray-300">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>
      <div>
        <span className={config.className}>
          {session.status === 'active' ? (
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-[pulse-opacity_1.6s_ease-in-out_infinite]" />
          ) : (
            <Check size={11} />
          )}
          {config.label}
        </span>
      </div>
      <div className="grid place-items-center">
        <ChevronRight size={16} className="text-t-mute" />
      </div>
    </Link>
  )
}

function RecentJobs({
  sessions,
  onNewOrder,
}: {
  sessions: DashboardWorkSession[]
  onNewOrder: () => void
}) {
  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold tracking-[-0.02em] text-t-strong">
            최근 작업건
          </h2>
          <p className="mt-1 text-[12.5px] text-t-mute">
            진행중·완료된 발주 작업을 한눈에 볼 수 있어요
          </p>
        </div>
        <Link
          to="/orders"
          className="text-[13px] font-medium text-primary hover:underline"
        >
          전체 보기 &rarr;
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-radius-lg border border-line bg-card py-16 shadow-sm">
          <p className="mb-4 text-sm text-t-mute">
            아직 작업건이 없어요. 새 발주 작업을 시작해보세요!
          </p>
          <Button onClick={onNewOrder}>새 발주 작업 시작</Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-radius-lg border border-line bg-card shadow-sm">
          {sessions.map((s) => (
            <JobItem key={s.id} session={s} />
          ))}
        </div>
      )}
    </section>
  )
}

function Shortcuts({
  totalMappingCount,
  totalSupplierCount,
  unmatchedTrackingCount,
}: {
  totalMappingCount: number
  totalSupplierCount: number
  unmatchedTrackingCount: number
}) {
  const items = [
    {
      href: '/mapping/products',
      icon: ArrowLeftRight,
      title: '매핑 관리',
      desc: '품목 ↔ 공급처 연결 관리',
      count: `${totalMappingCount}개`,
      warn:
        unmatchedTrackingCount > 0 ? `미매칭 ${unmatchedTrackingCount}` : null,
    },
    {
      href: '/settings/supplier-template',
      icon: FileSpreadsheet,
      title: '양식 관리',
      desc: '공급처별 발주 양식 관리',
      count: null,
      warn: null,
    },
    {
      href: '/mapping/suppliers',
      icon: Building2,
      title: '공급처 관리',
      desc: '거래처와 연락처 관리',
      count: `${totalSupplierCount}개`,
      warn: null,
    },
  ]

  return (
    <section>
      <h2 className="mb-3.5 text-[17px] font-bold tracking-[-0.02em] text-t-strong">
        바로가기
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-4 rounded-[14px] border border-line bg-card px-5 py-[18px] no-underline transition-all hover:border-primary-100 hover:bg-primary-50"
            >
              <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[10px] bg-gray-200 text-t-strong transition-all group-hover:bg-card group-hover:text-primary">
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-t-strong">
                  {item.title}
                </div>
                <div className="mt-0.5 text-[11.5px] text-t-mute">
                  {item.desc}
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                {item.count && (
                  <span className="font-mono text-xs font-bold text-t-mid">
                    {item.count}
                  </span>
                )}
                {item.warn && (
                  <span className="whitespace-nowrap rounded-full bg-warning-light px-[7px] py-0.5 text-[10.5px] font-bold text-warning-dark">
                    {item.warn}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { recentSessions, stats, loading, error, refetch } = useDashboard()
  const { createSession } = useWorkSessions()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-10 py-9 pb-24">
      <Greet />

      {error && (
        <div className="flex items-center gap-3 rounded-radius-md border border-error-light bg-error-light px-4 py-3">
          <AlertCircle size={16} className="text-error flex-shrink-0" />
          <span className="flex-1 text-sm text-error">{error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw size={14} />
            다시 시도
          </Button>
        </div>
      )}

      <QuickActions onNewOrder={() => setDialogOpen(true)} />

      <RecentJobs
        sessions={recentSessions}
        onNewOrder={() => setDialogOpen(true)}
      />

      <Shortcuts
        totalMappingCount={stats?.totalMappingCount ?? 0}
        totalSupplierCount={stats?.totalSupplierCount ?? 0}
        unmatchedTrackingCount={stats?.unmatchedTrackingCount ?? 0}
      />

      <CreateWorkSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={createSession}
        onCreated={(session) => navigate(`/orders/${session.id}/upload`)}
      />
    </div>
  )
}
