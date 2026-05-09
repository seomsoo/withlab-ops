import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (typeof supabaseUrl !== 'string' || supabaseUrl.length === 0) {
  throw new Error('VITE_SUPABASE_URL 환경변수 누락')
}

if (typeof supabaseAnonKey !== 'string' || supabaseAnonKey.length === 0) {
  throw new Error('VITE_SUPABASE_ANON_KEY 환경변수 누락')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
