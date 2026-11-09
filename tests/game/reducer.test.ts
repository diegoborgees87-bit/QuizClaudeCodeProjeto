import {
  currentAnswer,
  currentQuestion,
  gameReducer,
  initialState,
  isPlaying,
  NO_QUESTIONS_MESSAGE,
  QUESTION_DURATION_MS,
  type GameAction,
  type GameState,
} from '../../src/game/reducer';
import { makeBank } from './fixtures';

const questions = makeBank(5, 5);
const run = (actions: GameAction[], from: GameState = initialState) =>
  actions.reduce(gameReducer, from);

const loading = run([{ type: 'SELECT_LEVEL', level: 'beginner' }]);
const playing = run([{ type: 'QUESTIONS_LOADED', level: 'beginner', questions }], loading);
const feedback = run([{ type: 'ANSWER', answer: true, responseTimeMs: 1200 }], playing);

/** Answers every question with `true` and advances to the result. */
function playToEnd(): GameState {
  let s = playing;
  for (let i = 0; i < questions.length; i++) {
    s = run([{ type: 'ANSWER', answer: true, responseTimeMs: 1000 }, { type: 'NEXT' }], s);
  }
  return s;
}

describe('gameReducer', () => {
  it('idle → loading ao escolher nível', () => {
    expect(loading).toEqual({ status: 'loading', level: 'beginner' });
  });

  it('loading → question quando as perguntas chegam', () => {
    expect(playing).toEqual({
      status: 'question',
      level: 'beginner',
      questions,
      index: 0,
      answers: [],
    });
    expect(currentQuestion(playing)).toBe(questions[0]);
    expect(isPlaying(playing)).toBe(true);
  });

  it('loading → error quando a carga falha', () => {
    const s = run([{ type: 'LOAD_FAILED', level: 'beginner', message: 'falhou' }], loading);
    expect(s).toEqual({ status: 'error', level: 'beginner', message: 'falhou' });
  });

  it('loading → error quando não há perguntas', () => {
    const s = run([{ type: 'QUESTIONS_LOADED', level: 'beginner', questions: [] }], loading);
    expect(s).toEqual({ status: 'error', level: 'beginner', message: NO_QUESTIONS_MESSAGE });
  });

  it('ignora carga de outro nível (resposta atrasada)', () => {
    expect(gameReducer(loading, { type: 'QUESTIONS_LOADED', level: 'advanced', questions })).toBe(
      loading,
    );
    expect(gameReducer(loading, { type: 'LOAD_FAILED', level: 'advanced', message: 'x' })).toBe(
      loading,
    );
  });

  it('question → feedback ao responder, registrando a resposta', () => {
    expect(feedback).toMatchObject({ status: 'feedback', index: 0 });
    expect(currentAnswer(feedback)).toEqual({
      questionId: 'beg-001',
      userAnswer: true,
      isCorrect: true,
      timedOut: false,
      responseTimeMs: 1200,
    });
    expect(currentQuestion(feedback)).toBe(questions[0]);
  });

  it('limita o tempo de resposta à duração da pergunta', () => {
    const s = run([{ type: 'ANSWER', answer: false, responseTimeMs: 99_999 }], playing);
    expect(currentAnswer(s)).toMatchObject({
      isCorrect: false,
      responseTimeMs: QUESTION_DURATION_MS,
    });
  });

  it('timeout vai direto para o feedback e conta como erro', () => {
    const s = run([{ type: 'TIMEOUT' }], playing);
    expect(s.status).toBe('feedback');
    expect(currentAnswer(s)).toEqual({
      questionId: 'beg-001',
      userAnswer: null,
      isCorrect: false,
      timedOut: true,
      responseTimeMs: QUESTION_DURATION_MS,
    });
  });

  it('ignora ANSWER e TIMEOUT durante o feedback (sem resposta dupla)', () => {
    expect(gameReducer(feedback, { type: 'ANSWER', answer: false, responseTimeMs: 1 })).toBe(
      feedback,
    );
    expect(gameReducer(feedback, { type: 'TIMEOUT' })).toBe(feedback);
  });

  it('feedback → próxima pergunta com NEXT', () => {
    const s = run([{ type: 'NEXT' }], feedback);
    expect(s).toMatchObject({ status: 'question', index: 1 });
    expect(currentQuestion(s)).toBe(questions[1]);
    expect(currentAnswer(s)).toBeNull();
  });

  it('NEXT após a última pergunta vai para o resultado com a pontuação', () => {
    const s = playToEnd();
    expect(s.status).toBe('result');
    if (s.status !== 'result') return;
    expect(s.answers).toHaveLength(10);
    expect(s.score).toBe(5); // 5 verdadeiras respondidas com "Verdadeiro"
    expect(currentQuestion(s)).toBeNull();
    expect(isPlaying(s)).toBe(false);
  });

  it('result → loading no mesmo nível com RESTART', () => {
    expect(run([{ type: 'RESTART' }], playToEnd())).toEqual({
      status: 'loading',
      level: 'beginner',
    });
  });

  it('error → loading com RESTART (tentar de novo)', () => {
    const error = run([{ type: 'LOAD_FAILED', level: 'beginner', message: 'x' }], loading);
    expect(run([{ type: 'RESTART' }], error)).toEqual({ status: 'loading', level: 'beginner' });
  });

  it('error → loading ao escolher outro nível', () => {
    const error = run([{ type: 'LOAD_FAILED', level: 'beginner', message: 'x' }], loading);
    expect(run([{ type: 'SELECT_LEVEL', level: 'advanced' }], error)).toEqual({
      status: 'loading',
      level: 'advanced',
    });
  });

  it.each([
    ['loading', loading],
    ['question', playing],
    ['feedback', feedback],
    ['result', playToEnd()],
  ])('GO_HOME a partir de %s volta para idle', (_, s) => {
    expect(gameReducer(s, { type: 'GO_HOME' })).toEqual(initialState);
  });

  it('ações fora de contexto não mudam o estado', () => {
    const cases: [GameState, GameAction][] = [
      [initialState, { type: 'GO_HOME' }],
      [initialState, { type: 'NEXT' }],
      [initialState, { type: 'RESTART' }],
      [initialState, { type: 'TIMEOUT' }],
      [initialState, { type: 'QUESTIONS_LOADED', level: 'beginner', questions }],
      [initialState, { type: 'LOAD_FAILED', level: 'beginner', message: 'x' }],
      [loading, { type: 'SELECT_LEVEL', level: 'advanced' }],
      [loading, { type: 'ANSWER', answer: true, responseTimeMs: 1 }],
      [playing, { type: 'NEXT' }],
      [playing, { type: 'RESTART' }],
      [playing, { type: 'SELECT_LEVEL', level: 'advanced' }],
      [feedback, { type: 'QUESTIONS_LOADED', level: 'beginner', questions }],
    ];
    for (const [state, action] of cases) expect(gameReducer(state, action)).toBe(state);
  });
});
