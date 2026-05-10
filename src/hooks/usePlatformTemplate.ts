import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getPlatformTemplate,
  upsertPlatformTemplate,
  uploadPlatformTemplateFile,
  removePlatformTemplateFile,
} from '@/lib/supabase/platformTemplates'

import type { PlatformTrackingTemplate, Platform } from '@/types'

export type PlatformTemplateInput = {
  platform: Platform
  file: File
  sheetName: string
  headerRow: number
  dataStartRow: number
  matchKeyColumnIndex: number
  matchKeyColumnName: string
  trackingCompanyColumnIndex: number
  trackingCompanyColumnName: string
  trackingNumberColumnIndex: number
  trackingNumberColumnName: string
  statusColumnIndex?: number
  statusColumnName?: string
  statusValue?: string
}

export function usePlatformTemplate(platform: Platform) {
  const [template, setTemplate] = useState<PlatformTrackingTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setIsLoading(true)
        const data = await getPlatformTemplate(platform)
        if (!alive) return
        setTemplate(data)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '양식 조회 실패')
      } finally {
        if (alive) setIsLoading(false)
      }
    })()
    return () => { alive = false }
  }, [platform])

  const saveTemplate = useCallback(
    async (input: PlatformTemplateInput) => {
      const oldTemplatePath = template?.templatePath

      const newPath = await uploadPlatformTemplateFile(input.platform, input.file)

      try {
        const saved = await upsertPlatformTemplate({
          platform: input.platform,
          templatePath: newPath,
          templateFileName: input.file.name,
          sheetName: input.sheetName,
          headerRow: input.headerRow,
          dataStartRow: input.dataStartRow,
          matchKeyColumnIndex: input.matchKeyColumnIndex,
          matchKeyColumnName: input.matchKeyColumnName,
          trackingCompanyColumnIndex: input.trackingCompanyColumnIndex,
          trackingCompanyColumnName: input.trackingCompanyColumnName,
          trackingNumberColumnIndex: input.trackingNumberColumnIndex,
          trackingNumberColumnName: input.trackingNumberColumnName,
          statusColumnIndex: input.statusColumnIndex,
          statusColumnName: input.statusColumnName,
          statusValue: input.statusValue,
        })

        if (oldTemplatePath && oldTemplatePath !== newPath) {
          await removePlatformTemplateFile(oldTemplatePath)
        }

        setTemplate(saved)
        toast.success('양식이 저장되었습니다')
      } catch (err) {
        await removePlatformTemplateFile(newPath)
        throw err
      }
    },
    [template]
  )

  return {
    template,
    isLoading,
    saveTemplate,
  }
}
