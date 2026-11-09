import type { SupabaseClient } from '@supabase/supabase-js';

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

/** A client, or null when Supabase is unavailable. Services accept either form. */
export type ClientSource = () => SupabaseClient | null | Promise<SupabaseClient | null>;

let client: Promise<SupabaseClient | null> | undefined;

/**
 * Lazily created anon client, or null when env config is missing. Callers must treat null as
 * "Supabase unavailable" and fall back (questions) or skip (analytics). The game never depends on it.
 *
 * supabase-js is loaded with a dynamic import, so it stays out of the initial bundle (PRD §4.4:
 * first load under 2s on 4G) and is never downloaded at all when the env config is missing.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (client) return client;
  const config = getSupabaseConfig();
  if (!config) {
    client = Promise.resolve(null);
    return client;
  }
  client = import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(config.url, config.anonKey, {
        // No auth in the MVP: don't persist or refresh sessions.
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    )
    .catch((err: unknown) => {
      console.warn('[supabase] falha ao criar o cliente:', err);
      // Don't cache the failure: a chunk that failed to load offline may load later.
      client = undefined;
      return null;
    });
  return client;
}

/** Test-only: forget the cached client so env changes take effect. */
export function resetSupabaseForTests(): void {
  client = undefined;
}
