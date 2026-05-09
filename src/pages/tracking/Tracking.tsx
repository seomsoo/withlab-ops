import { Truck } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function Tracking() {
  return (
    <>
      <PageHeader title="운송장" />
      <EmptyState
        icon={<Truck size={32} />}
        title="운송장"
        description="Phase 5에서 구현됩니다"
      />
    </>
  )
}
