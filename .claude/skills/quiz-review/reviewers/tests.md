# Tests reviewer

**Scope:** `tests/**` and `src/**/*.test.{ts,tsx}`. Also check every **new or changed source branch**
to see whether a test covers it.

Read `_contract.md`, then `prd.md` §6.1 (required tests) and §6.2 (quality bar).

- **Required coverage:** when a change adds or changes a module listed in §6.1 (bank validation,
  draw, scoring, reducer, useTimer, questionsRepo fallback, RTL click and keyboard answering,
  feedback explanation, result score), the matching tests must exist in the same change. If they are
  missing, that is a **blocker**. A new branch with no test is a **suggestion**.
- **Reducer:** each transition from §5.6 is tested, including the no-ops (an action in the wrong
  state), timeout, restart and go-home.
- **Draw:** tests use a seeded or injected RNG (no flaky randomness), run many iterations or cover
  edge banks, and assert the 4–6 true rule, uniqueness, the level and the avoidance of the last
  game's IDs.
- **Timer:** tests use `vi.useFakeTimers()` and mock `performance.now` consistently. They assert that
  the timer expires at 30s, that it does not fire after unmount or after an answer, and that real
  timers are restored afterwards.
- **Repo fallback:** the Supabase client is mocked through `vi.mock`, never called over the network.
  Tests cover the error, timeout and missing-env paths, plus invalid items being dropped (with the
  `console.warn` spy asserted or silenced).
- **RTL:** queries go by role or label (`getByRole`) rather than by test ID or class. Interactions use
  `@testing-library/user-event`, which is awaited. Assertions check what the user sees (PT-BR text,
  ✓/✗ plus text), not implementation details.
- **Hygiene:** no `.only` or `.skip` left behind, no real timers or network, no reliance on test
  order. localStorage is cleared between tests, and each test name says the behavior it checks.
- Coverage of at least 80% in `src/game/` and `src/services/` must hold. Never lower the thresholds
  in `vite.config.ts` to make the run pass.
