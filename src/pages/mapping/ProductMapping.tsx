import { ArrowLeftRight } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ProductMapping() {
  return (
    <>
      <PageHeader title="품목 매핑" />
      <EmptyState
        icon={<ArrowLeftRight size={32} />}
        title="품목↔공급처 매핑"
        description="Phase 2에서 구현됩니다"
      />
    </>
  )
}
