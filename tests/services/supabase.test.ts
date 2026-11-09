import { getSupabase, getSupabaseConfig, resetSupabaseForTests } from '../../src/services/supabase';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetSupabaseForTests();
});

describe('supabase client', () => {
  it('retorna null quando as variáveis de ambiente não estão definidas', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(getSupabaseConfig()).toBeNull();
    expect(getSupabase()).toBeNull();
  });

  it('cria o cliente uma vez quando a configuração existe', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    expect(getSupabaseConfig()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    });
    const client = getSupabase();
    expect(client).not.toBeNull();
    expect(getSupabase()).toBe(client);
  });

  it('retorna null se a URL for inválida', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('VITE_SUPABASE_URL', 'não é url');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    expect(getSupabase()).toBeNull();
  });
});
