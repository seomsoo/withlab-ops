import { FileText } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function Orders() {
  return (
    <>
      <PageHeader title="발주서" />
      <EmptyState
        icon={<FileText size={32} />}
        title="발주서"
        description="Phase 3에서 구현됩니다"
      />
    </>
  )
}
