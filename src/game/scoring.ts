import type { Question } from '../schemas/question';

/** One answered (or timed-out) question of a game. */
export interface AnswerRecord {
  questionId: string;
  /** null when the timer ran out */
  userAnswer: boolean | null;
  isCorrect: boolean;
  timedOut: boolean;
  responseTimeMs: number;
}

/** A timeout (`null`) is always wrong (PRD §4.3). */
export function isCorrect(question: Pick<Question, 'answer'>, userAnswer: boolean | null): boolean {
  return userAnswer !== null && userAnswer === question.answer;
}

export function buildAnswer(
  question: Pick<Question, 'id' | 'answer'>,
  userAnswer: boolean | null,
  responseTimeMs: number,
): AnswerRecord {
  return {
    questionId: question.id,
    userAnswer,
    isCorrect: isCorrect(question, userAnswer),
    timedOut: userAnswer === null,
    responseTimeMs: Math.max(0, Math.round(responseTimeMs)),
  };
}

/** 1 point per correct answer; wrong or timeout = 0. */
export function scoreAnswers(answers: readonly Pick<AnswerRecord, 'isCorrect'>[]): number {
  return answers.reduce((sum, a) => sum + (a.isCorrect ? 1 : 0), 0);
}

export function percent(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

export type ResultTier = 'start' | 'good' | 'excellent';

/**
 * PRD §4.2 bands for a 10-question game: 0–4, 5–7, 8–10. Computed on the percentage so a shorter
 * game (small bank) still lands in the matching band.
 */
export function resultTier(score: number, total: number): ResultTier {
  const p = total > 0 ? score / total : 0;
  if (p >= 0.8) return 'excellent';
  if (p >= 0.5) return 'good';
  return 'start';
}

export const RESULT_MESSAGES: Record<ResultTier, string> = {
  start: 'Bom começo! Revise as explicações e tente de novo.',
  good: 'Mandou bem! Você já entende o essencial.',
  excellent: 'Excelente! Que tal tentar o próximo nível?',
};

export function resultMessage(score: number, total: number): string {
  return RESULT_MESSAGES[resultTier(score, total)];
}
