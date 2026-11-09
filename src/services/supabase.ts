import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/** Public (anon) config from Vite env. Returns null when either variable is missing. */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

let client: SupabaseClient | null | undefined;

/**
 * Lazily created anon client, or null when env config is missing. Callers must treat null as
 * "Supabase unavailable" and fall back (questions) or skip (analytics). The game never depends on it.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const config = getSupabaseConfig();
  if (!config) {
    client = null;
    return client;
  }
  try {
    client = createClient(config.url, config.anonKey, {
      // No auth in the MVP: don't persist or refresh sessions.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch (err) {
    console.warn('[supabase] falha ao criar o cliente:', err);
    client = null;
  }
  return client;
}

/** Test-only: forget the cached client so env changes take effect. */
export function resetSupabaseForTests(): void {
  client = undefined;
}
