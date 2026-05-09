import { cn } from '@/lib/utils'

type StatusBadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'muted'

type StatusBadgeProps = {
  variant?: StatusBadgeVariant
  children: React.ReactNode
}

const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  default: 'bg-gray-200 text-t-mid',
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  error: 'bg-error-light text-error-dark',
  info: 'bg-primary-50 text-primary',
  pending: 'bg-primary-100 text-primary-hover',
  muted: 'bg-gray-200 text-t-mute',
}

export function StatusBadge({
  variant = 'default',
  children,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[6px] px-2 py-[3px] text-[11px] font-semibold leading-snug',
        VARIANT_CLASSES[variant]
      )}
    >
      {children}
    </span>
  )
}
