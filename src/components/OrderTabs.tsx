import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const TAB_ITEMS = [
  { id: 'upload', label: '주문 업로드', step: '1' },
  { id: 'assign', label: '공급처 배정', step: '2' },
  { id: 'download', label: '발주서 다운로드', step: '3' },
] as const

type TabId = (typeof TAB_ITEMS)[number]['id']

type OrderTabsProps = {
  sessionId: string
  activeTab: TabId
  completedTabs?: TabId[]
}

export function OrderTabs({ sessionId, activeTab, completedTabs = [] }: OrderTabsProps) {
  const navigate = useNavigate()

  const tabPaths: Record<TabId, string> = {
    upload: `/orders/${sessionId}/upload`,
    assign: `/orders/${sessionId}/allocation`,
    download: `/orders/${sessionId}/download`,
  }

  return (
    <div className="flex gap-1 rounded-radius-md border border-line bg-white p-1.5 shadow-level-1">
      {TAB_ITEMS.map((tab) => {
        const active = tab.id === activeTab
        const completed = completedTabs.includes(tab.id)
        const clickable = active || completed

        return (
          <button
            key={tab.id}
            className={cn(
              'flex flex-1 items-center gap-2.5 rounded-[8px] px-3.5 py-2.5 text-sm font-semibold transition-colors',
              active
                ? 'bg-primary-50 text-primary'
                : completed
                  ? 'text-t-secondary hover:bg-bg-subtle cursor-pointer'
                  : 'text-t-mute cursor-not-allowed'
            )}
            disabled={!clickable}
            onClick={() => {
              if (clickable && !active) {
                navigate(tabPaths[tab.id])
              }
            }}
          >
            <span
              className={cn(
                'grid h-[22px] w-[22px] place-items-center rounded-full text-xs font-bold',
                active
                  ? 'bg-primary text-white'
                  : completed
                    ? 'bg-status-success text-white'
                    : 'bg-gray-200 text-t-mute'
              )}
            >
              {completed && !active ? <Check size={14} /> : tab.step}
            </span>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
