import { useCallback } from 'react'
import { toast } from 'sonner'

import {
  getAllocations,
  completeOrder,
  revertOrder,
  deleteSupplierAllocations,
  getUnallocatedOrders,
} from '@/lib/supabase/allocations'
import {
  getAllSupplierTemplates,
  downloadTemplateFile,
} from '@/lib/supabase/supplierTemplates'
import {
  generatePurchaseOrderExcel,
  buildPurchaseOrders,
} from '@/lib/generators/purchaseOrderGenerator'
import { downloadBlob, buildPurchaseOrderFileName } from '@/utils/download'

import type { SupplierTemplate } from '@/types'

export type DownloadAllResult = {
  success: string[]
  failed: { supplierId: string; supplierName: string; reason: string }[]
}

export type OrderCompletionValidation = {
  canComplete: boolean
  unallocatedCount: number
  missingTemplateSuppliers: string[]
}

export function usePurchaseOrder(workSessionId: string) {
  const downloadOne = useCallback(
    async (supplierId: string, supplierName: string, template: SupplierTemplate) => {
      try {
        const allocsWithOrders = await getAllocations(workSessionId)
        const pos = buildPurchaseOrders(allocsWithOrders, {
          includeStatuses: ['pending', 'ordered'],
        })
        const po = pos.find((p) => p.supplierId === supplierId)
        if (!po || po.items.length === 0) {
          toast.info('해당 공급처의 발주 항목이 없습니다')
          return
        }

        const templateBlobData = await downloadTemplateFile(template.templatePath)
        const excelBlob = await generatePurchaseOrderExcel(
          po,
          template,
          templateBlobData
        )
        const fileName = buildPurchaseOrderFileName(supplierName)
        downloadBlob(excelBlob, fileName)
        toast.success(`${supplierName} 발주서 다운로드 완료`)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '발주서 다운로드 실패'
        )
        throw err
      }
    },
    [workSessionId]
  )

  const downloadAll = useCallback(async (): Promise<DownloadAllResult> => {
    const result: DownloadAllResult = { success: [], failed: [] }

    try {
      const [allocsWithOrders, allTemplates] = await Promise.all([
        getAllocations(workSessionId),
        getAllSupplierTemplates(),
      ])

      const pos = buildPurchaseOrders(allocsWithOrders, {
        includeStatuses: ['pending', 'ordered'],
      })

      const templateMap = new Map(
        allTemplates.map((t) => [t.supplierId, t])
      )

      for (const po of pos) {
        const template = templateMap.get(po.supplierId)
        if (!template) {
          result.failed.push({
            supplierId: po.supplierId,
            supplierName: po.supplierName,
            reason: '양식 미등록',
          })
          continue
        }

        try {
          const templateBlobData = await downloadTemplateFile(template.templatePath)
          const excelBlob = await generatePurchaseOrderExcel(
            po,
            template,
            templateBlobData
          )
          const fileName = buildPurchaseOrderFileName(po.supplierName)
          downloadBlob(excelBlob, fileName)
          result.success.push(po.supplierName)
        } catch (err) {
          result.failed.push({
            supplierId: po.supplierId,
            supplierName: po.supplierName,
            reason: err instanceof Error ? err.message : '생성 실패',
          })
        }
      }

      if (result.failed.length > 0) {
        toast.warning(
          `${result.success.length}건 성공, ${result.failed.length}건 실패`
        )
      } else if (result.success.length > 0) {
        toast.success(`${result.success.length}건 다운로드 완료`)
      } else {
        toast.info('다운로드할 발주서가 없습니다')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '전체 다운로드 실패'
      )
    }

    return result
  }, [workSessionId])

  const getValidationResult =
    useCallback(async (): Promise<OrderCompletionValidation> => {
      const [unallocated, allTemplates, allocsWithOrders] = await Promise.all([
        getUnallocatedOrders(workSessionId),
        getAllSupplierTemplates(),
        getAllocations(workSessionId),
      ])

      const templateSupplierIds = new Set(allTemplates.map((t) => t.supplierId))

      const missingTemplateSuppliers: string[] = []
      for (const alloc of allocsWithOrders) {
        if (
          !templateSupplierIds.has(alloc.supplierId) &&
          !missingTemplateSuppliers.includes(alloc.supplierName)
        ) {
          missingTemplateSuppliers.push(alloc.supplierName)
        }
      }

      return {
        canComplete:
          unallocated.length === 0,
        unallocatedCount: unallocated.length,
        missingTemplateSuppliers,
      }
    }, [workSessionId])

  const handleCompleteOrder = useCallback(async () => {
    try {
      await completeOrder(workSessionId)
      toast.success('발주가 완료되었습니다')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '발주 완료 처리 실패'
      )
      throw err
    }
  }, [workSessionId])

  const handleRevertOrder = useCallback(async () => {
    try {
      await revertOrder(workSessionId)
      toast.success('발주가 되돌려졌습니다')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '발주 되돌리기 실패'
      )
      throw err
    }
  }, [workSessionId])

  const handleDeleteSupplierAllocations = useCallback(
    async (supplierId: string, supplierName: string) => {
      try {
        await deleteSupplierAllocations(workSessionId, supplierId)
        toast.success(`${supplierName} 배정이 삭제되었습니다`)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '배정 삭제 실패'
        )
        throw err
      }
    },
    [workSessionId]
  )

  return {
    downloadOne,
    downloadAll,
    getValidationResult,
    completeOrder: handleCompleteOrder,
    revertOrder: handleRevertOrder,
    deleteSupplierAllocations: handleDeleteSupplierAllocations,
  }
}
