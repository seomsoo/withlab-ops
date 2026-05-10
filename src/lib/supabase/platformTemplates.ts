import { supabase } from '@/lib/supabase/client'
import { toPlatformTrackingTemplate } from '@/lib/schemas'

import type { PlatformTrackingTemplate, Platform } from '@/types'
import type { PlatformTemplateRow } from '@/lib/schemas'

export async function getPlatformTemplate(
  platform: Platform
): Promise<PlatformTrackingTemplate | null> {
  const { data, error } = await supabase
    .from('platform_templates')
    .select('*')
    .eq('platform', platform)
    .maybeSingle()

  if (error) throw new Error(`플랫폼 양식 조회 실패: ${error.message}`)
  if (!data) return null
  return toPlatformTrackingTemplate(data as PlatformTemplateRow)
}

export async function upsertPlatformTemplate(input: {
  platform: Platform
  templatePath: string
  templateFileName: string
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
}): Promise<PlatformTrackingTemplate> {
  const { data, error } = await supabase
    .from('platform_templates')
    .upsert(
      {
        platform: input.platform,
        template_path: input.templatePath,
        template_file_name: input.templateFileName,
        sheet_name: input.sheetName,
        header_row: input.headerRow,
        data_start_row: input.dataStartRow,
        match_key_column_index: input.matchKeyColumnIndex,
        match_key_column_name: input.matchKeyColumnName,
        tracking_company_column_index: input.trackingCompanyColumnIndex,
        tracking_company_column_name: input.trackingCompanyColumnName,
        tracking_number_column_index: input.trackingNumberColumnIndex,
        tracking_number_column_name: input.trackingNumberColumnName,
        status_column_index: input.statusColumnIndex ?? null,
        status_column_name: input.statusColumnName ?? null,
        status_value: input.statusValue ?? null,
      },
      { onConflict: 'platform' }
    )
    .select()
    .single()

  if (error) throw new Error(`플랫폼 양식 저장 실패: ${error.message}`)
  return toPlatformTrackingTemplate(data as PlatformTemplateRow)
}

export async function uploadPlatformTemplateFile(
  platform: Platform,
  file: File
): Promise<string> {
  const timestamp = Date.now()
  const path = `templates/platform/${platform}_${timestamp}.xlsx`

  const { error } = await supabase.storage
    .from('templates')
    .upload(path, file)

  if (error) throw new Error(`플랫폼 양식 파일 업로드 실패: ${error.message}`)
  return path
}

export async function downloadPlatformTemplateFile(
  templatePath: string
): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from('templates')
    .download(templatePath)

  if (error) throw new Error(`플랫폼 양식 파일 다운로드 실패: ${error.message}`)
  return data
}

export async function removePlatformTemplateFile(path: string): Promise<void> {
  await supabase.storage.from('templates').remove([path])
}
