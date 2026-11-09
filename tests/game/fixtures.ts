import type { Level, Question } from '../../src/schemas/question';

const PREFIX: Record<Level, string> = { beginner: 'beg', intermediate: 'int', advanced: 'adv' };

export function makeQuestion(n: number, answer: boolean, level: Level = 'beginner'): Question {
  return {
    id: `${PREFIX[level]}-${String(n).padStart(3, '0')}`,
    level,
    statement: `Afirmação ${n}`,
    answer,
    explanation: `Explicação ${n}`,
    active: true,
  };
}

/** `trues` true questions followed by `falses` false ones, numbered from 1. */
export function makeBank(trues: number, falses: number, level: Level = 'beginner'): Question[] {
  return [
    ...Array.from({ length: trues }, (_, i) => makeQuestion(i + 1, true, level)),
    ...Array.from({ length: falses }, (_, i) => makeQuestion(trues + i + 1, false, level)),
  ];
}

/** Deterministic PRNG (mulberry32) so failures reproduce. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
