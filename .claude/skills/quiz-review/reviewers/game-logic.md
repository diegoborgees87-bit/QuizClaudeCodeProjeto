# Game logic reviewer (state machine, draw, scoring, timer)

**Scope:** `src/game/**` and `src/hooks/**`.

Read `_contract.md`, then `prd.md` §4.3 (game rules), §5.6 (state machine), §5.7 (timer) and §5.8
(localStorage).

**Reducer (`src/game/reducer.ts`):**

- States are `idle`, `loading`, `question`, `feedback`, `result` and `error`. Actions are
  `SELECT_LEVEL`, `QUESTIONS_LOADED`, `LOAD_FAILED`, `ANSWER`, `TIMEOUT`, `NEXT`, `RESTART` and
  `GO_HOME`. Any transition that differs from the §5.6 diagram is a **blocker**.
- An action that arrives in the wrong state must be a no-op that returns the same state. Common
  cases: a second `ANSWER` during `feedback`, a `TIMEOUT` after `ANSWER`, a `NEXT` outside
  `feedback`, or a `QUESTIONS_LOADED` after `GO_HOME`. Double-scoring is a **blocker**.
- `TIMEOUT` counts as a wrong answer and goes straight to `feedback`. `NEXT` after the 10th question
  goes to `result`. `RESTART` goes to `loading` for the same level.
- The reducer must be pure: no `Math.random`, `Date.now`, localStorage or network calls inside it.
  Those belong in the caller or in injected values.
- State is a discriminated union, so impossible combinations can't be represented, and the `switch`
  is exhaustive (a `never` check).

**Draw (`src/game/draw.ts`):**

- It returns 10 unique questions, all from the requested level, with 4 to 6 of them true.
- It avoids the previous game's IDs when the bank allows, and still works when it doesn't (a bank at
  the 30-question minimum, or too few true or false questions left after exclusion).
- Randomness is injectable (an RNG parameter) so tests are deterministic. A shuffle written as
  `sort(() => Math.random() - 0.5)` is biased: flag it and suggest Fisher-Yates.
- It must never loop forever or throw on a valid bank.

**Scoring (`src/game/scoring.ts`):** 1 point for a correct answer, 0 for a wrong answer or timeout.
The best score per level is updated only when it improves.

**useTimer:**

- It is based on `performance.now()` deltas, not on counting ticks. It keeps running when the tab is
  hidden, and that choice must be documented in a code comment.
- It resets for each question, stops during feedback, and `onExpire` fires **exactly once**. It must
  never fire after unmount or after an answer. The interval or rAF is cleared on cleanup.
- If `onExpire` is stored in a ref, there is no stale closure. If it isn't, it must not restart the
  timer on every render.
