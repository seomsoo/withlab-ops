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

import type { StandardOrder, OrderImport, ParseResult, Platform, DuplicateRow } from '@/types'

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
    void (async () => {
      try {
        setLoading(true)
        const [imports, orderData] = await Promise.all([
          getOrderImports(workSessionId),
          getOrders(workSessionId),
        ])
        if (!alive) return

        setCoupangImport(null)
        setTossImport(null)
        setCoupangParseResult(null)
        setTossParseResult(null)
        setOrders([])

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

  const prepareUploadAutoDetect = useCallback(
    async (file: File): Promise<UploadPlan> => {
      validateExcelFile(file)
      const workbook = await readExcelFile(file)
      const detected = detectPlatform(workbook)

      if (detected === null) {
        throw new Error('플랫폼을 자동 감지할 수 없습니다. 지원하는 파일 형식인지 확인해주세요.')
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
        detected === 'coupang' ? coupangImport : tossImport

      return { file, platform: detected, existingImport, parseResult }
    },
    [coupangImport, tossImport]
  )

  const commitUpload = useCallback(
    async (
      plan: UploadPlan,
      options?: { replaceExisting?: boolean; appendExisting?: boolean }
    ): Promise<void> => {
      try {
        if (plan.existingImport && (options?.replaceExisting || options?.appendExisting)) {
          const existingOrders = options.appendExisting
            ? (await getOrders(workSessionId)).filter((o) => o.platform === plan.platform)
            : []

          await deleteOrderImport(plan.existingImport.id)

          if (options.appendExisting && existingOrders.length > 0) {
            const existingKeys = new Set(existingOrders.map((o) => o.matchingKey))
            const newUnique: StandardOrder[] = []
            const newDuplicates: DuplicateRow[] = [...plan.parseResult.duplicateRows]

            for (const order of plan.parseResult.orders) {
              if (existingKeys.has(order.matchingKey)) {
                newDuplicates.push({
                  rowNumber: order.rawRowNumber,
                  reason: '기존 파일과 중복',
                  matchingKey: order.matchingKey,
                  firstRowNumber: 0,
                  rawData: order.rawValues,
                })
              } else {
                newUnique.push(order)
                existingKeys.add(order.matchingKey)
              }
            }

            const mergedOrders = [...existingOrders, ...newUnique]
            const mergedInvalid = plan.parseResult.invalidRows
            const totalRows =
              (plan.existingImport.totalRows) +
              plan.parseResult.meta.totalRows
            const dupCount = newDuplicates.length

            const imp = await createOrderImport({
              workSessionId,
              platform: plan.platform,
              fileName: `${plan.existingImport.fileName} + ${plan.file.name}`,
              totalRows,
              validCount: mergedOrders.length,
              invalidCount: plan.existingImport.invalidCount + plan.parseResult.meta.invalidRows,
              duplicateCount: dupCount,
              invalidRows: mergedInvalid,
              duplicateRows: newDuplicates,
            })

            try {
              await saveOrders(workSessionId, imp.id, mergedOrders)
            } catch (saveErr) {
              await deleteOrderImport(imp.id)
              throw saveErr
            }

            if (plan.platform === 'coupang') {
              setCoupangImport(imp)
              setCoupangParseResult({
                orders: mergedOrders,
                invalidRows: mergedInvalid,
                duplicateRows: newDuplicates,
                meta: {
                  platform: plan.platform,
                  totalRows,
                  skippedRows: 0,
                  validRows: mergedOrders.length,
                  invalidRows: plan.existingImport.invalidCount + plan.parseResult.meta.invalidRows,
                  duplicateRows: dupCount,
                },
              })
            } else {
              setTossImport(imp)
              setTossParseResult({
                orders: mergedOrders,
                invalidRows: mergedInvalid,
                duplicateRows: newDuplicates,
                meta: {
                  platform: plan.platform,
                  totalRows,
                  skippedRows: 0,
                  validRows: mergedOrders.length,
                  invalidRows: plan.existingImport.invalidCount + plan.parseResult.meta.invalidRows,
                  duplicateRows: dupCount,
                },
              })
            }

            const freshOrders = await getOrders(workSessionId)
            setOrders(freshOrders)

            const label = plan.platform === 'coupang' ? '쿠팡' : '토스'
            toast.success(
              `${label} 주문 ${newUnique.length}건 추가 (총 ${mergedOrders.length}건)`
            )
            return
          }
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

    const productNames = new Set(orders.map((o) => `${o.productName}||${o.optionName}`))

    return {
      valid: cValid + tValid,
      invalid: cInvalid + tInvalid,
      duplicate: cDup + tDup,
      total: cValid + tValid + cInvalid + tInvalid + cDup + tDup,
      productCount: productNames.size,
    }
  }, [coupangParseResult, tossParseResult, orders])

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
    prepareUploadAutoDetect,
    commitUpload,
    summary,
  }
}
