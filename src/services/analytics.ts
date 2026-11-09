import type { SupabaseClient } from '@supabase/supabase-js';
import type { Level } from '../schemas/question';
import { getSupabase, getSupabaseConfig, type SupabaseConfig } from './supabase';

export const CLIENT_ID_KEY = 'ccquiz:clientId';

export interface AnswerEvent {
  questionId: string;
  /** 1..10 */
  position: number;
  /** null when the timer ran out */
  userAnswer: boolean | null;
  isCorrect: boolean;
  timedOut: boolean;
  responseTimeMs: number;
}

export interface AnalyticsDeps {
  getClient: () => SupabaseClient | null;
  getConfig: () => SupabaseConfig | null;
  storage: () => Storage | null;
  randomUUID: () => string;
  fetchFn: typeof fetch;
  userAgent: () => string | undefined;
}

/**
 * Fire-and-forget game analytics (PRD §5.5). Every public method returns synchronously and
 * swallows every error: analytics must never block or break gameplay, and the game must work
 * fully with Supabase down or unconfigured.
 *
 * Writes for one session run in order through a per-session queue, so an answer is never sent
 * before its session row exists and the finish call comes after the last answer.
 */
export function createAnalytics(deps: AnalyticsDeps) {
  const queues = new Map<string, Promise<void>>();
  let activeSessionId: string | null = null;
  let memoryClientId: string | null = null;

  function enqueue(sessionId: string, op: (client: SupabaseClient) => PromiseLike<unknown>): void {
    let client: SupabaseClient | null;
    try {
      client = deps.getClient();
    } catch {
      client = null;
    }
    if (!client) return;
    const c = client;
    const prev = queues.get(sessionId) ?? Promise.resolve();
    const next = prev
      .then(() => op(c))
      .then((result) => {
        const error = (result as { error?: unknown } | undefined)?.error;
        if (error) console.warn('[analytics] erro do Supabase (ignorado):', error);
      })
      .catch((err: unknown) => console.warn('[analytics] falha (ignorada):', err));
    queues.set(sessionId, next);
  }

  function getClientId(): string {
    try {
      const storage = deps.storage();
      const stored = storage?.getItem(CLIENT_ID_KEY);
      if (stored) return stored;
      const id = deps.randomUUID();
      storage?.setItem(CLIENT_ID_KEY, id);
      return id;
    } catch {
      // Private mode or blocked storage: keep a per-tab id.
      memoryClientId ??= deps.randomUUID();
      return memoryClientId;
    }
  }

  /**
   * Best effort for page unload / tab hidden. Uses `fetch` with `keepalive` so the request
   * survives the page closing, which the queued supabase-js call would not. If the player
   * comes back and finishes, the 'completed' call overrides 'abandoned' (see the migration).
   */
  function markActiveAbandonedOnUnload(): void {
    const sessionId = activeSessionId;
    const config = deps.getConfig();
    if (!sessionId || !config) return;
    try {
      void deps
        .fetchFn(`${config.url}/rest/v1/rpc/finish_game_session`, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`,
          },
          body: JSON.stringify({ p_session_id: sessionId, p_status: 'abandoned' }),
        })
        .catch(() => {});
    } catch {
      // ignore: best effort
    }
  }

  return {
    getClientId,
    markActiveAbandonedOnUnload,

    /** Starts a session and returns its id. The id is generated here, so no read-back is needed. */
    startSession(level: Level): string {
      const sessionId = deps.randomUUID();
      activeSessionId = sessionId;
      const row = {
        id: sessionId,
        level,
        client_id: getClientId(),
        user_agent: deps.userAgent()?.slice(0, 500) ?? null,
      };
      enqueue(sessionId, (client) => client.from('game_sessions').insert(row));
      return sessionId;
    },

    recordAnswer(sessionId: string, answer: AnswerEvent): void {
      const row = {
        session_id: sessionId,
        question_id: answer.questionId,
        position: answer.position,
        user_answer: answer.userAnswer,
        is_correct: answer.isCorrect,
        timed_out: answer.timedOut,
        response_time_ms: Math.max(0, Math.round(answer.responseTimeMs)),
      };
      enqueue(sessionId, (client) => client.from('game_answers').insert(row));
    },

    finishSession(sessionId: string, score: number): void {
      if (activeSessionId === sessionId) activeSessionId = null;
      enqueue(sessionId, (client) =>
        client.rpc('finish_game_session', {
          p_session_id: sessionId,
          p_status: 'completed',
          p_score: score,
        }),
      );
    },

    /** Leaving mid-game (GO_HOME): the game is discarded and recorded as abandoned. */
    abandonSession(sessionId: string): void {
      if (activeSessionId === sessionId) activeSessionId = null;
      enqueue(sessionId, (client) =>
        client.rpc('finish_game_session', { p_session_id: sessionId, p_status: 'abandoned' }),
      );
    },

    /** Registers the unload/hidden listeners. Returns a cleanup function. */
    installUnloadHandlers(target: Window = window): () => void {
      const onHidden = () => {
        if (target.document.visibilityState === 'hidden') markActiveAbandonedOnUnload();
      };
      const onUnload = () => markActiveAbandonedOnUnload();
      target.addEventListener('beforeunload', onUnload);
      target.document.addEventListener('visibilitychange', onHidden);
      return () => {
        target.removeEventListener('beforeunload', onUnload);
        target.document.removeEventListener('visibilitychange', onHidden);
      };
    },

    /** Test helper: resolves when every queued write has settled. */
    flush(): Promise<void> {
      return Promise.all(queues.values()).then(() => {});
    },
  };
}

export type Analytics = ReturnType<typeof createAnalytics>;

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const analytics = createAnalytics({
  getClient: getSupabase,
  getConfig: getSupabaseConfig,
  storage: safeLocalStorage,
  randomUUID: () => crypto.randomUUID(),
  fetchFn: (...args) => fetch(...args),
  userAgent: () => (typeof navigator === 'undefined' ? undefined : navigator.userAgent),
});
