import { Skeleton } from '@/components/ui/skeleton'

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-radius-md border border-line bg-card overflow-hidden">
      <div className="flex gap-4 border-b border-line bg-gray-50 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-24" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-3 w-20" />
          ))}
        </div>
      ))}
    </div>
  )
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
}

export function CardGridSkeleton({ count = 4, cols = 4 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid gap-3 ${GRID_COLS[cols] ?? 'grid-cols-4'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-radius-md border border-line bg-card p-4">
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="mt-1 h-2 w-20" />
        </div>
      ))}
    </div>
  )
}

function TabsSkeleton() {
  return (
    <div className="flex gap-1 rounded-radius-md border border-line bg-card p-1.5 shadow-level-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-1 items-center gap-2.5 rounded-[8px] px-3.5 py-2.5">
          <Skeleton className="h-[22px] w-[22px] rounded-full" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-20" />
      <span className="text-t-faint">·</span>
      <Skeleton className="h-5 w-28" />
    </div>
  )
}

function GroupRowSkeleton() {
  return (
    <div className="rounded-radius-md border border-line bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="h-4 w-4" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-8 w-[220px] rounded-md" />
      </div>
    </div>
  )
}

export function AllocationSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="mb-5">
        <HeaderSkeleton />
      </div>

      <TabsSkeleton />

      <div className="mt-4 flex items-center justify-between rounded-radius-md border border-line bg-bg-subtle px-4 py-2.5">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>

      <div className="mt-4 text-xs text-t-mute">
        <Skeleton className="h-3 w-28" />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-radius-md border border-line bg-card px-4 py-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-2 h-6 w-8" />
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <GroupRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function ItemReviewSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-5 px-6 py-6">
      <div className="flex items-baseline justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-28 rounded-radius-md" />
      </div>

      <TabsSkeleton />

      <div className="rounded-radius-lg border border-line bg-card p-5 shadow-level-1">
        <div className="mb-5 flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-radius-md bg-bg-subtle px-4 py-3">
              <Skeleton className="h-8 w-10" />
              <Skeleton className="mt-1 h-3 w-8" />
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-radius-md border border-line">
          <div className="flex items-center gap-4 border-b border-line bg-bg-subtle px-4 py-2.5">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10 ml-auto" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-14" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-12 ml-auto" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-8 w-[180px] rounded-md" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  )
}

export function OrderUploadSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-24" />
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-20" />
        <span className="text-t-faint">·</span>
        <Skeleton className="h-5 w-28" />
      </div>
      <TabsSkeleton />
      <div className="grid grid-cols-2 gap-4 mt-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-radius-lg border-2 border-dashed border-line bg-card p-8">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function OrderDownloadSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="mb-5">
        <HeaderSkeleton />
      </div>

      <TabsSkeleton />

      <div className="mt-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-radius-md border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TrackingTabsSkeleton() {
  return (
    <div className="flex gap-1 rounded-radius-md border border-line bg-card p-1.5 shadow-level-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-1 items-center gap-2.5 rounded-[8px] px-3.5 py-2.5">
          <Skeleton className="h-[22px] w-[22px] rounded-full" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ))}
    </div>
  )
}

export function TrackingMatchSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>

      <TrackingTabsSkeleton />

      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-radius-md border border-line bg-card px-4 py-3">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-2 h-6 w-10" />
            <Skeleton className="mt-1 h-2.5 w-20" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      <TableSkeleton rows={6} cols={6} />
    </div>
  )
}

export function PageSkeleton() {
  return <AllocationSkeleton />
}
