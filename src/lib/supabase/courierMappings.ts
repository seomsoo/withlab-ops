import { supabase } from '@/lib/supabase/client'
import {
  courierMappingFormSchema,
  toCourierMapping,
} from '@/lib/schemas'
import { toFriendlyDbError } from '@/lib/supabase/errors'

import type { CourierMapping } from '@/types'
import type {
  CourierMappingFormData,
  CourierMappingRow,
} from '@/lib/schemas'

export async function getCourierMappings(): Promise<CourierMapping[]> {
  const { data, error } = await supabase
    .from('courier_mappings')
    .select('id, source_name, coupang_name, toss_name, created_at')
    .order('source_name')
  if (error) throw new Error(`택배사 매핑 조회 실패: ${error.message}`)
  return (data as CourierMappingRow[]).map(toCourierMapping)
}

export async function createCourierMapping(
  input: CourierMappingFormData
): Promise<CourierMapping> {
  const parsed = courierMappingFormSchema.parse(input)
  const { data, error } = await supabase
    .from('courier_mappings')
    .insert({
      source_name: parsed.sourceName,
      coupang_name: parsed.coupangName,
      toss_name: parsed.tossName,
    })
    .select()
    .single()
  if (error) throw new Error(toFriendlyDbError(error, 'courier_mapping'))
  return toCourierMapping(data as CourierMappingRow)
}

export async function updateCourierMapping(
  id: string,
  input: CourierMappingFormData
): Promise<CourierMapping> {
  const parsed = courierMappingFormSchema.parse(input)
  const { data, error } = await supabase
    .from('courier_mappings')
    .update({
      source_name: parsed.sourceName,
      coupang_name: parsed.coupangName,
      toss_name: parsed.tossName,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(toFriendlyDbError(error, 'courier_mapping'))
  return toCourierMapping(data as CourierMappingRow)
}

export async function deleteCourierMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('courier_mappings')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`택배사 매핑 삭제 실패: ${error.message}`)
}
