import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/supabase"

let _supabase: SupabaseClient<Database> | null = null
let _supabaseAdmin: SupabaseClient<Database> | null = null

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
}

function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ""
}

function getSupabaseServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ""
}

function createSupabaseClient(url: string, key: string): SupabaseClient<Database> {
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getOrCreateSupabaseClient(): SupabaseClient<Database> {
  if (!_supabase) {
    const url = getSupabaseUrl()
    const key = getSupabaseAnonKey()
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required")
    }
    _supabase = createSupabaseClient(url, key)
  }
  return _supabase
}

function getOrCreateSupabaseAdmin(): SupabaseClient<Database> {
  if (!_supabaseAdmin) {
    const url = getSupabaseUrl()
    const key = getSupabaseServiceKey()
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    }
    _supabaseAdmin = createSupabaseClient(url, key)
  }
  return _supabaseAdmin
}

export function createSupabaseAdmin(): SupabaseClient<Database> {
  return getOrCreateSupabaseAdmin()
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return getOrCreateSupabaseClient()[prop as keyof SupabaseClient<Database>]
  },
})

export const getSupabaseAdmin = createSupabaseAdmin