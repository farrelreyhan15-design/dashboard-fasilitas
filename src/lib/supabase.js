import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const kunci = import.meta.env.VITE_SUPABASE_ANON_KEY


if (!url || !kunci) {
  throw new Error('VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diisi di file .env.local')
}

export const supabase = createClient(url, kunci)