import { supabase } from '@/lib/supabase/client'
import { toSupplierTemplate } from '@/lib/schemas'

import type { SupplierTemplate, ColumnMappingItem } from '@/types'
import type { SupplierTemplateRow } from '@/lib/schemas'

export async function getSupplierTemplate(
  supplierId: string
): Promise<SupplierTemplate | null> {
  const { data, error } = await supabase
    .from('supplier_templates')
    .select('*')
    .eq('supplier_id', supplierId)
    .maybeSingle()

  if (error) throw new Error(`양식 조회 실패: ${error.message}`)
  if (!data) return null
  return toSupplierTemplate(data as SupplierTemplateRow)
}

export async function getAllSupplierTemplates(): Promise<SupplierTemplate[]> {
  const { data, error } = await supabase
    .from('supplier_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`양식 목록 조회 실패: ${error.message}`)
  return (data as SupplierTemplateRow[]).map(toSupplierTemplate)
}

export async function upsertSupplierTemplate(input: {
  supplierId: string
  templatePath: string
  templateFileName: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  columnMappings: ColumnMappingItem[]
}): Promise<SupplierTemplate> {
  const { data, error } = await supabase
    .from('supplier_templates')
    .upsert(
      {
        supplier_id: input.supplierId,
        template_path: input.templatePath,
        template_file_name: input.templateFileName,
        sheet_name: input.sheetName,
        header_row: input.headerRow,
        data_start_row: input.dataStartRow,
        column_mappings: input.columnMappings,
      },
      { onConflict: 'supplier_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`양식 저장 실패: ${error.message}`)
  return toSupplierTemplate(data as SupplierTemplateRow)
}

export async function deleteSupplierTemplate(templateId: string): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from('supplier_templates')
    .select('template_path')
    .eq('id', templateId)
    .single()

  if (fetchErr) throw new Error(`양식 조회 실패: ${fetchErr.message}`)

  const { error: deleteErr } = await supabase
    .from('supplier_templates')
    .delete()
    .eq('id', templateId)

  if (deleteErr) throw new Error(`양식 삭제 실패: ${deleteErr.message}`)

  if (existing?.template_path) {
    await supabase.storage.from('templates').remove([existing.template_path])
  }
}

export async function uploadTemplateFile(
  supplierId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now()
  const path = `supplier-templates/${supplierId}/${timestamp}_${file.name}`

  const { error } = await supabase.storage
    .from('templates')
    .upload(path, file)

  if (error) throw new Error(`템플릿 파일 업로드 실패: ${error.message}`)
  return path
}

export async function downloadTemplateFile(templatePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from('templates')
    .download(templatePath)

  if (error) throw new Error(`템플릿 파일 다운로드 실패: ${error.message}`)
  return data
}

export async function removeStorageFile(path: string): Promise<void> {
  await supabase.storage.from('templates').remove([path])
}
