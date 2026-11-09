import type { SupabaseClient } from '@supabase/supabase-js';
import bundledQuestions from '../../data/questions.json';
import { parseQuestions, type Level, type Question } from '../schemas/question';
import { getSupabase, type ClientSource } from './supabase';

export const QUESTIONS_TIMEOUT_MS = 3000;
/** Below this many valid rows a game can't be drawn, so the bundled JSON is used instead. */
export const MIN_QUESTIONS_FOR_GAME = 10;

/** Row shape of `public.questions` (snake_case in the DB). */
export interface QuestionRow {
  id: string;
  level: string;
  statement: string;
  answer: boolean;
  explanation: string;
  doc_url: string | null;
  topic: string | null;
  active: boolean;
}

const COLUMNS = 'id, level, statement, answer, explanation, doc_url, topic, active';

/** DB row → app shape. Nulls become undefined so the optional Zod fields accept them. */
export function rowToQuestion(row: QuestionRow): Record<string, unknown> {
  return {
    id: row.id,
    level: row.level,
    statement: row.statement,
    answer: row.answer,
    explanation: row.explanation,
    docUrl: row.doc_url ?? undefined,
    topic: row.topic ?? undefined,
    active: row.active,
  };
}

export interface QuestionsRepoDeps {
  getClient: ClientSource;
  fallback: unknown;
  timeoutMs: number;
}

export function createQuestionsRepo({ getClient, fallback, timeoutMs }: QuestionsRepoDeps) {
  function fromFallback(level: Level): Question[] {
    return parseQuestions(fallback).filter((q) => q.level === level && q.active);
  }

  /** Rejects when `signal` aborts first, so a slow lazy load of supabase-js counts toward the timeout. */
  function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
      promise.then(resolve, reject);
    });
  }

  /** null when Supabase isn't configured. The timeout covers loading the client and the query. */
  async function fromSupabase(level: Level): Promise<Question[] | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const client: SupabaseClient | null = await untilAborted(
        Promise.resolve(getClient()),
        controller.signal,
      );
      if (!client) return null;
      const { data, error } = await client
        .from('questions')
        .select(COLUMNS)
        .eq('level', level)
        .eq('active', true)
        .abortSignal(controller.signal);
      if (error) throw error;
      return parseQuestions((data as QuestionRow[]).map(rowToQuestion)).filter(
        (q) => q.level === level && q.active,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /**
     * Active questions of a level from Supabase, with a 3s timeout. On any failure, missing env
     * config, or too few valid rows, returns the bundled `data/questions.json`. Never throws.
     */
    async getByLevel(level: Level): Promise<Question[]> {
      try {
        const questions = await fromSupabase(level);
        if (questions === null) return fromFallback(level);
        if (questions.length >= MIN_QUESTIONS_FOR_GAME) return questions;
        console.warn(
          `[questions] Supabase retornou ${questions.length} perguntas válidas para "${level}"; usando o JSON local.`,
        );
      } catch (err) {
        console.warn('[questions] falha ao buscar no Supabase; usando o JSON local:', err);
      }
      return fromFallback(level);
    },
  };
}

export const questionsRepo = createQuestionsRepo({
  getClient: getSupabase,
  fallback: bundledQuestions,
  timeoutMs: QUESTIONS_TIMEOUT_MS,
});
