import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import { readExcelFile } from '@/utils/excel'
import { validateExcelFile } from '@/utils/file'
import { parseTracking } from '@/lib/parsers/trackingParser'
import { runMatching } from '@/lib/matching/matchingEngine'
import { getOrders } from '@/lib/supabase/orders'
import { getAllocations } from '@/lib/supabase/allocations'
import {
  createTrackingImport,
  deleteTrackingImport,
  getTrackingImports,
  getTrackings,
  saveTrackings,
} from '@/lib/supabase/trackings'

import type {
  TrackingImport,
  TrackingParseResult,
  MatchingResult,
} from '@/types'

export type TrackingUploadResult = {
  parseResult: TrackingParseResult
  matchingResult: MatchingResult
}

export function useTrackingUpload(workSessionId: string) {
  const [trackingImports, setTrackingImports] = useState<TrackingImport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const imports = await getTrackingImports(workSessionId)
        if (!alive) return
        setTrackingImports(imports)
      } catch (err) {
        if (!alive) return
        toast.error(err instanceof Error ? err.message : '오류가 발생했습니다')
      } finally {
        if (alive) setIsLoading(false)
      }
    })()
    return () => { alive = false }
  }, [workSessionId])

  const uploadTracking = useCallback(
    async (
      file: File,
      supplierId: string
    ): Promise<TrackingUploadResult> => {
      validateExcelFile(file)
      const workbook = await readExcelFile(file)
      const parseResult = parseTracking(workbook)

      if (parseResult.trackings.length === 0) {
        return {
          parseResult,
          matchingResult: { matched: [], unmatched: [], duplicated: [], invalid: [] },
        }
      }

      const [orders, allocsWithOrders, existingTrackings] = await Promise.all([
        getOrders(workSessionId),
        getAllocations(workSessionId),
        getTrackings(workSessionId),
      ])

      const allocations = allocsWithOrders.map((a) => ({
        id: a.id,
        orderId: a.orderId,
        supplierId: a.supplierId,
        supplierProductName: a.supplierProductName,
        supplierProductCode: a.supplierProductCode,
        allocatedQuantity: a.allocatedQuantity,
        status: a.status,
        isTemporaryOverride: a.isTemporaryOverride,
        nameMappingApplied: a.nameMappingApplied,
        smartAllocationApplied: a.smartAllocationApplied,
        supplierPrice: a.supplierPrice,
        createdAt: a.createdAt,
        orderedAt: a.orderedAt,
      }))

      const matchingResult = runMatching({
        parsedTrackings: parseResult.trackings,
        orders,
        allocations,
        existingTrackings,
        sourceSupplierId: supplierId,
      })

      const imp = await createTrackingImport({
        workSessionId,
        sourceSupplierId: supplierId,
        fileName: file.name,
        totalRows: parseResult.meta.totalRows,
        validCount: parseResult.meta.validCount,
        invalidCount: parseResult.meta.invalidCount,
        skippedRows: parseResult.meta.skippedRows,
        detectedCourier: parseResult.meta.detectedCourier,
        invalidRows: parseResult.invalidRows,
      })

      const allTrackingRows = [
        ...matchingResult.matched.map((t) => ({
          allocationId: t.allocationId,
          status: t.status,
          invalidReason: null,
          trackingCompany: t.trackingCompany,
          trackingNumber: t.trackingNumber,
          sourceSupplierId: supplierId,
          rawOrderKey: t.rawOrderKey,
          raw: t.raw,
          rawRowNumber: t.rawRowNumber,
        })),
        ...matchingResult.unmatched.map((t) => ({
          allocationId: null,
          status: t.status,
          invalidReason: t.invalidReason,
          trackingCompany: t.trackingCompany,
          trackingNumber: t.trackingNumber,
          sourceSupplierId: supplierId,
          rawOrderKey: t.rawOrderKey,
          raw: t.raw,
          rawRowNumber: t.rawRowNumber,
        })),
        ...matchingResult.duplicated.map((t) => ({
          allocationId: t.allocationId,
          status: t.status,
          invalidReason: t.invalidReason,
          trackingCompany: t.trackingCompany,
          trackingNumber: t.trackingNumber,
          sourceSupplierId: supplierId,
          rawOrderKey: t.rawOrderKey,
          raw: t.raw,
          rawRowNumber: t.rawRowNumber,
        })),
        ...matchingResult.invalid.map((t) => ({
          allocationId: null,
          status: t.status,
          invalidReason: t.invalidReason,
          trackingCompany: t.trackingCompany,
          trackingNumber: t.trackingNumber,
          sourceSupplierId: supplierId,
          rawOrderKey: t.rawOrderKey,
          raw: t.raw,
          rawRowNumber: t.rawRowNumber,
        })),
      ]

      try {
        await saveTrackings(workSessionId, imp.id, allTrackingRows)
      } catch (saveErr) {
        await deleteTrackingImport(imp.id)
        throw saveErr
      }

      setTrackingImports((prev) => [...prev, imp])

      return { parseResult, matchingResult }
    },
    [workSessionId]
  )

  const reuploadTracking = useCallback(
    async (
      file: File,
      supplierId: string,
      supplierName: string,
      existingImportId: string
    ): Promise<TrackingUploadResult> => {
      validateExcelFile(file)
      const workbook = await readExcelFile(file)
      const parseResult = parseTracking(workbook)

      if (parseResult.trackings.length === 0) {
        throw new Error('파싱할 데이터가 없습니다')
      }

      const [orders, allocsWithOrders, existingTrackings] = await Promise.all([
        getOrders(workSessionId),
        getAllocations(workSessionId),
        getTrackings(workSessionId),
      ])

      const filteredExisting = existingTrackings.filter(
        (t) => t.sourceSupplierId !== supplierId
      )

      const allocations = allocsWithOrders.map((a) => ({
        id: a.id,
        orderId: a.orderId,
        supplierId: a.supplierId,
        supplierProductName: a.supplierProductName,
        supplierProductCode: a.supplierProductCode,
        allocatedQuantity: a.allocatedQuantity,
        status: a.status,
        isTemporaryOverride: a.isTemporaryOverride,
        nameMappingApplied: a.nameMappingApplied,
        smartAllocationApplied: a.smartAllocationApplied,
        supplierPrice: a.supplierPrice,
        createdAt: a.createdAt,
        orderedAt: a.orderedAt,
      }))

      const matchingResult = runMatching({
        parsedTrackings: parseResult.trackings,
        orders,
        allocations,
        existingTrackings: filteredExisting,
        sourceSupplierId: supplierId,
      })

      await deleteTrackingImport(existingImportId)

      const imp = await createTrackingImport({
        workSessionId,
        sourceSupplierId: supplierId,
        fileName: file.name,
        totalRows: parseResult.meta.totalRows,
        validCount: parseResult.meta.validCount,
        invalidCount: parseResult.meta.invalidCount,
        skippedRows: parseResult.meta.skippedRows,
        detectedCourier: parseResult.meta.detectedCourier,
        invalidRows: parseResult.invalidRows,
      })

      const allTrackingRows = [
        ...matchingResult.matched.map((t) => ({
          allocationId: t.allocationId,
          status: t.status,
          invalidReason: null,
          trackingCompany: t.trackingCompany,
          trackingNumber: t.trackingNumber,
          sourceSupplierId: supplierId,
          rawOrderKey: t.rawOrderKey,
          raw: t.raw,
          rawRowNumber: t.rawRowNumber,
        })),
        ...matchingResult.unmatched.map((t) => ({
          allocationId: null,
          status: t.status,
          invalidReason: t.invalidReason,
          trackingCompany: t.trackingCompany,
          trackingNumber: t.trackingNumber,
          sourceSupplierId: supplierId,
          rawOrderKey: t.rawOrderKey,
          raw: t.raw,
          rawRowNumber: t.rawRowNumber,
        })),
        ...matchingResult.duplicated.map((t) => ({
          allocationId: t.allocationId,
          status: t.status,
          invalidReason: t.invalidReason,
          trackingCompany: t.trackingCompany,
          trackingNumber: t.trackingNumber,
          sourceSupplierId: supplierId,
          rawOrderKey: t.rawOrderKey,
          raw: t.raw,
          rawRowNumber: t.rawRowNumber,
        })),
        ...matchingResult.invalid.map((t) => ({
          allocationId: null,
          status: t.status,
          invalidReason: t.invalidReason,
          trackingCompany: t.trackingCompany,
          trackingNumber: t.trackingNumber,
          sourceSupplierId: supplierId,
          rawOrderKey: t.rawOrderKey,
          raw: t.raw,
          rawRowNumber: t.rawRowNumber,
        })),
      ]

      try {
        await saveTrackings(workSessionId, imp.id, allTrackingRows)
      } catch (saveErr) {
        await deleteTrackingImport(imp.id)
        throw saveErr
      }

      setTrackingImports((prev) =>
        prev.filter((i) => i.id !== existingImportId).concat(imp)
      )

      toast.success(`${supplierName} 운송장을 다시 업로드했습니다`)

      return { parseResult, matchingResult }
    },
    [workSessionId]
  )

  return {
    trackingImports,
    isLoading,
    uploadTracking,
    reuploadTracking,
  }
}
