import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import { getTrackings } from '@/lib/supabase/trackings'
import { getAllocations } from '@/lib/supabase/allocations'
import { getCourierMappings } from '@/lib/supabase/courierMappings'
import {
  getPlatformTemplate,
  downloadPlatformTemplateFile,
} from '@/lib/supabase/platformTemplates'
import { convertCourierName } from '@/lib/matching/courierConverter'
import { getPriceSummaries } from '@/lib/supabase/priceSummary'
import {
  buildExportItems,
  buildPastePreview,
  sortByPriceSummaryOrder,
} from '@/lib/tracking/priceSummaryTracking'
import { generateTrackingExportExcel } from '@/lib/generators/trackingExportGenerator'
import { downloadBlob, buildTrackingExportFileName } from '@/utils/download'

import type { PricePastePreview } from '@/lib/tracking/priceSummaryTracking'
import type {
  Platform,
  CourierWarning,
  StandardTrackingExport,
} from '@/types'

const PLATFORMS: Platform[] = ['coupang', 'toss']

type PlatformExportData = {
  count: number
  labels: string[]
  countByLabel: Record<string, number>
}

export function useTrackingExport(workSessionId: string) {
  const [exportData, setExportData] = useState<{
    coupang: PlatformExportData
    toss: PlatformExportData
    unmatchedCount: number
  }>({
    coupang: { count: 0, labels: [], countByLabel: {} },
    toss: { count: 0, labels: [], countByLabel: {} },
    unmatchedCount: 0,
  })
  const [courierWarnings, setCourierWarnings] = useState<CourierWarning[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [trackings, allocsWithOrders, mappings] = await Promise.all([
          getTrackings(workSessionId),
          getAllocations(workSessionId),
          getCourierMappings(),
        ])
        if (!alive) return

        const allocMap = new Map(allocsWithOrders.map((a) => [a.id, a]))

        let coupangCount = 0
        let tossCount = 0
        let totalUnmatched = 0
        const warnings: CourierWarning[] = []
        const coupangLabelCounts: Record<string, number> = {}
        const tossLabelCounts: Record<string, number> = {}

        for (const t of trackings) {
          if (t.status === 'matched' && t.allocationId) {
            const alloc = allocMap.get(t.allocationId)
            if (!alloc) continue
            const platform = alloc.order.platform
            const label = alloc.order.orderImportLabel ?? ''
            if (platform === 'coupang') {
              coupangCount++
              coupangLabelCounts[label] = (coupangLabelCounts[label] ?? 0) + 1
            } else {
              tossCount++
              tossLabelCounts[label] = (tossLabelCounts[label] ?? 0) + 1
            }

            if (t.trackingCompany) {
              const converted = convertCourierName(
                t.trackingCompany,
                platform,
                mappings
              )
              if (!converted.isMapped) {
                warnings.push({
                  trackingId: t.id,
                  platform,
                  supplierId: t.sourceSupplierId,
                  supplierName: alloc.supplierName,
                  originalCourier: t.trackingCompany,
                  trackingNumber: t.trackingNumber,
                })
              }
            }
          } else if (t.status === 'unmatched') {
            totalUnmatched++
          }
        }

        setExportData({
          coupang: {
            count: coupangCount,
            labels: Object.keys(coupangLabelCounts),
            countByLabel: coupangLabelCounts,
          },
          toss: {
            count: tossCount,
            labels: Object.keys(tossLabelCounts),
            countByLabel: tossLabelCounts,
          },
          unmatchedCount: totalUnmatched,
        })
        setCourierWarnings(warnings)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '오류가 발생했습니다')
      } finally {
        if (alive) setIsLoading(false)
      }
    })()
    return () => { alive = false }
  }, [workSessionId])

  const downloadPlatformFile = useCallback(
    async (platform: Platform, filterLabel?: string) => {
      try {
        const template = await getPlatformTemplate(platform)
        if (!template) {
          throw new Error('운송장 양식을 먼저 등록해 주세요')
        }

        const [trackings, allocsWithOrders, mappings] = await Promise.all([
          getTrackings(workSessionId),
          getAllocations(workSessionId),
          getCourierMappings(),
        ])

        const { items: selectedItems, warnings: newWarnings } = buildExportItems(
          trackings,
          allocsWithOrders,
          mappings,
          platform,
          filterLabel
        )

        // 업로드에 꼭 필요한 파일이므로 가격정리 조회 실패로 다운로드를 막지 않는다.
        let items = selectedItems
        try {
          const summaries = await getPriceSummaries(workSessionId)
          items = sortByPriceSummaryOrder(selectedItems, summaries)
        } catch (err) {
          console.error('가격정리 순서 조회 실패:', err)
          toast.warning('가격정리 순서를 불러오지 못해 기존 순서로 다운로드합니다')
        }

        if (items.length === 0) {
          throw new Error('출력할 매칭된 운송장이 없습니다')
        }

        const exportPayload: StandardTrackingExport = {
          id: crypto.randomUUID(),
          platform,
          createdAt: new Date().toISOString(),
          items,
        }

        const templateBlob = await downloadPlatformTemplateFile(template.templatePath)
        const resultBlob = await generateTrackingExportExcel(
          exportPayload,
          template,
          templateBlob
        )

        const suffix = filterLabel ? `_${filterLabel}` : ''
        const fileName = buildTrackingExportFileName(platform).replace(
          '.xlsx',
          `${suffix}.xlsx`
        )
        downloadBlob(resultBlob, fileName)

        setCourierWarnings(newWarnings)

        const platformLabel = platform === 'coupang' ? '쿠팡' : '토스'
        toast.success(`${platformLabel} 운송장 파일을 다운로드했습니다`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '다운로드 실패')
        throw err
      }
    },
    [workSessionId]
  )

  const loadPastePreviews = useCallback(async (): Promise<PricePastePreview[]> => {
    const [trackings, allocsWithOrders, mappings, summaries] = await Promise.all([
      getTrackings(workSessionId),
      getAllocations(workSessionId),
      getCourierMappings(),
      getPriceSummaries(workSessionId),
    ])
    const items = PLATFORMS.flatMap(
      (platform) =>
        buildExportItems(trackings, allocsWithOrders, mappings, platform).items
    )
    return summaries.map((summary) => buildPastePreview(summary, items))
  }, [workSessionId])

  return {
    exportData,
    isLoading,
    courierWarnings,
    downloadPlatformFile,
    loadPastePreviews,
  }
}
