import { cn } from '@/lib/utils'

type PlatformBadgeProps = {
  platform: 'coupang' | 'toss' | 'common'
}

const PLATFORM_CONFIG = {
  common: {
    label: '공통',
    className: 'bg-platform-common-bg text-platform-common-text',
  },
  coupang: {
    label: '쿠팡',
    className: 'bg-platform-coupang-bg text-platform-coupang-text',
  },
  toss: {
    label: '토스',
    className: 'bg-platform-toss-bg text-platform-toss-text',
  },
} as const

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[6px] px-2 py-[3px] text-[11px] font-semibold leading-snug',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
