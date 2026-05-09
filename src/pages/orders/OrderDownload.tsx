import { useState, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { OrderTabs } from '@/components/OrderTabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

import { useWorkSession } from '@/hooks/useWorkSession'
import { useAllocation } from '@/hooks/useAllocation'
import { usePurchaseOrder } from '@/hooks/usePurchaseOrder'
import { useSupplierTemplates } from '@/hooks/useSupplierTemplate'

import { buildPurchaseOrders } from '@/lib/generators/purchaseOrderGenerator'

import type { StandardPurchaseOrder } from '@/types'
import type { OrderCompletionValidation } from '@/hooks/usePurchaseOrder'

export default function OrderDownload() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { session, loading: sessionLoading, refetch: refetchSession } =
    useWorkSession(sessionId)
  const { allocations, loading: allocLoading } = useAllocation(sessionId ?? '')
  const { templates } = useSupplierTemplates()
  const po = usePurchaseOrder(sessionId ?? '')

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [validation, setValidation] = useState<OrderCompletionValidation | null>(null)
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const [completing, setCompleting] = useState(false)

  const isReadonly = session?.status === 'ordered' || session?.status === 'completed'
  const isOrdered = session?.status === 'ordered'

  const purchaseOrders = useMemo((): StandardPurchaseOrder[] => {
    if (allocations.length === 0) return []
    return buildPurchaseOrders(allocations, {
      includeStatuses: ['pending', 'ordered'],
    })
  }, [allocations])

  const templateMap = useMemo(
    () => new Map(templates.map((t) => [t.supplierId, t])),
    [templates]
  )

  const handleDownloadOne = useCallback(
    async (supplierId: string, supplierName: string) => {
      const template = templateMap.get(supplierId)
      if (!template) {
        toast.error(`${supplierName}: 양식이 등록되지 않았습니다`)
        return
      }
      await po.downloadOne(supplierId, supplierName, template)
    },
    [po, templateMap]
  )

  const handleDownloadAll = useCallback(async () => {
    await po.downloadAll()
  }, [po])

  const handleCompleteClick = useCallback(async () => {
    try {
      const result = await po.getValidationResult()
      setValidation(result)
      setManualConfirmed(false)
      setCompleteDialogOpen(true)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '검증 실패'
      )
    }
  }, [po])

  const handleCompleteConfirm = useCallback(async () => {
    try {
      setCompleting(true)
      await po.completeOrder()
      setCompleteDialogOpen(false)
      refetchSession()
    } catch {
      // toast handled in hook
    } finally {
      setCompleting(false)
    }
  }, [po, refetchSession])

  if (sessionLoading || allocLoading) {
    return <LoadingSpinner />
  }

  if (!session || !sessionId) {
    return (
      <div className="py-20 text-center text-t-mute">
        작업건을 찾을 수 없습니다
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <div className="mb-5 flex items-center gap-2">
        <Link
          to="/orders"
          className="text-sm text-t-mute hover:text-t-secondary"
        >
          ← 작업건 변경
        </Link>
        <span className="text-t-faint">·</span>
        <span className="text-[15px] font-bold text-t-strong">
          {session.name}
        </span>
      </div>

      <OrderTabs
        sessionId={sessionId}
        activeTab="download"
        completedTabs={['upload', 'assign']}
      />

      {isOrdered && (
        <div className="mt-4 flex items-center gap-2 rounded-radius-md border border-status-success/20 bg-green-50 px-4 py-3 text-sm font-medium text-status-success">
          <CheckCircle2 size={16} />
          발주가 완료되었습니다. 발주서를 재다운로드할 수 있습니다.
        </div>
      )}

      {purchaseOrders.length === 0 ? (
        <div className="mt-10 py-20 text-center text-t-mute">
          배정된 주문이 없습니다
        </div>
      ) : (
        <>
          {/* Download All */}
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-t-strong">
              공급처별 발주서
            </h2>
            <Button onClick={handleDownloadAll}>
              <Download size={16} className="mr-1" />
              전체 다운로드
            </Button>
          </div>

          {/* Supplier Cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {purchaseOrders.map((order) => {
              const hasTemplate = templateMap.has(order.supplierId)
              const missingMappingCount = order.items.filter(
                (i) => !i.nameMappingApplied
              ).length

              return (
                <div
                  key={order.supplierId}
                  className="rounded-radius-md border border-line bg-white p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet
                          size={18}
                          className="text-primary"
                        />
                        <span className="font-semibold text-t-strong">
                          {order.supplierName}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-t-mute">
                        <span>{order.items.length}건</span>
                        {missingMappingCount > 0 && (
                          <span className="flex items-center gap-1 text-status-warning">
                            <AlertCircle size={12} />
                            매핑 누락 {missingMappingCount}건
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasTemplate}
                      onClick={() =>
                        handleDownloadOne(order.supplierId, order.supplierName)
                      }
                    >
                      <Download size={14} className="mr-1" />
                      다운로드
                    </Button>
                  </div>
                  {!hasTemplate && (
                    <div className="mt-2 rounded-md bg-yellow-50 px-3 py-1.5 text-xs text-status-warning">
                      양식이 등록되지 않았습니다.{' '}
                      <Link
                        to="/settings/supplier-template"
                        className="underline"
                      >
                        양식 관리
                      </Link>
                      에서 등록하세요.
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Complete Button */}
          {!isReadonly && (
            <div className="mt-6 flex justify-end border-t border-line pt-4">
              <Button onClick={handleCompleteClick}>
                발주 완료 처리
              </Button>
            </div>
          )}
        </>
      )}

      {/* Complete Dialog */}
      {completeDialogOpen && validation && (
        <Dialog open onOpenChange={() => setCompleteDialogOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>발주 완료 처리</DialogTitle>
            </DialogHeader>

            {validation.unallocatedCount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-status-error">
                  <AlertCircle size={16} />
                  미배정 주문이 {validation.unallocatedCount}건 있어 완료할 수
                  없습니다.
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCompleteDialogOpen(false)}
                  >
                    닫기
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-t-secondary">
                  발주를 완료 처리하면 이 작업건의 배정을 더 이상 수정할 수
                  없습니다.
                </p>
                {validation.missingTemplateSuppliers.length > 0 && (
                  <div className="rounded-md bg-yellow-50 p-3">
                    <p className="text-xs font-medium text-status-warning">
                      양식 미등록 공급처:
                    </p>
                    <ul className="mt-1 list-disc pl-4 text-xs text-t-secondary">
                      {validation.missingTemplateSuppliers.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox
                        checked={manualConfirmed}
                        onCheckedChange={(v) =>
                          setManualConfirmed(v === true)
                        }
                      />
                      수동 발주 완료했습니다
                    </label>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCompleteDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button
                    disabled={
                      completing ||
                      (validation.missingTemplateSuppliers.length > 0 &&
                        !manualConfirmed)
                    }
                    onClick={handleCompleteConfirm}
                  >
                    {completing ? '처리중...' : '발주 완료'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
