import { parseQuestions, questionSchema } from '../src/schemas/question';

const valid = {
  id: 'beg-001',
  level: 'beginner',
  statement: 'Afirmação de teste.',
  answer: true,
  explanation: 'Explicação de teste.',
  docUrl: 'https://code.claude.com/docs/en/overview',
  topic: 'fundamentos',
  active: true,
};

describe('questionSchema', () => {
  it('aceita uma pergunta válida', () => {
    expect(questionSchema.safeParse(valid).success).toBe(true);
  });

  it('docUrl e topic são opcionais e active tem padrão true', () => {
    const minimal: Record<string, unknown> = { ...valid };
    delete minimal.docUrl;
    delete minimal.topic;
    delete minimal.active;
    const r = questionSchema.parse(minimal);
    expect(r.active).toBe(true);
    expect(r.docUrl).toBeUndefined();
  });

  it.each([
    ['id fora do padrão', { id: 'beg-1' }],
    ['prefixo do id diferente do nível', { id: 'adv-001' }],
    ['nível desconhecido', { level: 'expert' }],
    ['statement vazio', { statement: '   ' }],
    ['statement com mais de 200 caracteres', { statement: 'a'.repeat(201) }],
    ['explanation com mais de 400 caracteres', { explanation: 'a'.repeat(401) }],
    ['answer não booleano', { answer: 'true' }],
    ['docUrl http', { docUrl: 'http://code.claude.com/docs' }],
    ['docUrl inválida', { docUrl: 'não é url' }],
  ])('rejeita %s', (_label, patch) => {
    expect(questionSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it('aceita os limites exatos de 200 e 400 caracteres', () => {
    const r = questionSchema.safeParse({
      ...valid,
      statement: 'a'.repeat(200),
      explanation: 'b'.repeat(400),
    });
    expect(r.success).toBe(true);
  });
});

describe('parseQuestions', () => {
  it('descarta itens inválidos com console.warn e mantém os válidos', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = parseQuestions([valid, { ...valid, id: 'xyz' }, null]);
    expect(result.map((q) => q.id)).toEqual(['beg-001']);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('retorna lista vazia para entrada que não é array', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseQuestions({ not: 'array' })).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
