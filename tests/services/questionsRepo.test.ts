import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createQuestionsRepo,
  rowToQuestion,
  type QuestionRow,
} from '../../src/services/questionsRepo';

const row = (n: number, level = 'beginner', prefix = 'beg'): QuestionRow => ({
  id: `${prefix}-${String(n).padStart(3, '0')}`,
  level,
  statement: `Afirmação ${n}`,
  answer: n % 2 === 0,
  explanation: `Explicação ${n}`,
  doc_url: null,
  topic: null,
  active: true,
});
const rows = (count: number) => Array.from({ length: count }, (_, i) => row(i + 1));

const fallback = [
  { ...rowToQuestion(row(901)), id: 'beg-901' },
  { ...rowToQuestion({ ...row(1, 'advanced', 'adv') }) },
  { ...rowToQuestion(row(902)), active: false },
];

type Result = { data: unknown; error: unknown };

/** Minimal stand-in for the supabase-js query builder used by the repo. */
function fakeClient(respond: (signal: AbortSignal) => Promise<Result>) {
  const calls: { table?: string; eq: [string, unknown][] } = { eq: [] };
  const builder = {
    select: () => builder,
    eq: (col: string, value: unknown) => {
      calls.eq.push([col, value]);
      return builder;
    },
    abortSignal: (signal: AbortSignal) => respond(signal),
  };
  const client = {
    from: (table: string) => {
      calls.table = table;
      return builder;
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

function repoWith(client: SupabaseClient | null, timeoutMs = 3000) {
  return createQuestionsRepo({ getClient: () => client, fallback, timeoutMs });
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  vi.useRealTimers();
});

describe('questionsRepo.getByLevel', () => {
  it('retorna as perguntas do Supabase, filtrando por nível e ativas', async () => {
    const { client, calls } = fakeClient(async () => ({ data: rows(12), error: null }));
    const result = await repoWith(client).getByLevel('beginner');
    expect(result).toHaveLength(12);
    expect(calls.table).toBe('questions');
    expect(calls.eq).toEqual([
      ['level', 'beginner'],
      ['active', true],
    ]);
  });

  it('converte doc_url para docUrl', async () => {
    const data = rows(10).map((r) => ({
      ...r,
      doc_url: 'https://code.claude.com/docs/en/overview',
    }));
    const { client } = fakeClient(async () => ({ data, error: null }));
    const [first] = await repoWith(client).getByLevel('beginner');
    expect(first.docUrl).toBe('https://code.claude.com/docs/en/overview');
  });

  it('usa o JSON local quando não há configuração do Supabase', async () => {
    const result = await repoWith(null).getByLevel('beginner');
    expect(result.map((q) => q.id)).toEqual(['beg-901']);
  });

  it('usa o JSON local quando o Supabase retorna erro', async () => {
    const { client } = fakeClient(async () => ({ data: null, error: { message: 'boom' } }));
    const result = await repoWith(client).getByLevel('beginner');
    expect(result.map((q) => q.id)).toEqual(['beg-901']);
    expect(warn).toHaveBeenCalled();
  });

  it('usa o JSON local quando a chamada rejeita', async () => {
    const { client } = fakeClient(() => Promise.reject(new Error('rede')));
    const result = await repoWith(client).getByLevel('beginner');
    expect(result.map((q) => q.id)).toEqual(['beg-901']);
  });

  it('usa o JSON local após o timeout de 3s', async () => {
    vi.useFakeTimers();
    const { client } = fakeClient(
      (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const pending = repoWith(client, 3000).getByLevel('beginner');
    await vi.advanceTimersByTimeAsync(3000);
    expect((await pending).map((q) => q.id)).toEqual(['beg-901']);
  });

  it('usa o JSON local quando o Supabase tem menos de 10 perguntas válidas', async () => {
    const data = [...rows(9), { ...row(10), statement: 'x'.repeat(201) }];
    const { client } = fakeClient(async () => ({ data, error: null }));
    const result = await repoWith(client).getByLevel('beginner');
    expect(result.map((q) => q.id)).toEqual(['beg-901']);
  });

  it('descarta linhas inválidas mas mantém o resultado do Supabase se sobrarem 10', async () => {
    const data = [...rows(10), { ...row(11), id: 'invalido' }];
    const { client } = fakeClient(async () => ({ data, error: null }));
    const result = await repoWith(client).getByLevel('beginner');
    expect(result).toHaveLength(10);
  });
});
