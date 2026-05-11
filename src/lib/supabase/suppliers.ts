import { supabase } from '@/lib/supabase/client'
import {
  supplierFormSchema,
  toSupplier,
} from '@/lib/schemas'
import { toFriendlyDbError } from '@/lib/supabase/errors'

import type { Supplier } from '@/types'
import type { SupplierFormData, SupplierRow } from '@/lib/schemas'

export async function getSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(`공급처 조회 실패: ${error.message}`)
  return (data as SupplierRow[]).map(toSupplier)
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')
  if (error) throw new Error(`공급처 조회 실패: ${error.message}`)
  return (data as SupplierRow[]).map(toSupplier)
}

export async function createSupplier(
  input: SupplierFormData
): Promise<Supplier> {
  const parsed = supplierFormSchema.parse(input)
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name: parsed.name,
      contact: parsed.contact || null,
      memo: parsed.memo || null,
    })
    .select()
    .single()
  if (error) throw new Error(toFriendlyDbError(error, 'supplier'))
  return toSupplier(data as SupplierRow)
}

export async function updateSupplier(
  id: string,
  input: SupplierFormData
): Promise<Supplier> {
  const parsed = supplierFormSchema.parse(input)
  const { data, error } = await supabase
    .from('suppliers')
    .update({
      name: parsed.name,
      contact: parsed.contact || null,
      memo: parsed.memo || null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(toFriendlyDbError(error, 'supplier'))
  return toSupplier(data as SupplierRow)
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`공급처 조회 실패: ${error.message}`)
  if (!data) return null
  return toSupplier(data as SupplierRow)
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw new Error(`공급처 비활성화 실패: ${error.message}`)
}
