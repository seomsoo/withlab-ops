import { supabase } from '@/lib/supabase/client'
import { toSupplierProductTemplate } from '@/lib/schemas'

import type { SupplierProductTemplate, SupplierProductColumnMapping } from '@/types'
import type { SupplierProductTemplateRow } from '@/lib/schemas'

export async function getSupplierProductTemplateSupplierIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('supplier_product_templates')
    .select('supplier_id')

  if (error) throw new Error(`상품 양식 목록 조회 실패: ${error.message}`)
  return new Set((data ?? []).map((r: { supplier_id: string }) => r.supplier_id))
}

export async function getSupplierProductTemplate(
  supplierId: string
): Promise<SupplierProductTemplate | null> {
  const { data, error } = await supabase
    .from('supplier_product_templates')
    .select('*')
    .eq('supplier_id', supplierId)
    .maybeSingle()

  if (error) throw new Error(`상품 양식 조회 실패: ${error.message}`)
  if (!data) return null
  return toSupplierProductTemplate(data as SupplierProductTemplateRow)
}

export async function upsertSupplierProductTemplate(input: {
  supplierId: string
  templatePath: string
  templateFileName: string
  sheetName: string
  headerRow: number
  dataStartRow: number
  columnMappings: SupplierProductColumnMapping[]
}): Promise<SupplierProductTemplate> {
  const { data, error } = await supabase
    .from('supplier_product_templates')
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

  if (error) throw new Error(`상품 양식 저장 실패: ${error.message}`)
  return toSupplierProductTemplate(data as SupplierProductTemplateRow)
}

export async function updateUploadHistory(
  supplierId: string,
  history: {
    lastUploadedFileName: string
    lastUploadedCount: number
    lastInvalidCount: number
  }
): Promise<void> {
  const { error } = await supabase
    .from('supplier_product_templates')
    .update({
      last_uploaded_file_name: history.lastUploadedFileName,
      last_uploaded_at: new Date().toISOString(),
      last_uploaded_count: history.lastUploadedCount,
      last_invalid_count: history.lastInvalidCount,
    })
    .eq('supplier_id', supplierId)

  if (error) throw new Error(`업로드 이력 갱신 실패: ${error.message}`)
}

export async function deleteSupplierProductTemplate(
  supplierId: string
): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from('supplier_product_templates')
    .select('id, template_path')
    .eq('supplier_id', supplierId)
    .maybeSingle()

  if (fetchErr) throw new Error(`상품 양식 조회 실패: ${fetchErr.message}`)
  if (!existing) return

  const { error: prodErr } = await supabase
    .from('supplier_products')
    .delete()
    .eq('supplier_id', supplierId)

  if (prodErr) throw new Error(`공급처 상품 삭제 실패: ${prodErr.message}`)

  const { error: deleteErr } = await supabase
    .from('supplier_product_templates')
    .delete()
    .eq('id', existing.id)

  if (deleteErr) throw new Error(`상품 양식 삭제 실패: ${deleteErr.message}`)

  if (existing.template_path) {
    await supabase.storage.from('templates').remove([existing.template_path])
  }
}

export async function uploadProductTemplateFile(
  supplierId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now()
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'xlsx'
  const path = `product-templates/${supplierId}/${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from('templates')
    .upload(path, file)

  if (error) throw new Error(`상품 양식 파일 업로드 실패: ${error.message}`)
  return path
}

export async function removeProductTemplateStorageFile(
  path: string
): Promise<void> {
  await supabase.storage.from('templates').remove([path])
}
