import type { Question } from '../schemas/question';

export const QUESTIONS_PER_GAME = 10;
export const MIN_TRUE = 4;
export const MAX_TRUE = 6;

export interface DrawOptions {
  /** Defaults to {@link QUESTIONS_PER_GAME}. */
  count?: number;
  /** IDs from the previous game of the same level; avoided when the bank allows. */
  avoidIds?: readonly string[];
  /** Injectable for tests. Must return a number in [0, 1). */
  random?: () => number;
}

/** Fisher–Yates on a copy. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/**
 * Balanced draw (PRD §4.3): `count` unique questions with between 4 and 6 true answers, avoiding
 * `avoidIds` when the bank has enough other questions.
 *
 * When the bank is too small for the rules (fewer than `count` questions, or too few of one
 * answer), it degrades instead of failing: it returns as many questions as it can, with the true
 * count as close to half as the bank allows. Callers decide whether the result is playable.
 */
export function drawQuestions(pool: readonly Question[], options: DrawOptions = {}): Question[] {
  const { avoidIds = [], random = Math.random } = options;
  const unique = [...new Map(pool.map((q) => [q.id, q])).values()];
  const count = Math.min(options.count ?? QUESTIONS_PER_GAME, unique.length);
  if (count <= 0) return [];

  const avoid = new Set(avoidIds);
  const trues = unique.filter((q) => q.answer);
  const falses = unique.filter((q) => !q.answer);
  const freshTrue = trues.filter((q) => !avoid.has(q.id)).length;
  const freshFalse = falses.filter((q) => !avoid.has(q.id)).length;

  // Every true count the bank can satisfy for this game size.
  const lo = Math.max(0, count - falses.length);
  const hi = Math.min(count, trues.length);
  const feasible: number[] = [];
  for (let t = lo; t <= hi; t++) feasible.push(t);

  // Scale the 4–6 rule to the game size (identical for 10), then keep the ones the bank allows.
  const minTrue = Math.round((count * MIN_TRUE) / QUESTIONS_PER_GAME);
  const maxTrue = Math.round((count * MAX_TRUE) / QUESTIONS_PER_GAME);
  const balanced = feasible.filter((t) => t >= minTrue && t <= maxTrue);

  let trueCount: number;
  if (balanced.length > 0) {
    // Among the balanced splits, keep the ones that repeat the fewest recent questions.
    const repeats = (t: number) => Math.max(0, t - freshTrue) + Math.max(0, count - t - freshFalse);
    const fewest = Math.min(...balanced.map(repeats));
    trueCount = pick(
      balanced.filter((t) => repeats(t) === fewest),
      random,
    );
  } else {
    // Bank can't be balanced: take the feasible count closest to half.
    const half = count / 2;
    trueCount = feasible.reduce((best, t) =>
      Math.abs(t - half) < Math.abs(best - half) ? t : best,
    );
  }

  const take = (group: Question[], n: number) => {
    const fresh = shuffle(
      group.filter((q) => !avoid.has(q.id)),
      random,
    );
    const stale = shuffle(
      group.filter((q) => avoid.has(q.id)),
      random,
    );
    return [...fresh, ...stale].slice(0, n);
  };

  return shuffle([...take(trues, trueCount), ...take(falses, count - trueCount)], random);
}
