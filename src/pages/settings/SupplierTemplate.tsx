import { FileSpreadsheet } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function SupplierTemplate() {
  return (
    <>
      <PageHeader title="발주서 양식 관리" />
      <EmptyState
        icon={<FileSpreadsheet size={32} />}
        title="발주서 양식 관리"
        description="Phase 4에서 구현됩니다"
      />
    </>
  )
}
