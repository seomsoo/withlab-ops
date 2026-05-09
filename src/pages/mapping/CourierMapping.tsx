import { Package } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function CourierMapping() {
  return (
    <>
      <PageHeader title="택배사 매핑" />
      <EmptyState
        icon={<Package size={32} />}
        title="택배사 매핑"
        description="Phase 2에서 구현됩니다"
      />
    </>
  )
}
