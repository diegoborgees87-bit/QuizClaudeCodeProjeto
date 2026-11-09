import type { SupabaseClient } from '@supabase/supabase-js';
import { CLIENT_ID_KEY, createAnalytics, type AnalyticsDeps } from '../../src/services/analytics';

type Call =
  { kind: 'insert'; table: string; row: unknown } | { kind: 'rpc'; fn: string; args: unknown };

function fakeClient(opts: { delayFirstMs?: number; fail?: 'error' | 'throw' } = {}) {
  const calls: Call[] = [];
  let first = true;
  const respond = async (call: Call) => {
    if (first && opts.delayFirstMs) await new Promise((r) => setTimeout(r, opts.delayFirstMs));
    first = false;
    calls.push(call);
    if (opts.fail === 'throw') throw new Error('rede');
    return { error: opts.fail === 'error' ? { message: 'rls' } : null };
  };
  const client = {
    from: (table: string) => ({
      insert: (row: unknown) => respond({ kind: 'insert', table, row }),
    }),
    rpc: (fn: string, args: unknown) => respond({ kind: 'rpc', fn, args }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
}

function setup(overrides: Partial<AnalyticsDeps> = {}) {
  let n = 0;
  const fetchFn = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null)));
  const { client, calls } = fakeClient();
  const deps: AnalyticsDeps = {
    getClient: () => client,
    getConfig: () => ({ url: 'https://x.supabase.co', anonKey: 'anon-key' }),
    storage: memoryStorage,
    randomUUID: () => `uuid-${++n}`,
    fetchFn,
    userAgent: () => 'test-agent',
    ...overrides,
  };
  return { analytics: createAnalytics(deps), calls, fetchFn };
}

const answer = {
  questionId: 'beg-001',
  position: 1,
  userAnswer: true,
  isCorrect: true,
  timedOut: false,
  responseTimeMs: 1234.6,
};

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe('analytics', () => {
  it('cria a sessão com id gerado no cliente, sem precisar ler de volta', async () => {
    const { analytics, calls } = setup();
    const id = analytics.startSession('beginner');
    await analytics.flush();
    expect(calls).toEqual([
      {
        kind: 'insert',
        table: 'game_sessions',
        row: { id, level: 'beginner', client_id: expect.any(String), user_agent: 'test-agent' },
      },
    ]);
  });

  it('grava respostas e finaliza na ordem, mesmo se o insert da sessão demorar', async () => {
    vi.useFakeTimers();
    const { client, calls } = fakeClient({ delayFirstMs: 500 });
    const { analytics } = setup({ getClient: () => client });
    const id = analytics.startSession('advanced');
    analytics.recordAnswer(id, answer);
    analytics.finishSession(id, 7);
    await vi.advanceTimersByTimeAsync(500);
    await analytics.flush();
    vi.useRealTimers();

    expect(calls.map((c) => (c.kind === 'insert' ? c.table : c.fn))).toEqual([
      'game_sessions',
      'game_answers',
      'finish_game_session',
    ]);
    expect(calls[1]).toMatchObject({
      row: {
        session_id: id,
        question_id: 'beg-001',
        position: 1,
        user_answer: true,
        is_correct: true,
        timed_out: false,
        response_time_ms: 1235,
      },
    });
    expect(calls[2]).toMatchObject({
      args: { p_session_id: id, p_status: 'completed', p_score: 7 },
    });
  });

  it('registra abandono ao voltar para o início', async () => {
    const { analytics, calls } = setup();
    const id = analytics.startSession('beginner');
    analytics.abandonSession(id);
    await analytics.flush();
    expect(calls[1]).toMatchObject({ fn: 'finish_game_session', args: { p_status: 'abandoned' } });
  });

  it.each(['error', 'throw'] as const)('nunca lança quando o Supabase falha (%s)', async (fail) => {
    const { client } = fakeClient({ fail });
    const { analytics } = setup({ getClient: () => client });
    expect(() => {
      const id = analytics.startSession('beginner');
      analytics.recordAnswer(id, answer);
      analytics.finishSession(id, 3);
    }).not.toThrow();
    await expect(analytics.flush()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('não faz nada sem Supabase configurado', async () => {
    const { analytics, fetchFn } = setup({ getClient: () => null, getConfig: () => null });
    const id = analytics.startSession('beginner');
    analytics.recordAnswer(id, answer);
    analytics.markActiveAbandonedOnUnload();
    await analytics.flush();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('não lança se getClient lançar', () => {
    const { analytics } = setup({
      getClient: () => {
        throw new Error('env');
      },
    });
    expect(() => analytics.startSession('beginner')).not.toThrow();
  });

  describe('clientId', () => {
    it('é gerado uma vez e reaproveitado do localStorage', () => {
      const storage = memoryStorage();
      const { analytics } = setup({ storage: () => storage });
      const first = analytics.getClientId();
      expect(storage.getItem(CLIENT_ID_KEY)).toBe(first);
      expect(analytics.getClientId()).toBe(first);
    });

    it('usa um id em memória quando o localStorage lança', () => {
      const broken = {
        getItem: () => {
          throw new Error('privado');
        },
      } as unknown as Storage;
      const { analytics } = setup({ storage: () => broken });
      const first = analytics.getClientId();
      expect(analytics.getClientId()).toBe(first);
    });
  });

  describe('abandono ao sair da página', () => {
    it('envia fetch com keepalive para a partida em andamento', () => {
      const { analytics, fetchFn } = setup();
      const id = analytics.startSession('beginner');
      analytics.markActiveAbandonedOnUnload();
      expect(fetchFn).toHaveBeenCalledOnce();
      const [url, init] = fetchFn.mock.calls[0];
      expect(url).toBe('https://x.supabase.co/rest/v1/rpc/finish_game_session');
      expect(init).toMatchObject({ method: 'POST', keepalive: true });
      expect(JSON.parse(String(init?.body))).toEqual({ p_session_id: id, p_status: 'abandoned' });
    });

    it('não envia nada depois que a partida terminou', () => {
      const { analytics, fetchFn } = setup();
      const id = analytics.startSession('beginner');
      analytics.finishSession(id, 10);
      analytics.markActiveAbandonedOnUnload();
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('ignora falha síncrona do fetch', () => {
      const { analytics } = setup({
        fetchFn: () => {
          throw new Error('bloqueado');
        },
      });
      analytics.startSession('beginner');
      expect(() => analytics.markActiveAbandonedOnUnload()).not.toThrow();
    });

    it('dispara em beforeunload e quando a aba fica oculta; o cleanup remove os listeners', () => {
      const { analytics, fetchFn } = setup();
      analytics.startSession('beginner');
      const cleanup = analytics.installUnloadHandlers(window);

      window.dispatchEvent(new Event('beforeunload'));
      expect(fetchFn).toHaveBeenCalledTimes(1);

      const visibility = vi.spyOn(document, 'visibilityState', 'get');
      visibility.mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fetchFn).toHaveBeenCalledTimes(1);

      visibility.mockReturnValue('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(fetchFn).toHaveBeenCalledTimes(2);

      cleanup();
      window.dispatchEvent(new Event('beforeunload'));
      expect(fetchFn).toHaveBeenCalledTimes(2);
      visibility.mockRestore();
    });
  });
});
