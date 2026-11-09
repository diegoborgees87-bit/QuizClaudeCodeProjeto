import { useEffect, useRef } from 'react';
import type { AppDeps } from '../appDeps';
import { isPlaying, type GameState } from '../game/reducer';
import type { Question } from '../schemas/question';

interface TrackedSession {
  id: string;
  /** Identity of the drawn game, so a new draw starts a new session. */
  questions: Question[];
  recorded: number;
  finished: boolean;
}

/**
 * Mirrors state transitions into analytics (PRD §5.5): a new game starts a session, each new
 * answer is recorded, the result finishes it, and leaving mid-game marks it abandoned.
 * Analytics is fire-and-forget, so nothing here can block or break the game.
 */
export function useGameAnalytics(state: GameState, analytics: AppDeps['analytics']): void {
  const session = useRef<TrackedSession | null>(null);

  useEffect(() => analytics.installUnloadHandlers(), [analytics]);

  useEffect(() => {
    if (isPlaying(state) || state.status === 'result') {
      let current = session.current;
      if (!current || current.questions !== state.questions) {
        current = {
          id: analytics.startSession(state.level),
          questions: state.questions,
          recorded: 0,
          finished: false,
        };
        session.current = current;
      }
      while (current.recorded < state.answers.length) {
        const answer = state.answers[current.recorded];
        current.recorded += 1;
        analytics.recordAnswer(current.id, { ...answer, position: current.recorded });
      }
      if (state.status === 'result' && !current.finished) {
        current.finished = true;
        analytics.finishSession(current.id, state.score);
      }
      return;
    }

    // idle, loading or error: a game left before the result is abandoned.
    const previous = session.current;
    if (previous && !previous.finished) analytics.abandonSession(previous.id);
    session.current = null;
  }, [state, analytics]);
}
