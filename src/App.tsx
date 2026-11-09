import { useCallback, useReducer, useState } from 'react';
import { defaultDeps, type AppDeps } from './appDeps';
import { gameReducer, initialState } from './game/reducer';
import { scoreAnswers } from './game/scoring';
import { useBestScores } from './hooks/useBestScores';
import { useGameAnalytics } from './hooks/useGameAnalytics';
import { useQuestions } from './hooks/useQuestions';
import type { Level } from './schemas/question';
import { HomeScreen } from './screens/HomeScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ErrorScreen, LoadingScreen } from './screens/StatusScreens';

interface Props {
  /** Test seam. Production uses {@link defaultDeps}. */
  deps?: Partial<AppDeps>;
}

/** Owns the only game reducer. The screen is derived from `state.status`, with no router. */
export default function App({ deps }: Props) {
  // Frozen on mount so the hooks' effects don't restart on every render.
  const [resolved] = useState<AppDeps>(() => ({ ...defaultDeps, ...deps }));
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useQuestions(state, dispatch, resolved);
  useGameAnalytics(state, resolved.analytics);
  const { best, record } = useBestScores(resolved.store);

  const selectLevel = useCallback((level: Level) => dispatch({ type: 'SELECT_LEVEL', level }), []);
  const answer = useCallback(
    (value: boolean, responseTimeMs: number) =>
      dispatch({ type: 'ANSWER', answer: value, responseTimeMs }),
    [],
  );
  const timeout = useCallback(() => dispatch({ type: 'TIMEOUT' }), []);
  const restart = useCallback(() => dispatch({ type: 'RESTART' }), []);
  const goHome = useCallback(() => dispatch({ type: 'GO_HOME' }), []);
  const next = useCallback(() => {
    // Leaving the last feedback ends the game: save the best score from the event, not an effect.
    if (state.status === 'feedback' && state.index === state.questions.length - 1) {
      record(state.level, scoreAnswers(state.answers));
    }
    dispatch({ type: 'NEXT' });
  }, [state, record]);

  switch (state.status) {
    case 'idle':
      return <HomeScreen best={best} onSelectLevel={selectLevel} />;
    case 'loading':
      return <LoadingScreen />;
    case 'question':
    case 'feedback':
      return (
        <QuizScreen
          state={state}
          onAnswer={answer}
          onTimeout={timeout}
          onNext={next}
          onQuit={goHome}
        />
      );
    case 'result':
      return <ResultScreen state={state} onRestart={restart} onHome={goHome} />;
    case 'error':
      return <ErrorScreen message={state.message} onRetry={restart} onHome={goHome} />;
  }
}
