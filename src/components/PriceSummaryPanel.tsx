import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getPriceSummaries,
  getPriceTemplate,
} from '@/lib/supabase/priceSummary'
import { generatePriceSummary } from '@/lib/generators/priceSummaryGenerator'
import { priceFileName } from '@/lib/priceSummary/model'
import { downloadBlob } from '@/utils/download'
import type { PriceSummary } from '@/lib/priceSummary/model'

export function PriceSummaryPanel({ sessionId }: { sessionId: string }) {
  const [lists, setLists] = useState<PriceSummary[]>([])
  const [selected, setSelected] = useState<PriceSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setLists(await getPriceSummaries(sessionId))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '가격정리 조회 실패')
    } finally {
      setLoading(false)
    }
  }, [sessionId])
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const data = await getPriceSummaries(sessionId)
        if (alive) {
          setLists(data)
          setError('')
        }
      } catch (e) {
        if (alive)
          setError(e instanceof Error ? e.message : '가격정리 조회 실패')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [sessionId])
  const download = async (list: PriceSummary, confirmed = false) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const freshLists = await getPriceSummaries(sessionId)
      setLists(freshLists)
      const fresh = freshLists.find((i) => i.id === list.id)
      if (!fresh || !fresh.rows.length) {
        setSelected(null)
        throw new Error(
          '목록이 삭제되었거나 주문이 없습니다. 새로고침해주세요.'
        )
      }
      if (!fresh.name)
        throw new Error(
          '최초 원본 파일명을 확인해야 합니다. 관리자에게 문의해주세요.'
        )
      if (JSON.stringify(fresh) !== JSON.stringify(list)) {
        setSelected(fresh)
        toast.info(
          '주문 또는 배정이 변경되었습니다. 변경된 금액을 확인하고 다시 다운로드해주세요.'
        )
        return
      }
      if (
        !confirmed &&
        (fresh.rows.some((r) => r.issues.length) || fresh.rows.length > 3105)
      ) {
        setSelected(fresh)
        return
      }
      const template = await getPriceTemplate()
      const bytes = await generatePriceSummary(
        await template.arrayBuffer(),
        fresh.rows
      )
      const buffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buffer).set(bytes)
      downloadBlob(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        priceFileName(fresh.name)
      )
      toast.success('가격정리 파일을 생성했습니다')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '가격정리 다운로드 실패')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <section className="mt-8 border-t border-line pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">가격정리</h2>
        <Button
          variant="outline"
          disabled={busy || loading}
          onClick={() => void refresh()}
        >
          새로고침
        </Button>
      </div>
      <p className="mt-2 text-sm text-t-mute">
        발주 완료 전에도 다운로드할 수 있습니다. 배정을 수정한 경우 다시
        다운로드해주세요.
      </p>
      {loading ? (
        <p className="py-4">불러오는 중...</p>
      ) : error ? (
        <p role="alert" className="py-4 text-status-error">
          {error}
        </p>
      ) : lists.length === 0 ? (
        <p className="py-4">업로드한 목록이 없습니다.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {lists.map((list) => {
            const missing = list.rows.filter((r) => r.issues.length).length
            const total = list.rows.reduce(
              (s, r) => s + (typeof r.cells[11] === 'number' ? r.cells[11] : 0),
              0
            )
            return (
              <div key={list.id} className="rounded-xl border border-line p-4">
                <h3 className="font-semibold break-all">{list.label}</h3>
                <p className="text-sm break-all text-t-mute">
                  {list.name || '최초 파일명 확인 필요'}
                </p>
                <p className="mt-2 text-sm">
                  {list.rows.length}건 · 확인된 구매가격 합계{' '}
                  {total.toLocaleString()}원
                </p>
                {missing > 0 && (
                  <p className="text-sm text-status-warning">
                    확인 필요 {missing}건
                  </p>
                )}
                {list.excluded > 0 && (
                  <p className="text-sm text-t-mute">
                    업로드 시 오류·중복으로 제외된 행 {list.excluded}건
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    disabled={busy || !list.rows.length}
                    onClick={() => setSelected(list)}
                  >
                    금액 확인
                  </Button>
                  <Button
                    disabled={busy || !list.rows.length || !list.name}
                    onClick={() => void download(list)}
                  >
                    다운로드
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null)
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-[1200px]">
          <DialogHeader>
            <DialogTitle>가격정리 금액 확인</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <p className="break-all text-sm">
                {selected.name || selected.label}
              </p>
              {selected.rows.some((r) => r.issues.length) && (
                <p role="alert" className="text-sm text-status-warning">
                  확인이 필요한 주문이 있습니다. 계속 다운로드하면 해당 금액은
                  빈칸으로 출력됩니다.
                </p>
              )}
              {selected.rows.length > 3105 && (
                <p role="alert" className="text-sm text-status-warning">
                  양식의 정산 수식 범위를 초과합니다. A~M에는 전체 주문을
                  출력하지만 기존 정산·합계 수식은 확장하지 않습니다.
                </p>
              )}
              <div className="max-h-[55vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {[
                        '주문번호',
                        '상품 / 옵션',
                        '공급처',
                        '수량',
                        '단가',
                        '구매가격',
                        '판매금액',
                        '확인 필요',
                      ].map((h) => (
                        <th
                          key={h}
                          className="sticky top-0 bg-card p-2 text-left whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows.map((r) => (
                      <tr key={r.id} className="border-t border-line">
                        <td className="p-2">{r.cells[3]}</td>
                        <td className="p-2">
                          {r.cells[5]} / {r.cells[6]}
                        </td>
                        <td className="p-2">{r.supplier || '미배정'}</td>
                        <td className="p-2">{r.cells[7]}</td>
                        {[r.unitPrice, r.cells[11], r.cells[12]].map((n, i) => (
                          <td key={i} className="p-2 whitespace-nowrap">
                            {typeof n === 'number' ? n.toLocaleString() : '—'}
                          </td>
                        ))}
                        <td className="p-2 text-status-warning">
                          {r.issues.join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                >
                  돌아가기
                </Button>
                <Button
                  disabled={busy || !selected.name}
                  onClick={() => void download(selected, true)}
                >
                  {busy
                    ? '생성 중...'
                    : selected.rows.some((r) => r.issues.length)
                      ? '빈칸으로 다운로드'
                      : '다운로드'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
