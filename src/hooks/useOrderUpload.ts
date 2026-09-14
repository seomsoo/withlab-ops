import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import { readExcelFile } from '@/utils/excel'
import { validateExcelFile } from '@/utils/file'
import { getOrderDeduplicationKey } from '@/utils/orderKey'
import { detectPlatform } from '@/lib/parsers/platformDetector'
import { parseCoupangOrders } from '@/lib/parsers/coupangParser'
import { parseTossOrders } from '@/lib/parsers/tossParser'
import {
  createOrderImport,
  appendOrdersToImport,
  saveOrders,
  getOrders,
  getOrderImports,
  deleteOrderImport,
  updateOrderImportLabel,
} from '@/lib/supabase/orders'

import type { StandardOrder, OrderImport, ParseResult, Platform } from '@/types'

export type UploadPlan = {
  file: File
  platform: Platform
  existingImports: OrderImport[]
  parseResult: ParseResult
}

function getNextLabel(platform: Platform, existingLabels: string[]): string {
  const prefix = platform === 'coupang' ? '쿠팡' : '토스'
  let n = existingLabels.length + 1
  while (existingLabels.includes(`${prefix}${n}`)) n++
  return `${prefix}${n}`
}

function getDefaultLabel(platform: Platform): string {
  return platform === 'coupang' ? '쿠팡1' : '토스1'
}

