import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getSupplierProductTemplate,
  upsertSupplierProductTemplate,
  updateUploadHistory,
  deleteSupplierProductTemplate,
  uploadProductTemplateFile,
  removeProductTemplateStorageFile,
} from '@/lib/supabase/supplierProductTemplates'
import {
  getSupplierProducts,
  replaceSupplierProducts,
} from '@/lib/supabase/supplierProducts'
import { parseSupplierProducts } from '@/lib/parsers/supplierProductParser'
import { readExcelFile, sheetToRows } from '@/utils/excel'

import type {
  SupplierProductTemplate,
  SupplierProduct,
  SupplierProductColumnMapping,
} from '@/types'

export function useSupplierProducts(supplierId: string) {
  const [products, setProducts] = useState<SupplierProduct[]>([])
  const [template, setTemplate] = useState<SupplierProductTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const [tpl, prods] = await Promise.all([
        getSupplierProductTemplate(supplierId),
        getSupplierProducts(supplierId),
      ])
      setTemplate(tpl)
      setProducts(prods)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '상품 목록 조회 실패'
      )
    } finally {
      setLoading(false)
    }
  }, [supplierId])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const [tpl, prods] = await Promise.all([
          getSupplierProductTemplate(supplierId),
          getSupplierProducts(supplierId),
        ])
        if (!alive) return
        setTemplate(tpl)
        setProducts(prods)
      } catch (err) {
        if (!alive) return
        toast.error(
          err instanceof Error ? err.message : '상품 목록 조회 실패'
        )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [supplierId])

  const saveTemplate = useCallback(
    async (input: {
      file: File
      sheetName: string
      headerRow: number
      dataStartRow: number
      columnMappings: SupplierProductColumnMapping[]
      existingTemplatePath?: string
    }): Promise<SupplierProductTemplate> => {
      try {
        const templatePath = await uploadProductTemplateFile(
          supplierId,
          input.file
        )

        let saved: SupplierProductTemplate
        try {
          saved = await upsertSupplierProductTemplate({
            supplierId,
            templatePath,
            templateFileName: input.file.name,
            sheetName: input.sheetName,
            headerRow: input.headerRow,
            dataStartRow: input.dataStartRow,
            columnMappings: input.columnMappings,
          })
          setTemplate(saved)
        } catch (upsertErr) {
          await removeProductTemplateStorageFile(templatePath)
          throw upsertErr
        }

        if (
          input.existingTemplatePath &&
          input.existingTemplatePath !== templatePath
        ) {
          await removeProductTemplateStorageFile(input.existingTemplatePath)
        }

        toast.success('상품 양식이 저장되었습니다')
        return saved
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '상품 양식 저장 실패'
        )
        throw err
      }
    },
    [supplierId]
  )

  const removeTemplate = useCallback(async () => {
    try {
      await deleteSupplierProductTemplate(supplierId)
      setTemplate(null)
      setProducts([])
      toast.success('상품 양식이 삭제되었습니다')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '상품 양식 삭제 실패'
      )
      throw err
    }
  }, [supplierId])

  const uploadProducts = useCallback(
    async (file: File, templateOverride?: SupplierProductTemplate) => {
      const tpl = templateOverride ?? template
      if (!tpl) {
        toast.error('상품 양식을 먼저 등록해주세요')
        return
      }

      try {
        const wb = await readExcelFile(file)
        const sheet =
          wb.Sheets[tpl.sheetName] ?? wb.Sheets[wb.SheetNames[0]!]
        if (!sheet) {
          toast.error('시트를 찾을 수 없습니다')
          return
        }

        const rows = sheetToRows(sheet)
        const result = parseSupplierProducts({
          rows,
          columnMappings: tpl.columnMappings,
          headerRow: tpl.headerRow,
          dataStartRow: tpl.dataStartRow,
        })

        if (result.meta.validCount === 0) {
          toast.error(
            `파싱 실패: 유효한 상품이 없습니다 (오류 ${result.meta.invalidCount}건)`
          )
          return
        }

        await replaceSupplierProducts(supplierId, result.products)
        await updateUploadHistory(supplierId, {
          lastUploadedFileName: file.name,
          lastUploadedCount: result.meta.validCount,
          lastInvalidCount: result.meta.invalidCount,
        })

        const prods = await getSupplierProducts(supplierId)
        setProducts(prods)

        const refreshedTpl = await getSupplierProductTemplate(supplierId)
        setTemplate(refreshedTpl)

        const msg =
          result.meta.invalidCount > 0
            ? `${result.meta.validCount}개 상품 등록 (오류 ${result.meta.invalidCount}건)`
            : `${result.meta.validCount}개 상품 등록 완료`
        toast.success(msg)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '상품 업로드 실패'
        )
        throw err
      }
    },
    [supplierId, template]
  )

  const refreshProducts = useCallback(async () => {
    try {
      const prods = await getSupplierProducts(supplierId)
      setProducts(prods)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '상품 목록 새로고침 실패'
      )
    }
  }, [supplierId])

  return {
    products,
    template,
    loading,
    productCount: products.length,
    saveTemplate,
    removeTemplate,
    uploadProducts,
    refreshProducts,
    refetch: fetchAll,
  }
}
