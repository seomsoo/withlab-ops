import { Replace } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function NameMapping() {
  return (
    <>
      <PageHeader title="상품명 변환" />
      <EmptyState
        icon={<Replace size={32} />}
        title="상품명 변환 매핑"
        description="Phase 2에서 구현됩니다"
      />
    </>
  )
}