export function useOrderUpload(workSessionId: string) {
  const [imports, setImports] = useState<OrderImport[]>([])
  const [orders, setOrders] = useState<StandardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [parseResults, setParseResults] = useState<Map<string, ParseResult>>(
    new Map()
  )

  const coupangImports = useMemo(
    () => imports.filter((i) => i.platform === 'coupang'),
    [imports]
  )
  const tossImports = useMemo(
    () => imports.filter((i) => i.platform === 'toss'),
    [imports]
  )
  const coupangImport = coupangImports[0] ?? null
  const tossImport = tossImports[0] ?? null

  const coupangParseResult = useMemo(() => {
    if (coupangImports.length === 0) return null
    const coupangOrders = orders.filter((o) => o.platform === 'coupang')
    const allInvalid = coupangImports.flatMap((i) => {
      const pr = parseResults.get(i.id)
      return pr?.invalidRows ?? i.invalidRows
    })
    const allDuplicate = coupangImports.flatMap((i) => {
      const pr = parseResults.get(i.id)
      return pr?.duplicateRows ?? i.duplicateRows
    })
    const totalRows = coupangImports.reduce((s, i) => s + i.totalRows, 0)
    const invalidCount = coupangImports.reduce((s, i) => s + i.invalidCount, 0)
    const dupCount = coupangImports.reduce((s, i) => s + i.duplicateCount, 0)
    return {
      orders: coupangOrders,
      invalidRows: allInvalid,
      duplicateRows: allDuplicate,
      meta: {
        platform: 'coupang' as Platform,
        totalRows,
        skippedRows: 0,
        validRows: coupangOrders.length,
        invalidRows: invalidCount,
        duplicateRows: dupCount,
      },
    }
  }, [coupangImports, orders, parseResults])

  const tossParseResult = useMemo(() => {
    if (tossImports.length === 0) return null
    const tossOrders = orders.filter((o) => o.platform === 'toss')
    const allInvalid = tossImports.flatMap((i) => {
      const pr = parseResults.get(i.id)
      return pr?.invalidRows ?? i.invalidRows
    })
    const allDuplicate = tossImports.flatMap((i) => {
      const pr = parseResults.get(i.id)
      return pr?.duplicateRows ?? i.duplicateRows
    })
    const totalRows = tossImports.reduce((s, i) => s + i.totalRows, 0)
    const invalidCount = tossImports.reduce((s, i) => s + i.invalidCount, 0)
    const dupCount = tossImports.reduce((s, i) => s + i.duplicateCount, 0)
    return {
      orders: tossOrders,
      invalidRows: allInvalid,
      duplicateRows: allDuplicate,
      meta: {
        platform: 'toss' as Platform,
        totalRows,
        skippedRows: 0,
        validRows: tossOrders.length,
        invalidRows: invalidCount,
        duplicateRows: dupCount,
      },
    }
  }, [tossImports, orders, parseResults])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const [importData, orderData] = await Promise.all([
          getOrderImports(workSessionId),
          getOrders(workSessionId),
        ])
        if (!alive) return

        setImports(importData)
        setOrders(orderData)
        setParseResults(new Map())
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

      if (parseResult.orders.length === 0) {
        throw new Error('저장 가능한 정상 주문이 없습니다')
      }

      const existingImports = imports.filter((i) => i.platform === detected)

      return { file, platform: detected, existingImports, parseResult }
    },
    [imports]
  )

  const prepareUploadAutoDetect = useCallback(
    async (file: File): Promise<UploadPlan> => {
      validateExcelFile(file)
      const workbook = await readExcelFile(file)
      const detected = detectPlatform(workbook)

      if (detected === null) {
        throw new Error(
          '플랫폼을 자동 감지할 수 없습니다. 지원하는 파일 형식인지 확인해주세요.'
        )
      }

      const parseResult =
        detected === 'coupang'
          ? parseCoupangOrders(workbook)
          : parseTossOrders(workbook)

      if (parseResult.orders.length === 0) {
        throw new Error('저장 가능한 정상 주문이 없습니다')
      }

      const existingImports = imports.filter((i) => i.platform === detected)

      return { file, platform: detected, existingImports, parseResult }
    },
    [imports]
  )

  const refreshFromDb = useCallback(async () => {
    const [importData, orderData] = await Promise.all([
      getOrderImports(workSessionId),
      getOrders(workSessionId),
    ])
    setImports(importData)
    setOrders(orderData)
  }, [workSessionId])

  const commitUpload = useCallback(
    async (
      plan: UploadPlan,
      options?: {
        replaceExisting?: boolean
        appendExisting?: boolean
        appendImportId?: string
        addSeparate?: boolean
        separateLabel?: string
      }
    ): Promise<void> => {
      try {
        const firstExisting = plan.existingImports[0]

        if (options?.addSeparate) {
          // 이전 묶음번호 키와 새 상품별 키는 DB unique만으로 중복을 막을 수 없다.
          const existingOrders = await getOrders(workSessionId)
          const existingKeys = new Set(
            existingOrders
              .filter((order) => order.platform === plan.platform)
              .map(getOrderDeduplicationKey)
          )
          if (plan.parseResult.orders.some((order) =>
            existingKeys.has(getOrderDeduplicationKey(order))
          )) {
            throw new Error('이미 동일한 주문이 존재합니다. 별도 파일에 기존 주문이 중복 포함되어 있는지 확인해주세요.')
          }

          const existingLabels = plan.existingImports.map((i) => i.label)
          const newLabel =
            options.separateLabel ??
            getNextLabel(plan.platform, existingLabels)

          const imp = await createOrderImport({
            workSessionId,
            platform: plan.platform,
            fileName: plan.file.name,
            label: newLabel,
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

          await refreshFromDb()

          const label = plan.platform === 'coupang' ? '쿠팡' : '토스'
          toast.success(
            `${label} 주문 ${plan.parseResult.meta.validRows}건을 별도 파일로 추가했습니다`
          )
          return
        }

        if (options?.appendExisting) {
          const targetImport = options.appendImportId
            ? plan.existingImports.find((item) => item.id === options.appendImportId)
            : plan.existingImports.length === 1 ? firstExisting : undefined
          if (!targetImport) {
            throw new Error('주문을 추가할 기존 파일을 선택해주세요')
          }
          const result = await appendOrdersToImport({
            workSessionId,
            orderImportId: targetImport.id,
            platform: plan.platform,
            fileName: plan.file.name,
            orders: plan.parseResult.orders,
            invalidRows: plan.parseResult.invalidRows,
            duplicateRows: plan.parseResult.duplicateRows,
          })
          await refreshFromDb()
          toast.success(
            `주문 ${result.insertedCount}건 추가 · 중복 ${result.duplicateCount}건 제외 (총 ${result.totalCount}건)`
          )
          return
        }

        if (firstExisting && options?.replaceExisting) {
          for (const existingImport of plan.existingImports) {
            await deleteOrderImport(existingImport.id)
          }
        }

        const label = firstExisting?.label ?? getDefaultLabel(plan.platform)

        const imp = await createOrderImport({
          workSessionId,
          platform: plan.platform,
          fileName: plan.file.name,
          label,
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

        await refreshFromDb()

        const platformLabel = plan.platform === 'coupang' ? '쿠팡' : '토스'
        toast.success(
          `${platformLabel} 주문 ${plan.parseResult.meta.validRows}건을 업로드했습니다`
        )
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
        throw err
      }
    },
    [workSessionId, refreshFromDb]
  )

  const removeImport = useCallback(
    async (platform: Platform) => {
      const platformImports = imports.filter((i) => i.platform === platform)
      if (platformImports.length === 0) return
      try {
        for (const imp of platformImports) {
          await deleteOrderImport(imp.id)
        }
        await refreshFromDb()
        const label = platform === 'coupang' ? '쿠팡' : '토스'
        toast.success(`${label} 주문을 삭제했습니다`)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
      }
    },
    [imports, refreshFromDb]
  )

  const removeImportById = useCallback(
    async (importId: string) => {
      try {
        await deleteOrderImport(importId)
        await refreshFromDb()
        toast.success('주문 파일을 삭제했습니다')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
      }
    },
    [refreshFromDb]
  )

  const renameImportLabel = useCallback(
    async (importId: string, newLabel: string) => {
      try {
        await updateOrderImportLabel(importId, newLabel)
        await refreshFromDb()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '오류가 발생했습니다'
        toast.error(message)
      }
    },
    [refreshFromDb]
  )

  const summary = useMemo(() => {
    const cValid = coupangParseResult?.meta.validRows ?? 0
    const tValid = tossParseResult?.meta.validRows ?? 0
    const cInvalid = coupangParseResult?.meta.invalidRows ?? 0
    const tInvalid = tossParseResult?.meta.invalidRows ?? 0
    const cDup = coupangParseResult?.meta.duplicateRows ?? 0
    const tDup = tossParseResult?.meta.duplicateRows ?? 0

    const productNames = new Set(
      orders.map((o) => `${o.productName}||${o.optionName}`)
    )

    return {
      valid: cValid + tValid,
      invalid: cInvalid + tInvalid,
      duplicate: cDup + tDup,
      total: cValid + tValid + cInvalid + tInvalid + cDup + tDup,
      productCount: productNames.size,
    }
  }, [coupangParseResult, tossParseResult, orders])

  return {
    imports,
    coupangImport,
    tossImport,
    coupangImports,
    tossImports,
    orders,
    loading,
    parseResult: {
      coupang: coupangParseResult,
      toss: tossParseResult,
    },
    prepareUpload,
    prepareUploadAutoDetect,
    commitUpload,
    removeImport,
    removeImportById,
    renameImportLabel,
    summary,
  }
}
