import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import { readExcelFile } from '@/utils/excel'
import { validateExcelFile } from '@/utils/file'
import { detectPlatform } from '@/lib/parsers/platformDetector'
import { parseCoupangOrders } from '@/lib/parsers/coupangParser'
import { parseTossOrders } from '@/lib/parsers/tossParser'
import {
  createOrderImport,
  saveOrders,
  getOrders,
  getOrderImports,
  deleteOrderImport,
} from '@/lib/supabase/orders'

import type { StandardOrder, OrderImport, ParseResult, Platform } from '@/types'

export type UploadPlan = {
  file: File
  platform: Platform
  existingImport: OrderImport | null
  parseResult: ParseResult
}

export function useOrderUpload(workSessionId: string) {
  const [coupangImport, setCoupangImport] = useState<OrderImport | null>(null)
  const [tossImport, setTossImport] = useState<OrderImport | null>(null)
  const [orders, setOrders] = useState<StandardOrder[]>([])
  const [loading, setLoading] = useState(true)

  const [coupangParseResult, setCoupangParseResult] =
    useState<ParseResult | null>(null)
  const [tossParseResult, setTossParseResult] =
    useState<ParseResult | null>(null)

  useEffect(() => {
    let alive = true
    setCoupangImport(null)
    setTossImport(null)
    setCoupangParseResult(null)
    setTossParseResult(null)
    setOrders([])
    void (async () => {
      try {
        setLoading(true)
        const [imports, orderData] = await Promise.all([
          getOrderImports(workSessionId),
          getOrders(workSessionId),
        ])
        if (!alive) return

        for (const imp of imports) {
          if (imp.platform === 'coupang') {
            setCoupangImport(imp)
            setCoupangParseResult({
              orders: orderData.filter((o) => o.platform === 'coupang'),
              invalidRows: imp.invalidRows,
              duplicateRows: imp.duplicateRows,
              meta: {
                platform: 'coupang',
                totalRows: imp.totalRows,
                skippedRows: 0,
                validRows: imp.validCount,
                invalidRows: imp.invalidCount,
                duplicateRows: imp.duplicateCount,
              },
            })
          } else {
            setTossImport(imp)
            setTossParseResult({
              orders: orderData.filter((o) => o.platform === 'toss'),
              invalidRows: imp.invalidRows,
              duplicateRows: imp.duplicateRows,
              meta: {
                platform: 'toss',
                totalRows: imp.totalRows,
                skippedRows: 0,
                validRows: imp.validCount,
                invalidRows: imp.invalidCount,
                duplicateRows: imp.duplicateCount,
              },
            })
          }
        }
        setOrders(orderData)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [workSessionId])

  const prepareUpload = useCallback(
    async (file: File, expectedPlatform: Platform): Promise<UploadPlan> => {
      validateExcelFile(file)
      const workbook = await readExcelFile(file)
      const detected = detectPlatform(workbook)

      if (detected === null) {
        throw new Error('지원하지 않는 파일 형식입니다')
      }
      if (detected !== expectedPlatform) {
        const label = expectedPlatform === 'coupang' ? '쿠팡' : '토스'
        throw new Error(
          `${label} 주문 카드에는 ${label} 주문 엑셀만 업로드할 수 있습니다`
        )
      }

      const parseResult =
        detected === 'coupang'
          ? parseCoupangOrders(workbook)
          : parseTossOrders(workbook)

      if (detected === 'coupang') {
        setCoupangParseResult(parseResult)
      } else {
        setTossParseResult(parseResult)
      }

      if (parseResult.orders.length === 0) {
        throw new Error('저장 가능한 정상 주문이 없습니다')
      }

      const existingImport =
        expectedPlatform === 'coupang' ? coupangImport : tossImport

      return { file, platform: detected, existingImport, parseResult }
    },
    [coupangImport, tossImport]
  )

  const commitUpload = useCallback(
    async (
      plan: UploadPlan,
      options?: { replaceExisting?: boolean }
    ): Promise<void> => {
      try {
        if (options?.replaceExisting && plan.existingImport) {
          await deleteOrderImport(plan.existingImport.id)
        }

        const imp = await createOrderImport({
          workSessionId,
          platform: plan.platform,
          fileName: plan.file.name,
          totalRows: plan.parseResult.meta.totalRows,
          validCount: plan.parseResult.meta.validRows,
          invalidCount: plan.parseResult.meta.invalidRows,
          duplicateCount: plan.parseResult.meta.duplicateRows,
          invalidRows: plan.parseResult.invalidRows,
          duplicateRows: plan.parseResult.duplicateRows,
        })

        try {
          await saveOrders(workSessionId, imp.id, plan.parseResult.orders)
        } catch (saveErr) {
          await deleteOrderImport(imp.id)
          throw saveErr
        }

        if (plan.platform === 'coupang') {
          setCoupangImport(imp)
          setCoupangParseResult(plan.parseResult)
        } else {
          setTossImport(imp)
          setTossParseResult(plan.parseResult)
        }

        const freshOrders = await getOrders(workSessionId)
        setOrders(freshOrders)

        const label = plan.platform === 'coupang' ? '쿠팡' : '토스'
        toast.success(
          `${label} 주문 ${plan.parseResult.meta.validRows}건을 업로드했습니다`
        )
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
        throw err
      }
    },
    [workSessionId]
  )

  const summary = useMemo(() => {
    const cValid = coupangParseResult?.meta.validRows ?? 0
    const tValid = tossParseResult?.meta.validRows ?? 0
    const cInvalid = coupangParseResult?.meta.invalidRows ?? 0
    const tInvalid = tossParseResult?.meta.invalidRows ?? 0
    const cDup = coupangParseResult?.meta.duplicateRows ?? 0
    const tDup = tossParseResult?.meta.duplicateRows ?? 0

    return {
      valid: cValid + tValid,
      invalid: cInvalid + tInvalid,
      duplicate: cDup + tDup,
      total: cValid + tValid + cInvalid + tInvalid + cDup + tDup,
    }
  }, [coupangParseResult, tossParseResult])

  return {
    coupangImport,
    tossImport,
    orders,
    loading,
    parseResult: {
      coupang: coupangParseResult,
      toss: tossParseResult,
    },
    prepareUpload,
    commitUpload,
    summary,
  }
}
