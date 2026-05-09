import { LayoutDashboard } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default function Dashboard() {
  return (
    <>
      <PageHeader title="대시보드" />
      <EmptyState
        icon={<LayoutDashboard size={32} />}
        title="대시보드"
        description="Phase 6에서 구현됩니다"
      />
    </>
  )
}
