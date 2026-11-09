import type { Level, Question } from './schemas/question';
import { analytics, type Analytics } from './services/analytics';
import { localStore, type LocalStore } from './services/localStore';
import { questionsRepo } from './services/questionsRepo';

/** Everything the app does I/O or randomness with. Injected so tests run without Supabase. */
export interface AppDeps {
  repo: { getByLevel: (level: Level) => Promise<Question[]> };
  analytics: Pick<
    Analytics,
    'startSession' | 'recordAnswer' | 'finishSession' | 'abandonSession' | 'installUnloadHandlers'
  >;
  store: LocalStore;
  random: () => number;
}

export const defaultDeps: AppDeps = {
  repo: questionsRepo,
  analytics,
  store: localStore,
  random: Math.random,
};
