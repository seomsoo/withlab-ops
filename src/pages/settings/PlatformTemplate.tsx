import { FileUp } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function PlatformTemplate() {
  return (
    <>
      <PageHeader title="운송장 양식 관리" />
      <EmptyState
        icon={<FileUp size={32} />}
        title="운송장 양식 관리"
        description="Phase 5에서 구현됩니다"
      />
    </>
  )
}
