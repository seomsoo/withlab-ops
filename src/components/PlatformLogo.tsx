import { cn } from '@/lib/utils'

import type { Platform } from '@/types'

type PlatformLogoProps = {
  platform: Platform
  size?: number
  className?: string
}

export function PlatformLogo({ platform, size = 40, className }: PlatformLogoProps) {
  const src = `/images/${platform}-logo.png`

  return (
    <div
      className={cn('grid place-items-center overflow-hidden rounded-radius-md', className)}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={platform === 'coupang' ? '쿠팡' : '토스'}
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </div>
  )
}
