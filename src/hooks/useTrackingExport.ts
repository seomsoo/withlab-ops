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
import { generateTrackingExportExcel } from '@/lib/generators/trackingExportGenerator'
import { downloadBlob, buildTrackingExportFileName } from '@/utils/download'

import type {
  Platform,
  CourierWarning,
  StandardTrackingExport,
  TrackingExportItem,
} from '@/types'

type PlatformExportData = {
  count: number
  unmatchedCount: number
  labels: string[]
  countByLabel: Record<string, number>
}

export function useTrackingExport(workSessionId: string) {
  const [exportData, setExportData] = useState<{
    coupang: PlatformExportData
    toss: PlatformExportData
  }>({
    coupang: { count: 0, unmatchedCount: 0, labels: [], countByLabel: {} },
    toss: { count: 0, unmatchedCount: 0, labels: [], countByLabel: {} },
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
                t.sourceSupplierId,
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
            unmatchedCount: totalUnmatched,
            labels: Object.keys(coupangLabelCounts),
            countByLabel: coupangLabelCounts,
          },
          toss: {
            count: tossCount,
            unmatchedCount: totalUnmatched,
            labels: Object.keys(tossLabelCounts),
            countByLabel: tossLabelCounts,
          },
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

        const allocMap = new Map(allocsWithOrders.map((a) => [a.id, a]))

        const items: TrackingExportItem[] = []
        const newWarnings: CourierWarning[] = []

        for (const t of trackings) {
          if (t.status !== 'matched' || !t.allocationId || !t.trackingNumber) continue

          const alloc = allocMap.get(t.allocationId)
          if (!alloc) continue
          if (alloc.order.platform !== platform) continue
          if (filterLabel && alloc.order.orderImportLabel !== filterLabel) continue

          const converted = convertCourierName(
            t.trackingCompany,
            t.sourceSupplierId,
            platform,
            mappings
          )

          if (!converted.isMapped) {
            newWarnings.push({
              trackingId: t.id,
              platform,
              supplierId: t.sourceSupplierId,
              supplierName: alloc.supplierName,
              originalCourier: t.trackingCompany,
              trackingNumber: t.trackingNumber,
            })
          }

          items.push({
            trackingId: t.id,
            allocationId: t.allocationId,
            orderId: alloc.id,
            orderNo: alloc.order.orderNo,
            orderItemNo: alloc.order.orderItemNo,
            matchingKey: alloc.order.matchingKey,
            trackingCompany: converted.name,
            trackingNumber: t.trackingNumber,
            courierMapped: converted.isMapped,
            originalRow: t.raw,
            originalRowValues: alloc.order.rawValues,
            originalRowNumber: alloc.order.rawRowNumber,
            orderImportLabel: alloc.order.orderImportLabel,
          })
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

  return {
    exportData,
    isLoading,
    courierWarnings,
    downloadPlatformFile,
  }
}
