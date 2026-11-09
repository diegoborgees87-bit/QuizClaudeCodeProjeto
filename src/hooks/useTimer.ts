import { useCallback, useEffect, useRef, useState } from 'react';

/** How often the remaining time is re-rendered. Only affects display, never accuracy. */
export const TIMER_TICK_MS = 250;

export interface TimerOptions {
  durationMs: number;
  /** True while a question is on screen. False stops the timer (feedback) and freezes the display. */
  running: boolean;
  /** Changing it while running restarts the countdown. Use the question index. */
  resetKey: unknown;
  /** Fired once when time runs out. Never fires after `running` turns false or after unmount. */
  onExpire: () => void;
}

export interface Timer {
  remainingMs: number;
  /** Time since the current countdown started, capped at `durationMs`. Read it when answering. */
  getElapsedMs: () => number;
}

/**
 * Countdown for one question (PRD §5.7).
 *
 * The remaining time is always recomputed from a `performance.now()` deadline. The interval only
 * triggers re-renders, so throttled or skipped ticks never add drift.
 *
 * Intentionally NOT paused when the tab is hidden: the clock keeps running so switching tabs to
 * look up the answer doesn't buy extra time. A background tab may throttle the interval, but the
 * next tick sees the real elapsed time and expires right away.
 */
export function useTimer({ durationMs, running, resetKey, onExpire }: TimerOptions): Timer {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const startedAtRef = useRef(0);
  const onExpireRef = useRef(onExpire);

  // Keep the latest callback without restarting the countdown when an inline function changes.
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  // Show a full bar on the same render a countdown (re)starts, instead of one frame of stale time.
  // This is React's "adjust state while rendering" pattern, not an effect.
  const [startKey, setStartKey] = useState<{ running: boolean; resetKey: unknown }>({
    running,
    resetKey,
  });
  if (startKey.running !== running || startKey.resetKey !== resetKey) {
    setStartKey({ running, resetKey });
    if (running) setRemainingMs(durationMs);
  }

  useEffect(() => {
    if (!running) return;
    const startedAt = performance.now();
    startedAtRef.current = startedAt;
    const deadline = startedAt + durationMs;

    const id = setInterval(() => {
      const left = Math.max(0, deadline - performance.now());
      setRemainingMs(left);
      if (left === 0) {
        clearInterval(id);
        onExpireRef.current();
      }
    }, TIMER_TICK_MS);

    return () => clearInterval(id);
  }, [running, resetKey, durationMs]);

  const getElapsedMs = useCallback(
    () => Math.min(durationMs, Math.max(0, performance.now() - startedAtRef.current)),
    [durationMs],
  );

  return { remainingMs, getElapsedMs };
}
