import {
  drawQuestions,
  MAX_TRUE,
  MIN_TRUE,
  QUESTIONS_PER_GAME,
  shuffle,
} from '../../src/game/draw';
import { makeBank, makeQuestion, seeded } from './fixtures';

const trueCount = (qs: { answer: boolean }[]) => qs.filter((q) => q.answer).length;
const ids = (qs: { id: string }[]) => qs.map((q) => q.id);

describe('shuffle', () => {
  it('não altera o array original e mantém os mesmos itens', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seeded(1));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(input);
  });
});

describe('drawQuestions', () => {
  it('retorna 10 perguntas únicas, todas do nível, com 4 a 6 verdadeiras', () => {
    const bank = makeBank(15, 15);
    for (let seed = 1; seed <= 200; seed++) {
      const drawn = drawQuestions(bank, { random: seeded(seed) });
      expect(drawn).toHaveLength(QUESTIONS_PER_GAME);
      expect(new Set(ids(drawn)).size).toBe(QUESTIONS_PER_GAME);
      expect(drawn.every((q) => q.level === 'beginner')).toBe(true);
      expect(trueCount(drawn)).toBeGreaterThanOrEqual(MIN_TRUE);
      expect(trueCount(drawn)).toBeLessThanOrEqual(MAX_TRUE);
    }
  });

  it('varia o número de verdadeiras entre 4, 5 e 6', () => {
    const bank = makeBank(15, 15);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 100; seed++)
      seen.add(trueCount(drawQuestions(bank, { random: seeded(seed) })));
    expect([...seen].sort()).toEqual([4, 5, 6]);
  });

  it('evita os IDs da última partida quando o banco permite', () => {
    const bank = makeBank(15, 15);
    const last = ids(drawQuestions(bank, { random: seeded(7) }));
    for (let seed = 1; seed <= 50; seed++) {
      const drawn = drawQuestions(bank, { avoidIds: last, random: seeded(seed) });
      expect(ids(drawn).filter((id) => last.includes(id))).toEqual([]);
    }
  });

  it('escolhe a proporção que menos repete a última partida', () => {
    // 8 verdadeiras (5 recentes) e 12 falsas (5 recentes): só 3 verdadeiras novas, então
    // nenhuma partida de 4–6 é 100% nova. Com 4 verdadeiras repete só 1, o mínimo possível.
    const bank = makeBank(8, 12);
    const last = ['beg-001', 'beg-002', 'beg-003', 'beg-004', 'beg-005', ...ids(bank.slice(8, 13))];
    for (let seed = 1; seed <= 50; seed++) {
      const drawn = drawQuestions(bank, { avoidIds: last, random: seeded(seed) });
      expect(trueCount(drawn)).toBe(MIN_TRUE);
      expect(drawn.filter((q) => last.includes(q.id))).toHaveLength(1);
    }
  });

  it('prefere a proporção 100% nova quando existe', () => {
    // 10 verdadeiras (5 recentes) e 10 falsas (todas novas): só 4 ou 5 verdadeiras evitam repetir.
    const bank = makeBank(10, 10);
    const last = ids(bank.slice(0, 5));
    for (let seed = 1; seed <= 50; seed++) {
      const drawn = drawQuestions(bank, { avoidIds: last, random: seeded(seed) });
      expect(drawn.filter((q) => last.includes(q.id))).toEqual([]);
      expect(trueCount(drawn)).toBeLessThanOrEqual(5);
    }
  });

  it('repete perguntas da última partida quando o banco não tem outras', () => {
    const bank = makeBank(6, 6);
    const last = ids(bank.slice(0, 10));
    const drawn = drawQuestions(bank, { avoidIds: last, random: seeded(3) });
    expect(drawn).toHaveLength(10);
    // As 2 perguntas novas sempre entram.
    expect(ids(drawn)).toEqual(expect.arrayContaining(['beg-011', 'beg-012']));
  });

  it('funciona com o banco no limite mínimo (exatamente 10, 5/5)', () => {
    const bank = makeBank(5, 5);
    const drawn = drawQuestions(bank, { random: seeded(9) });
    expect(ids(drawn).sort()).toEqual(ids(bank).sort());
  });

  it('funciona com 10 perguntas desbalanceadas no limite (4 verdadeiras)', () => {
    const drawn = drawQuestions(makeBank(4, 6), { random: seeded(2) });
    expect(drawn).toHaveLength(10);
    expect(trueCount(drawn)).toBe(4);
  });

  it('com banco desbalanceado demais, chega o mais perto possível da metade', () => {
    const drawn = drawQuestions(makeBank(2, 20), { random: seeded(4) });
    expect(drawn).toHaveLength(10);
    expect(trueCount(drawn)).toBe(2);
  });

  it('com menos de 10 perguntas, retorna todas e mantém o balanço proporcional', () => {
    const drawn = drawQuestions(makeBank(3, 3), { random: seeded(5) });
    expect(drawn).toHaveLength(6);
    expect(trueCount(drawn)).toBe(3);
  });

  it('ignora IDs duplicados no banco', () => {
    const bank = [...makeBank(5, 5), makeQuestion(1, true)];
    const drawn = drawQuestions(bank, { random: seeded(6) });
    expect(new Set(ids(drawn)).size).toBe(10);
  });

  it('retorna vazio para banco vazio ou count 0', () => {
    expect(drawQuestions([])).toEqual([]);
    expect(drawQuestions(makeBank(5, 5), { count: 0 })).toEqual([]);
  });

  it('usa Math.random por padrão', () => {
    expect(drawQuestions(makeBank(10, 10))).toHaveLength(10);
  });
});
