import bank from '../data/questions.json';
import {
  ID_PREFIX,
  LEVELS,
  parseQuestions,
  questionSchema,
  type Level,
} from '../src/schemas/question';

/**
 * Gates the size and balance rules (PRD §3.2). It was `false` while the bank held only the 12 sample
 * questions and was turned on in step 8, when the bank reached 90. The guard test below fails if the
 * bank has 90 questions while this is `false`, so the rules can't be silently skipped.
 */
const BANK_COMPLETE = true;

const MIN_PER_LEVEL = 30;
const MIN_TOTAL = 90;

const raw: unknown[] = bank;
const questions = parseQuestions(raw);
const active = questions.filter((q) => q.active);
const byLevel = (level: Level) => active.filter((q) => q.level === level);

describe('banco de perguntas (data/questions.json)', () => {
  it('todas as perguntas passam no schema Zod', () => {
    const failures = raw.flatMap((item, i) => {
      const r = questionSchema.safeParse(item);
      return r.success ? [] : [`#${i}: ${r.error.message}`];
    });
    expect(failures).toEqual([]);
  });

  it('IDs são únicos', () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('IDs seguem o padrão do nível', () => {
    for (const q of questions) {
      expect(q.id).toMatch(new RegExp(`^${ID_PREFIX[q.level]}-\\d{3}$`));
    }
  });

  it('statement ≤ 200 e explanation ≤ 400 caracteres', () => {
    for (const q of questions) {
      expect(q.statement.length).toBeLessThanOrEqual(200);
      expect(q.explanation.length).toBeLessThanOrEqual(400);
    }
  });

  it('docUrl, quando presente, é uma URL https válida', () => {
    for (const q of questions) {
      if (q.docUrl === undefined) continue;
      expect(new URL(q.docUrl).protocol).toBe('https:');
    }
  });

  it('todos os níveis têm pelo menos uma pergunta ativa', () => {
    for (const level of LEVELS) expect(byLevel(level).length).toBeGreaterThan(0);
  });

  it('BANK_COMPLETE é ativado quando o banco chega a 90 perguntas', () => {
    if (active.length >= MIN_TOTAL) expect(BANK_COMPLETE).toBe(true);
  });

  describe.skipIf(!BANK_COMPLETE)(
    'tamanho e balanceamento (PRD §3.2, ativo a partir do passo 8)',
    () => {
      it(`pelo menos ${MIN_TOTAL} perguntas ativas no total`, () => {
        expect(active.length).toBeGreaterThanOrEqual(MIN_TOTAL);
      });

      it.each(LEVELS)(`nível %s tem pelo menos ${MIN_PER_LEVEL} perguntas ativas`, (level) => {
        expect(byLevel(level).length).toBeGreaterThanOrEqual(MIN_PER_LEVEL);
      });

      it.each(LEVELS)('nível %s tem entre 45%% e 55%% de verdadeiras', (level) => {
        const qs = byLevel(level);
        const share = qs.filter((q) => q.answer).length / qs.length;
        expect(share).toBeGreaterThanOrEqual(0.45);
        expect(share).toBeLessThanOrEqual(0.55);
      });
    },
  );
});
