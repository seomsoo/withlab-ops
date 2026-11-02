import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key)
  throw new Error(
    'SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다. 키는 클라이언트 환경변수에 넣지 마세요.'
  )
const client = createClient(url, key, { auth: { persistSession: false } })
const bytes = await readFile(
  new URL('../templates/price-summary-v1.xlsx', import.meta.url)
)
const { error } = await client.storage
  .from('templates')
  .upload('price-summary/v1.xlsx', bytes, {
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: true,
  })
if (error) throw error
console.log('가격정리 공통 양식 등록 완료')
