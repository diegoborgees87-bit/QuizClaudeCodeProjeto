import { getSupabase, getSupabaseConfig, resetSupabaseForTests } from '../../src/services/supabase';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetSupabaseForTests();
});

describe('supabase client', () => {
  it('retorna null quando as variáveis de ambiente não estão definidas', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(getSupabaseConfig()).toBeNull();
    expect(await getSupabase()).toBeNull();
  });

  it('cria o cliente uma vez (import dinâmico) quando a configuração existe', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    expect(getSupabaseConfig()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    });
    const client = await getSupabase();
    expect(client).not.toBeNull();
    expect(await getSupabase()).toBe(client);
  });

  it('retorna null se a URL for inválida e tenta de novo na próxima chamada', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('VITE_SUPABASE_URL', 'não é url');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    expect(await getSupabase()).toBeNull();
    expect(await getSupabase()).toBeNull();
    // The failure isn't cached, so the second call tried again.
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
