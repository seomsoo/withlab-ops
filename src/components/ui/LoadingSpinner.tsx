import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function LoadingSpinner({
  size = 'md',
  label = '로딩 중',
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'rounded-full border-2 border-primary-100 border-t-primary',
        SIZES[size]
      )}
      style={{ animation: 'spin 0.8s linear infinite' }}
      role="status"
      aria-label={label}
    />
  )
}
