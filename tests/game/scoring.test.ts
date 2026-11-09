import {
  buildAnswer,
  isCorrect,
  percent,
  RESULT_MESSAGES,
  resultMessage,
  resultTier,
  scoreAnswers,
} from '../../src/game/scoring';
import { makeQuestion } from './fixtures';

describe('scoring', () => {
  const q = makeQuestion(1, true);

  it('acerto vale 1, erro vale 0', () => {
    expect(isCorrect(q, true)).toBe(true);
    expect(isCorrect(q, false)).toBe(false);
    expect(isCorrect(makeQuestion(2, false), false)).toBe(true);
  });

  it('tempo esgotado conta como erro', () => {
    expect(isCorrect(q, null)).toBe(false);
    expect(buildAnswer(q, null, 30_000)).toEqual({
      questionId: 'beg-001',
      userAnswer: null,
      isCorrect: false,
      timedOut: true,
      responseTimeMs: 30_000,
    });
  });

  it('buildAnswer arredonda o tempo e não aceita negativo', () => {
    expect(buildAnswer(q, true, 1234.6)).toMatchObject({
      isCorrect: true,
      timedOut: false,
      responseTimeMs: 1235,
    });
    expect(buildAnswer(q, true, -5).responseTimeMs).toBe(0);
  });

  it('soma 1 ponto por acerto', () => {
    const answers = [buildAnswer(q, true, 1), buildAnswer(q, false, 1), buildAnswer(q, null, 1)];
    expect(scoreAnswers(answers)).toBe(1);
    expect(scoreAnswers([])).toBe(0);
  });

  it('percentual', () => {
    expect(percent(7, 10)).toBe(70);
    expect(percent(2, 3)).toBe(67);
    expect(percent(0, 0)).toBe(0);
  });

  it.each([
    [0, 'start'],
    [4, 'start'],
    [5, 'good'],
    [7, 'good'],
    [8, 'excellent'],
    [10, 'excellent'],
  ] as const)('%i/10 → faixa %s', (score, tier) => {
    expect(resultTier(score, 10)).toBe(tier);
    expect(resultMessage(score, 10)).toBe(RESULT_MESSAGES[tier]);
  });

  it('faixa com total 0 é "start"', () => {
    expect(resultTier(0, 0)).toBe('start');
  });
});
