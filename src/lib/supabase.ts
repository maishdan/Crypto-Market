import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isPlaceholder = (value: string) => /your-project-id|your-supabase-anon-or-publishable-key|placeholder/i.test(value)
const isPublicKey = (value: string) => Boolean(value && value.length > 10 && !isPlaceholder(value))
const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export const supabaseConfigured = Boolean(
  supabaseUrl && supabaseKey &&
  isHttpsUrl(supabaseUrl) &&
  isPublicKey(supabaseKey) &&
  !isPlaceholder(supabaseUrl) &&
  !isPlaceholder(supabaseKey),
)

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null