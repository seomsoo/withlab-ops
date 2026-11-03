import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCopy, Eye } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toPasteHtml, toPasteText } from '@/lib/tracking/priceSummaryTracking'
import { cn } from '@/lib/utils'
import { copyTable } from '@/utils/clipboard'

import type { PricePastePreview } from '@/lib/tracking/priceSummaryTracking'

type PriceSummaryTrackingPanelProps = {
  loadPreviews: () => Promise<PricePastePreview[]>
}

export function PriceSummaryTrackingPanel({
  loadPreviews,
}: PriceSummaryTrackingPanelProps) {
  const [previews, setPreviews] = useState<PricePastePreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const next = await loadPreviews()
        if (!alive) return
        setPreviews(next)
        setError(null)
      } catch (err) {
        console.error('가격정리 운송장 조회 실패:', err)
        if (alive) {
          setError(
            err instanceof Error ? err.message : '가격정리 운송장 조회 실패'
          )
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [loadPreviews])

  const openPreview = useCallback(
    async (id: string) => {
      try {
        setPreviews(await loadPreviews())
        setSelectedId(id)
      } catch (err) {
        console.error('가격정리 운송장 조회 실패:', err)
        toast.error(
          err instanceof Error ? err.message : '가격정리 운송장 조회 실패'
        )
      }
    },
    [loadPreviews]
  )

  const copy = useCallback(
    async (id: string) => {
      try {
        setCopyingId(id)
        // 복사 직전 데이터로 다시 만들어 화면을 연 뒤 바뀐 매칭도 반영한다.
        const next = await loadPreviews()
        setPreviews(next)
        const preview = next.find((p) => p.id === id)
        if (!preview) throw new Error('가격정리 목록을 찾을 수 없습니다')
        await copyTable(toPasteText(preview.rows), toPasteHtml(preview.rows))
        toast.success(
          `${preview.rows.length}행을 복사했습니다. 가격정리의 A3 칸을 선택하고 붙여 넣어 주세요`
        )
      } catch (err) {
        console.error('가격정리 운송장 복사 실패:', err)
        toast.error(
          err instanceof Error ? err.message : '가격정리 운송장 복사 실패'
        )
      } finally {
        setCopyingId(null)
      }
    },
    [loadPreviews]
  )

  const selected = previews.find((p) => p.id === selectedId) ?? null
  const listed = previews.filter((p) => p.rows.length > 0)
  const totalEmpty = listed.reduce((sum, p) => sum + p.emptyCount, 0)

  return (
    <section className="rounded-radius-md border border-line bg-card p-5">
      <h2 className="text-[15px] font-bold text-t-strong">
        가격정리에 운송장 붙여넣기
      </h2>
      <p className="mt-1 text-sm text-t-mute">
        가격정리와 같은 순서로 택배사와 운송장번호를 복사합니다. 복사한 뒤
        가격정리의 A3 칸에 붙여 넣어 주세요.
      </p>

      {totalEmpty > 0 && (
        <p role="alert" className="mt-2 text-sm text-status-warning">
          운송장이 없는 주문 {totalEmpty}건은 플랫폼 파일에도 들어가지 않습니다.
          출고 여부를 확인해 주세요.
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-t-mute">불러오는 중...</p>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-status-error">
          {error}
        </p>
      ) : listed.length === 0 ? (
        <p className="mt-4 text-sm text-t-mute">복사할 주문이 없습니다</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {listed.map((preview) => (
            <div
              key={preview.id}
              className="rounded-radius-md border border-line p-4"
            >
              <div className="font-medium text-t-strong">{preview.label}</div>
              <p className="break-all text-xs text-t-mute">{preview.name}</p>
              <p className="mt-2 text-sm text-t-secondary">
                전체 {preview.rows.length}건 · 운송장 {preview.filledCount}건
              </p>
              {preview.emptyCount > 0 && (
                <p className="mt-0.5 text-xs text-status-warning">
                  운송장 없는 {preview.emptyCount}건은 빈 줄로 복사됩니다
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={copyingId !== null || preview.filledCount === 0}
                  onClick={() => void copy(preview.id)}
                >
                  <ClipboardCopy size={14} />
                  {copyingId === preview.id ? '복사 중...' : '복사'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void openPreview(preview.id)}
                >
                  <Eye size={14} />
                  미리보기
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[1100px]">
          <DialogHeader>
            <DialogTitle>가격정리 붙여넣기 미리보기</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <p className="break-all text-sm">
                {selected.name || selected.label}
              </p>
              <p className="text-sm text-t-mute">
                붙여 넣기 전에 첫 주문번호와 마지막 주문번호가 가격정리 파일과
                같은지 확인해 주세요. 파일을 정렬했거나 행을 지웠거나, 파일을
                받은 뒤 주문을 추가했다면 행이 어긋날 수 있습니다. 직접 입력한
                칸도 복사한 값으로 덮어써지고, 운송장 없는 줄은 비워집니다.
              </p>
              <div className="max-h-[56vh] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card text-left text-t-mute">
                    <tr>
                      <th className="py-1.5 pr-3">행</th>
                      <th className="py-1.5 pr-3">주문번호</th>
                      <th className="py-1.5 pr-3">수령자</th>
                      <th className="py-1.5 pr-3">상품/옵션</th>
                      <th className="py-1.5 pr-3">택배사</th>
                      <th className="py-1.5">운송장번호</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows.map((row) => (
                      <tr
                        key={row.orderId}
                        className={cn(
                          'border-t border-line/50',
                          !row.trackingNumber && 'bg-warning-light'
                        )}
                      >
                        <td className="py-1.5 pr-3 font-mono text-t-mute">
                          {row.rowNumber}
                        </td>
                        <td className="py-1.5 pr-3 font-mono">{row.orderNo}</td>
                        <td className="py-1.5 pr-3">{row.recipient}</td>
                        <td className="max-w-[320px] truncate py-1.5 pr-3">
                          {row.productName} {row.optionName}
                        </td>
                        <td className="py-1.5 pr-3">
                          {row.trackingCompany}
                          {!row.courierMapped && (
                            <span className="ml-1 text-status-warning">
                              매핑 필요
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 font-mono">
                          {row.trackingNumber || (
                            <span className="text-status-warning">없음</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  닫기
                </Button>
                <Button
                  disabled={copyingId !== null || selected.filledCount === 0}
                  onClick={() => void copy(selected.id)}
                >
                  <ClipboardCopy size={14} />
                  {copyingId === selected.id ? '복사 중...' : '복사'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
