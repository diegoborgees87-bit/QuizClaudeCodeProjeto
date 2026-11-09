import type { Level, Question } from '../schemas/question';
import { buildAnswer, scoreAnswers, type AnswerRecord } from './scoring';

export const QUESTION_DURATION_MS = 30_000;

/**
 * Game state machine (PRD §5.6). Screens are derived from `status`:
 *
 *   idle ─SELECT_LEVEL→ loading ─QUESTIONS_LOADED→ question ─ANSWER|TIMEOUT→ feedback
 *                          └─LOAD_FAILED→ error      ▲───────────NEXT───────────┤
 *                                                                               ▼ after the last
 *                                                     result ─RESTART→ loading / ─GO_HOME→ idle
 *
 * The reducer is pure. Loading, drawing, the timer and analytics live outside it. Actions that
 * don't apply to the current status return the same state object (no re-render).
 */
export type GameState =
  | { status: 'idle' }
  | { status: 'loading'; level: Level }
  | { status: 'error'; level: Level; message: string }
  | {
      status: 'question' | 'feedback';
      level: Level;
      questions: Question[];
      /** Index of the current question. */
      index: number;
      /** In `feedback`, the last item is the answer to the current question. */
      answers: AnswerRecord[];
    }
  | {
      status: 'result';
      level: Level;
      questions: Question[];
      answers: AnswerRecord[];
      score: number;
    };

export type GameAction =
  | { type: 'SELECT_LEVEL'; level: Level }
  | { type: 'QUESTIONS_LOADED'; level: Level; questions: Question[] }
  | { type: 'LOAD_FAILED'; level: Level; message: string }
  | { type: 'ANSWER'; answer: boolean; responseTimeMs: number }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT' }
  | { type: 'RESTART' }
  | { type: 'GO_HOME' };

export type PlayingState = Extract<GameState, { status: 'question' | 'feedback' }>;

export const initialState: GameState = { status: 'idle' };

export const NO_QUESTIONS_MESSAGE = 'Não encontramos perguntas para este nível.';

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_LEVEL':
      if (state.status !== 'idle' && state.status !== 'error') return state;
      return { status: 'loading', level: action.level };

    case 'QUESTIONS_LOADED':
      // A stale load (user went home or picked another level meanwhile) is ignored.
      if (state.status !== 'loading' || state.level !== action.level) return state;
      if (action.questions.length === 0) {
        return { status: 'error', level: state.level, message: NO_QUESTIONS_MESSAGE };
      }
      return {
        status: 'question',
        level: state.level,
        questions: action.questions,
        index: 0,
        answers: [],
      };

    case 'LOAD_FAILED':
      if (state.status !== 'loading' || state.level !== action.level) return state;
      return { status: 'error', level: state.level, message: action.message };

    case 'ANSWER':
    case 'TIMEOUT': {
      if (state.status !== 'question') return state;
      const question = state.questions[state.index];
      const record =
        action.type === 'ANSWER'
          ? buildAnswer(
              question,
              action.answer,
              Math.min(action.responseTimeMs, QUESTION_DURATION_MS),
            )
          : buildAnswer(question, null, QUESTION_DURATION_MS);
      return { ...state, status: 'feedback', answers: [...state.answers, record] };
    }

    case 'NEXT': {
      if (state.status !== 'feedback') return state;
      const nextIndex = state.index + 1;
      if (nextIndex < state.questions.length) {
        return { ...state, status: 'question', index: nextIndex };
      }
      return {
        status: 'result',
        level: state.level,
        questions: state.questions,
        answers: state.answers,
        score: scoreAnswers(state.answers),
      };
    }

    case 'RESTART':
      // Same level, new draw. Also the "try again" from the error screen.
      if (state.status !== 'result' && state.status !== 'error') return state;
      return { status: 'loading', level: state.level };

    case 'GO_HOME':
      return state.status === 'idle' ? state : initialState;
  }
}

export function isPlaying(state: GameState): state is PlayingState {
  return state.status === 'question' || state.status === 'feedback';
}

export function currentQuestion(state: GameState): Question | null {
  return isPlaying(state) ? state.questions[state.index] : null;
}

/** The answer shown in feedback; null outside feedback. */
export function currentAnswer(state: GameState): AnswerRecord | null {
  return state.status === 'feedback' ? (state.answers[state.answers.length - 1] ?? null) : null;
}
