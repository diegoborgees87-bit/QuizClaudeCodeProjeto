# Correctness & root-cause reviewer

**Scope:** `src/**` and `scripts/**`, excluding test files.

Read `_contract.md` for the persona and output format.

- **Fix the cause, not the symptom.** For a bug fix, trace the bad value back to where it comes from.
  Extra null guards, a `try/catch` that swallows errors, clamping, or retries that hide a defect
  upstream are a **blocker**. Name the layer where the fix belongs, for example a reducer bug patched
  inside a component.
- **Async:** look for a missing `await`, unhandled promise rejections, and state updates after
  unmount (`setState` in a resolved promise or timer after the component is gone). Check for races
  when the user changes level or restarts while a load is still in flight: a stale response must not
  overwrite the new game.
- **Null and undefined:** `x || default` on a value where `0`, `''` or `false` is meaningful (a
  score of 0, `answer: false`) is a bug. Use `??` or an explicit check instead.
- **Boundaries:** check off-by-one errors on question index, the 10th question going to `result`,
  timer expiry at exactly 0, and empty or short question lists.
- **React correctness:** check stale closures in effects and callbacks, missing or incorrect effect
  dependencies, effect cleanup (listeners, timers, `beforeunload`/`visibilitychange`), mutating state
  or props, and unstable `key`s in lists.
- **localStorage:** every read and write is wrapped in `try/catch`, and parsed values are validated
  before use (corrupted JSON must not crash the app). Keys must be exactly `ccquiz:clientId`,
  `ccquiz:best:<level>` and `ccquiz:last:<level>` (PRD §5.8).
- **Type escapes:** `as` casts, `!` non-null assertions and `@ts-expect-error` that hide a real type
  mismatch, especially on data coming from Supabase or JSON before Zod validation.
