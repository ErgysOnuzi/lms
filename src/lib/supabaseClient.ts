import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// During initial deploy the env vars may not be set yet — render a setup
// screen instead of crashing the whole React tree with a thrown error.
export const supabaseMisconfigured = !supabaseUrl || !supabaseAnonKey

export const supabase = supabaseMisconfigured
  ? (null as never)
  : createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
