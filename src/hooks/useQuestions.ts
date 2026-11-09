import { useEffect, type Dispatch } from 'react';
import type { AppDeps } from '../appDeps';
import { drawQuestions } from '../game/draw';
import type { GameAction, GameState } from '../game/reducer';

export const LOAD_ERROR_MESSAGE = 'Não foi possível carregar as perguntas. Tente de novo.';

/**
 * While the game is `loading`, fetches the level's bank, draws a game and dispatches it.
 * The repo already falls back to the bundled JSON, so a rejection here is unexpected.
 */
export function useQuestions(
  state: GameState,
  dispatch: Dispatch<GameAction>,
  { repo, store, random }: Pick<AppDeps, 'repo' | 'store' | 'random'>,
): void {
  // null outside `loading`, so RESTART (result → loading, same level) re-runs the effect.
  const level = state.status === 'loading' ? state.level : null;

  useEffect(() => {
    if (!level) return;
    let cancelled = false; // GO_HOME, or the StrictMode remount, before the fetch resolves

    repo
      .getByLevel(level)
      .then((bank) => {
        if (cancelled) return;
        const questions = drawQuestions(bank, { avoidIds: store.readLastIds(level), random });
        const ids = questions.map((q) => q.id);
        if (ids.length > 0) store.writeLastIds(level, ids);
        dispatch({ type: 'QUESTIONS_LOADED', level, questions });
      })
      .catch((err: unknown) => {
        console.warn('[questions] falha ao carregar:', err);
        if (!cancelled) dispatch({ type: 'LOAD_FAILED', level, message: LOAD_ERROR_MESSAGE });
      });

    return () => {
      cancelled = true;
    };
  }, [level, repo, store, random, dispatch]);
}
