import { useState, useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import {
  Building2,
  ArrowLeftRight,
  Replace,
  Package,
  BookOpen,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { getMappingStats } from '@/lib/supabase/mappingStats'

import type { MappingStats } from '@/lib/supabase/mappingStats'

type SubNavItem = {
  label: string
  href: string
  icon: React.ElementType
  countKey?: keyof MappingStats
}

const SUB_NAV: SubNavItem[] = [
  { label: '공급처 관리', href: '/mapping/suppliers', icon: Building2, countKey: 'supplierCount' },
  { label: '품목 매핑', href: '/mapping/products', icon: ArrowLeftRight, countKey: 'productMappingCount' },
  { label: '상품명 변환', href: '/mapping/names', icon: Replace, countKey: 'nameMappingCount' },
  { label: '택배사 매핑', href: '/mapping/couriers', icon: Package, countKey: 'courierMappingCount' },
  { label: '과일 사전', href: '/mapping/dictionary', icon: BookOpen, countKey: 'dictionaryCount' },
]

export function MappingLayout() {
  const { pathname } = useLocation()
  const [stats, setStats] = useState<MappingStats | null>(null)

  useEffect(() => {
    void getMappingStats().then(setStats)
  }, [pathname])

  return (
    <div className="flex gap-6">
      <nav className="w-[200px] shrink-0">
        <div className="sticky top-4 space-y-1">
          {stats && (
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              <MiniStat label="공급처" value={stats.supplierCount} />
              <MiniStat label="품목매핑" value={stats.productMappingCount} />
              <MiniStat label="카탈로그" value={stats.catalogCount} />
              <MiniStat label="사전" value={stats.dictionaryCount} />
            </div>
          )}

          {SUB_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            const count = item.countKey && stats ? stats[item.countKey] : null

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-t-secondary hover:bg-bg-subtle hover:text-t-strong'
                )}
              >
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                {count !== null && (
                  <span className={cn(
                    'text-xs tabular-nums',
                    active ? 'text-primary/70' : 'text-t-mute'
                  )}>
                    {count}
                  </span>
                )}
              </Link>
            )
          })}

          {stats && <OnboardingChecklist stats={stats} />}

          <div className="mt-4 rounded-lg border border-line bg-bg-subtle px-3 py-2.5">
            <p className="text-[11px] font-medium text-t-mute">
              매핑이 정확할수록 자동배정 정확도가 올라갑니다
            </p>
          </div>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-card px-2 py-1.5 text-center">
      <div className="text-sm font-bold tabular-nums text-t-strong">{value}</div>
      <div className="text-[10px] text-t-mute">{label}</div>
    </div>
  )
}

const ONBOARDING_STEPS = [
  { label: '공급처 등록', key: 'supplierCount' as const },
  { label: '양식 등록', key: 'templateCount' as const },
  { label: '카탈로그 업로드', key: 'catalogCount' as const },
  { label: '품목 매핑 등록', key: 'productMappingCount' as const },
  { label: '과일 사전 등록', key: 'dictionaryCount' as const },
]

function OnboardingChecklist({ stats }: { stats: MappingStats }) {
  const doneCount = ONBOARDING_STEPS.filter((s) => stats[s.key] > 0).length
  if (doneCount === ONBOARDING_STEPS.length) return null

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-blue-700">
        설정 진행 {doneCount}/{ONBOARDING_STEPS.length}
      </p>
      <div className="mt-1.5 space-y-1">
        {ONBOARDING_STEPS.map((step, i) => {
          const done = stats[step.key] > 0
          return (
            <div key={i} className="flex items-center gap-1.5 text-[11px]">
              <span className={done ? 'text-green-600' : 'text-t-mute'}>
                {done ? '✓' : `${i + 1}`}
              </span>
              <span className={cn(
                done ? 'text-t-secondary line-through' : 'text-blue-700'
              )}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
