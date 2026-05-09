import { Building2 } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function SupplierManage() {
  return (
    <>
      <PageHeader title="공급처 관리" />
      <EmptyState
        icon={<Building2 size={32} />}
        title="공급처 관리"
        description="Phase 2에서 구현됩니다"
      />
    </>
  )
}
