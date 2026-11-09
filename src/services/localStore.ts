import { LEVELS, type Level } from '../schemas/question';

export const bestKey = (level: Level) => `ccquiz:best:${level}`;
export const lastKey = (level: Level) => `ccquiz:last:${level}`;

/** `window.localStorage`, or null when the browser blocks it (some private modes throw on access). */
export function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export type BestScores = Record<Level, number | null>;

/**
 * Per-browser persistence (PRD §5.8). Every access is wrapped in try/catch and every read is
 * validated, so a blocked, full or tampered storage never reaches the UI: reads fall back to
 * "nothing saved" and writes are silently skipped.
 */
export function createLocalStore(storage: () => Storage | null) {
  function get(key: string): string | null {
    try {
      return storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function set(key: string, value: string): void {
    try {
      storage()?.setItem(key, value);
    } catch {
      // ignore: quota exceeded or storage blocked
    }
  }

  function readBest(level: Level): number | null {
    const raw = get(bestKey(level));
    if (raw === null || raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 10 ? n : null;
  }

  return {
    readBest,

    readAllBest(): BestScores {
      return Object.fromEntries(LEVELS.map((level) => [level, readBest(level)])) as BestScores;
    },

    /** Saves `score` if it beats the stored best. Returns true when it is a new best. */
    writeBest(level: Level, score: number): boolean {
      const previous = readBest(level);
      if (previous !== null && previous >= score) return false;
      set(bestKey(level), String(score));
      return true;
    },

    readLastIds(level: Level): string[] {
      const raw = get(lastKey(level));
      if (raw === null) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string') ? parsed : [];
      } catch {
        return [];
      }
    },

    writeLastIds(level: Level, ids: readonly string[]): void {
      set(lastKey(level), JSON.stringify(ids));
    },
  };
}

export type LocalStore = ReturnType<typeof createLocalStore>;

export const localStore = createLocalStore(safeLocalStorage);
