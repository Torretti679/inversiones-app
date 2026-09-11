import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zapbmdavxzaxlwzdmpmi.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_bH_9aRgQZQbPP3W7jUJcvA_TniSsuSf'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)