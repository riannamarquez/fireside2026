import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const MISSING_CONFIG =
  'Missing Supabase config: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.'

// Demo mode never touches Supabase, so missing config only throws when the client is actually used.
export const supabase: SupabaseClient =
  url && anonKey
    ? createClient(url, anonKey)
    : (new Proxy({}, {
        get() {
          throw new Error(MISSING_CONFIG)
        },
      }) as SupabaseClient)
