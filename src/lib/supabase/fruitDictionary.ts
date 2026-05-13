import { supabase } from '@/lib/supabase/client'
import {
  toFruitDictionary,
  fromFruitDictionary,
} from '@/lib/schemas'

import type { FruitDictionary, SynonymGroup } from '@/types'
import type { FruitDictionaryRow } from '@/lib/schemas'

export async function getFruitDictionaries(
  activeOnly = true
): Promise<FruitDictionary[]> {
  let query = supabase
    .from('fruit_dictionary')
    .select('*')
    .order('category')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
      return []
    }
    throw new Error(`과일 사전 조회 실패: ${error.message}`)
  }
  return (data as FruitDictionaryRow[]).map(toFruitDictionary)
}

export async function createFruitDictionary(
  input: Omit<FruitDictionary, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FruitDictionary> {
  const row = fromFruitDictionary(input)

  const { data, error } = await supabase
    .from('fruit_dictionary')
    .insert(row)
    .select()
    .single()

  if (error) throw new Error(`과일 사전 추가 실패: ${error.message}`)
  return toFruitDictionary(data as FruitDictionaryRow)
}

export async function updateFruitDictionary(
  id: string,
  input: {
    category?: string
    keywords?: string[]
    gradeSynonyms?: SynonymGroup[]
    sizeSynonyms?: SynonymGroup[]
    weightAliases?: Record<string, string[]>
    weightMapping?: Record<string, string>
    isActive?: boolean
  }
): Promise<FruitDictionary> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (input.category !== undefined) row.category = input.category
  if (input.keywords !== undefined) row.keywords = input.keywords
  if (input.gradeSynonyms !== undefined) {
    const result: Record<string, string[]> = {}
    for (const g of input.gradeSynonyms) result[g.canonical] = g.aliases
    row.grade_synonyms = result
  }
  if (input.sizeSynonyms !== undefined) {
    const result: Record<string, string[]> = {}
    for (const g of input.sizeSynonyms) result[g.canonical] = g.aliases
    row.size_synonyms = result
  }
  if (input.weightAliases !== undefined) row.weight_aliases = input.weightAliases
  if (input.weightMapping !== undefined) row.weight_mapping = input.weightMapping
  if (input.isActive !== undefined) row.is_active = input.isActive

  const { data, error } = await supabase
    .from('fruit_dictionary')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`과일 사전 수정 실패: ${error.message}`)
  return toFruitDictionary(data as FruitDictionaryRow)
}

export async function softDeleteFruitDictionary(id: string): Promise<void> {
  const { error } = await supabase
    .from('fruit_dictionary')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`과일 사전 삭제 실패: ${error.message}`)
}
