import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const TAB_ITEMS = [
  { id: 'upload', label: '운송장 업로드', step: '1' },
  { id: 'match', label: '매칭 결과', step: '2' },
  { id: 'download', label: '플랫폼 파일 다운로드', step: '3' },
] as const

type TabId = (typeof TAB_ITEMS)[number]['id']

type TrackingTabsProps = {
  sessionId: string
  currentTab: TabId
  canOpenMatch: boolean
  canOpenDownload: boolean
}

export function TrackingTabs({
  sessionId,
  currentTab,
  canOpenMatch,
  canOpenDownload,
}: TrackingTabsProps) {
  const navigate = useNavigate()

  const tabPaths: Record<TabId, string> = {
    upload: `/tracking/${sessionId}/upload`,
    match: `/tracking/${sessionId}/match`,
    download: `/tracking/${sessionId}/download`,
  }

  const canOpen: Record<TabId, boolean> = {
    upload: true,
    match: canOpenMatch,
    download: canOpenDownload,
  }

  function getCompleted(tabId: TabId): boolean {
    if (tabId === 'upload') return canOpenMatch
    if (tabId === 'match') return canOpenDownload
    return false
  }

  return (
    <div className="flex gap-1 rounded-radius-md border border-line bg-white p-1.5 shadow-level-1">
      {TAB_ITEMS.map((tab) => {
        const active = tab.id === currentTab
        const completed = getCompleted(tab.id)
        const clickable = active || canOpen[tab.id]

        return (
          <button
            key={tab.id}
            className={cn(
              'flex flex-1 items-center gap-2.5 rounded-[8px] px-3.5 py-2.5 text-sm font-semibold transition-colors',
              active
                ? 'bg-primary-50 text-primary'
                : clickable
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
