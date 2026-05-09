import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getAllSupplierTemplates,
  upsertSupplierTemplate,
  deleteSupplierTemplate,
  uploadTemplateFile,
  removeStorageFile,
} from '@/lib/supabase/supplierTemplates'

import type { SupplierTemplate, ColumnMappingItem } from '@/types'

export function useSupplierTemplates() {
  const [templates, setTemplates] = useState<SupplierTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAllSupplierTemplates()
      setTemplates(data)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '양식 목록 조회 실패'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const data = await getAllSupplierTemplates()
        if (!alive) return
        setTemplates(data)
      } catch (err) {
        if (!alive) return
        toast.error(
          err instanceof Error ? err.message : '양식 목록 조회 실패'
        )
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const saveTemplate = useCallback(
    async (input: {
      supplierId: string
      file: File
      sheetName: string
      headerRow: number
      dataStartRow: number
      columnMappings: ColumnMappingItem[]
      existingTemplatePath?: string
    }) => {
      try {
        const templatePath = await uploadTemplateFile(input.supplierId, input.file)

        try {
          await upsertSupplierTemplate({
            supplierId: input.supplierId,
            templatePath,
            templateFileName: input.file.name,
            sheetName: input.sheetName,
            headerRow: input.headerRow,
            dataStartRow: input.dataStartRow,
            columnMappings: input.columnMappings,
          })
        } catch (upsertErr) {
          await removeStorageFile(templatePath)
          throw upsertErr
        }

        if (input.existingTemplatePath && input.existingTemplatePath !== templatePath) {
          await removeStorageFile(input.existingTemplatePath)
        }

        await fetchTemplates()
        toast.success('양식이 저장되었습니다')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '양식 저장 실패'
        )
        throw err
      }
    },
    [fetchTemplates]
  )

  const removeTemplate = useCallback(
    async (templateId: string) => {
      try {
        await deleteSupplierTemplate(templateId)
        await fetchTemplates()
        toast.success('양식이 삭제되었습니다')
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '양식 삭제 실패'
        )
        throw err
      }
    },
    [fetchTemplates]
  )

  return {
    templates,
    loading,
    saveTemplate,
    removeTemplate,
    refetch: fetchTemplates,
  }
}
