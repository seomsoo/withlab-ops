import { cn } from '@/lib/utils'

const SIZES = {
  sm: 22,
  md: 28,
} as const

type LogoProps = {
  size?: 'sm' | 'md'
  showText?: boolean
  showSub?: boolean
  subText?: string
  showIcon?: boolean
}

export function Logo({
  size = 'sm',
  showText = true,
  showSub = false,
  subText = '과일 발주 관리 시스템',
  showIcon = true,
}: LogoProps) {
  const px = SIZES[size]

  return (
    <div className="flex items-start gap-2">
      {showIcon && (
        <svg
          className="text-primary"
          viewBox="0 0 24 24"
          width={px}
          height={px}
        >
          <path
            d="M3 6c4 0 4 12 8 12s4-12 8-12"
            stroke="currentColor"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="20" cy="5" r="2" fill="currentColor" />
        </svg>
      )}
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-extrabold tracking-tight text-t-strong',
              size === 'md' ? 'text-xl' : 'text-xl'
            )}
          >
            WithLab
          </span>
          {showSub && (
            <span className="text-[12.5px] text-t-mute">{subText}</span>
          )}
        </div>
      )}
    </div>
  )
}
