import { useState, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Undo2,
  Trash2,
} from 'lucide-react'

import { CardGridSkeleton } from '@/components/ui/PageSkeleton'
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
  const { allocations, loading: allocLoading, refetch: refetchAllocations } = useAllocation(sessionId ?? '')
  const { templates } = useSupplierTemplates()
  const po = usePurchaseOrder(sessionId ?? '')

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [validation, setValidation] = useState<OrderCompletionValidation | null>(null)
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [revertDialogOpen, setRevertDialogOpen] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ supplierId: string; supplierName: string; itemCount: number } | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleRevertConfirm = useCallback(async () => {
    try {
      setReverting(true)
      await po.revertOrder()
      setRevertDialogOpen(false)
      refetchSession()
      await refetchAllocations()
    } catch {
      // toast handled in hook
    } finally {
      setReverting(false)
    }
  }, [po, refetchSession, refetchAllocations])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await po.deleteSupplierAllocations(deleteTarget.supplierId, deleteTarget.supplierName)
      setDeleteTarget(null)
      await refetchAllocations()
    } catch {
      // toast handled in hook
    } finally {
      setDeleting(false)
    }
  }, [po, deleteTarget, refetchAllocations])

  if (sessionLoading || allocLoading) {
    return <CardGridSkeleton count={3} />
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
        completedTabs={isReadonly ? ['upload', 'review', 'assign', 'download'] : ['upload', 'review', 'assign']}
      />

      {isOrdered && (
        <div className="mt-4 flex items-center justify-between rounded-radius-md border border-status-success/20 bg-green-50 dark:bg-green-950/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-status-success">
            <CheckCircle2 size={16} />
            발주가 완료되었습니다. 발주서를 재다운로드할 수 있습니다.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRevertDialogOpen(true)}
          >
            <Undo2 size={14} className="mr-1" />
            발주 되돌리기
          </Button>
        </div>
      )}

      {purchaseOrders.length === 0 ? (
        <div className="mt-10 py-20 text-center text-t-mute">
          배정된 주문이 없습니다
        </div>
      ) : (
        <>
          {/* Cost Summary */}
          <CostSummary purchaseOrders={purchaseOrders} allocations={allocations} />

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
              return (
                <div
                  key={order.supplierId}
                  className="rounded-radius-md border border-line bg-card p-4"
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
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-t-mute">
                        <span>주문 {order.items.length}건</span>
                        <span>
                          수량 {order.items.reduce((s, i) => s + i.quantity, 0)}개
                        </span>
                        {(() => {
                          const cost = allocations
                            .filter((a) => a.supplierId === order.supplierId && a.supplierPrice != null)
                            .reduce((s, a) => s + (a.supplierPrice ?? 0) * a.order.quantity, 0)
                          return cost > 0 ? (
                            <span className="font-mono">
                              ₩{cost.toLocaleString('ko-KR')}
                            </span>
                          ) : null
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
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
                      {!isReadonly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-t-mute hover:text-status-error"
                          onClick={() =>
                            setDeleteTarget({
                              supplierId: order.supplierId,
                              supplierName: order.supplierName,
                              itemCount: order.items.length,
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                  {!hasTemplate && (
                    <div className="mt-2 rounded-md bg-yellow-50 px-3 py-1.5 text-xs text-status-warning">
                      양식이 등록되지 않았습니다.{' '}
                      <Link
                        to={`/mapping/suppliers/${order.supplierId}`}
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
      {/* Revert Dialog */}
      {revertDialogOpen && (
        <Dialog open onOpenChange={() => setRevertDialogOpen(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>발주 되돌리기</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-t-secondary">
              발주 완료 상태를 되돌리면 배정을 다시 수정할 수 있습니다.
              기존 배정 데이터는 유지됩니다.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRevertDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                disabled={reverting}
                onClick={handleRevertConfirm}
              >
                {reverting ? '처리중...' : '되돌리기'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Supplier Allocations Dialog */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>배정 삭제</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-t-secondary">
              <span className="font-semibold text-t-strong">
                {deleteTarget.supplierName}
              </span>
              에 배정된{' '}
              <span className="font-semibold text-t-strong">
                {deleteTarget.itemCount}건
              </span>
              의 주문이 미분류 상태로 돌아갑니다.
              배정 페이지에서 다시 배정해야 합니다.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={handleDeleteConfirm}
              >
                {deleting ? '삭제중...' : '삭제'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function CostSummary({
  purchaseOrders,
  allocations,
}: {
  purchaseOrders: StandardPurchaseOrder[]
  allocations: import('@/lib/supabase/allocations').AllocationWithOrder[]
}) {
  const { totalCost, unknownCount, totalItems, supplierCount } = useMemo(() => {
    let cost = 0
    let unknown = 0
    let items = 0
    for (const a of allocations) {
      items++
      if (a.supplierPrice != null) {
        cost += a.supplierPrice * a.order.quantity
      } else {
        unknown++
      }
    }
    return {
      totalCost: cost,
      unknownCount: unknown,
      totalItems: items,
      supplierCount: purchaseOrders.length,
    }
  }, [allocations, purchaseOrders])

  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      <div className="rounded-radius-md border border-line bg-card px-4 py-3">
        <div className="text-xs text-t-mute">공급처</div>
        <div className="mt-1 text-xl font-bold text-t-strong">
          {supplierCount}곳
        </div>
      </div>
      <div className="rounded-radius-md border border-line bg-card px-4 py-3">
        <div className="text-xs text-t-mute">총 주문</div>
        <div className="mt-1 text-xl font-bold text-t-strong">
          {totalItems}건
        </div>
      </div>
      <div className="rounded-radius-md border border-line bg-card px-4 py-3">
        <div className="text-xs text-t-mute">예상 발주금액</div>
        <div className="mt-1 text-xl font-bold text-t-strong">
          {totalCost > 0
            ? `₩${totalCost.toLocaleString('ko-KR')}`
            : '—'}
        </div>
        {unknownCount > 0 && (
          <div className="mt-0.5 text-[11px] text-status-warning">
            가격 미확인 {unknownCount}건
          </div>
        )}
      </div>
    </div>
  )
}
