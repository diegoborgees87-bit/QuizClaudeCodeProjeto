import { useCallback, useState } from 'react';
import type { Level } from '../schemas/question';
import type { BestScores, LocalStore } from '../services/localStore';

/** Best score per level, read once from localStorage and kept in sync when a game ends. */
export function useBestScores(store: LocalStore): {
  best: BestScores;
  record: (level: Level, score: number) => void;
} {
  const [best, setBest] = useState<BestScores>(() => store.readAllBest());

  const record = useCallback(
    (level: Level, score: number) => {
      // Updated even when storage is blocked, so the home screen still shows it this session.
      setBest((current) => {
        const previous = current[level];
        return previous !== null && previous >= score ? current : { ...current, [level]: score };
      });
      store.writeBest(level, score);
    },
    [store],
  );

  return { best, record };
}
