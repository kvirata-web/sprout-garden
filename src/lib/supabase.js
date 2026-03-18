import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Expose client for Playwright E2E auth setup (dev only)
if (import.meta.env.DEV) {
  window.__supabase = supabase
}
