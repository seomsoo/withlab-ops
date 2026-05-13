import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { SupplierTrackingProgress } from '@/lib/supabase/trackings'

type SupplierProgressChipsProps = {
  progress: SupplierTrackingProgress[]
}

export function SupplierProgressChips({ progress }: SupplierProgressChipsProps) {
  if (progress.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {progress.map((sp) => {
        const isComplete =
          sp.matchedCount === sp.totalAllocations && sp.totalAllocations > 0
        const ratio =
          sp.totalAllocations > 0
            ? sp.matchedCount / sp.totalAllocations
            : 0

        return (
          <div
            key={sp.supplierId}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2',
              isComplete ? 'border-green-200 dark:border-green-800' : 'border-line'
            )}
          >
            {isComplete ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                <Check size={10} className="text-white" strokeWidth={3} />
              </span>
            ) : (
              <span className="relative h-4 w-4">
                <svg viewBox="0 0 16 16" className="h-4 w-4 -rotate-90">
                  <circle
                    cx="8" cy="8" r="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-200"
                  />
                  <circle
                    cx="8" cy="8" r="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${ratio * 37.7} 37.7`}
                    strokeLinecap="round"
                    className="text-primary"
                  />
                </svg>
              </span>
            )}
            <span className="text-xs font-medium text-t-strong">
              {sp.supplierName}
            </span>
            <span className="text-xs tabular-nums text-t-mute">
              매칭 {sp.matchedCount}
              <span className="text-t-faint">/{sp.totalAllocations}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
