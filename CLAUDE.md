# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`prd.md` is the approved product spec and the source of truth. Follow the implementation order in `prd.md` §10.

Done: step 1 (scaffold) and step 2 (Zod schema in `src/schemas/question.ts` with `parseQuestions`, `data/questions.json` with the 12 sample questions, bank tests in `tests/questionBank.test.ts`). Steps 6 and 7 were done ahead of 3–5: `supabase/migrations/0001_init.sql`, `src/services/{supabase,questionsRepo,analytics}.ts` and `scripts/seed-questions.ts` (`npm run seed`, run by Node's native TS support with `--env-file-if-exists=.env`). Step 3 is done: `src/game/{draw,scoring,reducer}.ts` with tests in `tests/game/` (shared fixtures and a seeded PRNG in `tests/game/fixtures.ts`). `drawQuestions` degrades on a small bank: it returns fewer than 10 questions, or an unbalanced split, instead of throwing. The reducer is pure: drawing, the timer and analytics run outside it, and an action that doesn't apply returns the same state object. Step 4 is done: `src/hooks/useTimer.ts` (options object `{ durationMs, running, resetKey, onExpire }`, returns `{ remainingMs, getElapsedMs }`; `getElapsedMs` feeds `ANSWER.responseTimeMs`), tested with fake timers including `performance` in `tests/hooks/useTimer.test.ts`. Step 5 is done: `App.tsx` owns the reducer and picks the screen from `state.status` (`src/screens/`, `src/components/`). I/O goes through `AppDeps` (`src/appDeps.ts`), injected as `<App deps={...} />` in tests (`tests/App.test.tsx` plays full games with fixture questions). Hooks: `useQuestions` (load + draw on `loading`), `useGameAnalytics` (mirrors state transitions into the already-wired analytics service), `useBestScores`, `useQuizShortcuts`, `useFocusOnMount`. localStorage goes through `src/services/localStore.ts`. The best score is saved from the NEXT handler on the last question, not from an effect. Step 8 is done: `data/questions.json` has 90 questions (30 per level, 15 true and 15 false each), checked against the docs on 2026-11-08, and `BANK_COMPLETE` is `true`. Doc links use the Portuguese pages (`https://code.claude.com/docs/pt/<page>`). Since v2.1.283 the default permission mode for interactive terminal and VS Code sessions is `auto` (a classifier reviews actions), so don't write questions claiming Claude Code always asks before acting. Step 9 is done: Lighthouse scores 100 in all four categories (mobile and desktop), and axe in real Chrome reports zero violations, including contrast, on every screen at 360px and 1280px. `tests/a11y.test.tsx` runs axe-core on every screen in jsdom (contrast is off there, so re-check colors in a browser). supabase-js is loaded with a dynamic import in `getSupabase()` (now async; services accept a sync or async `ClientSource`), and the repo's 3s timeout also covers loading it. Keyboard hints are hidden below `sm`. Next is step 10 (Vercel deploy and README).

Deviation from PRD §5.4, on purpose: anon has no UPDATE on `game_sessions`. Sessions are finished through the `finish_game_session` RPC (SECURITY DEFINER), because a plain `UPDATE ... WHERE id` would require SELECT on the table. The client generates the session UUID, so inserts don't need RETURNING. A tab switch marks the session `abandoned`, and a later `completed` overrides it.

The bank size and balance tests (≥30 per level, 45–55% true) run behind `BANK_COMPLETE = true` in `tests/questionBank.test.ts`. A guard test fails if the bank has 90 questions while the flag is `false`.

Tooling notes:
- Node is installed at `C:\Program Files\nodejs` but may not be on PATH in the shell. If so, prepend it: `$env:Path = "C:\Program Files\nodejs;$env:Path"`.
- Installed versions: Vite 8, TypeScript 6, Tailwind v4 (via `@tailwindcss/vite`, configured with `@import 'tailwindcss'` in `src/index.css`, so there is no `tailwind.config`), Vitest 5 (configured inside `vite.config.ts`), and ESLint 10 flat config (`eslint.config.js`). React is pinned to 18.
- Tests live in `tests/` or as `src/**/*.test.ts(x)`. Setup is in `tests/setup.ts` (jest-dom matchers plus RTL cleanup). `npx vitest run --coverage` enforces the 80% threshold on `src/game/**` and `src/services/**`.
- `tsconfig.app.json` covers `src`, `tests` and `data`. `tsconfig.node.json` covers `vite.config.ts` and `scripts/`.

## What is being built

A True/False quiz web app about Claude Code, in **Brazilian Portuguese only**, for non-technical business users. There are 3 levels (`beginner`, `intermediate`, `advanced`). Each game is 10 questions with a 30s timer per question, immediate feedback (correct/incorrect, explanation, doc link) and a result screen with a review.

Stack: React 18 + Vite + TypeScript (`strict`), Tailwind, Zod, Supabase (`@supabase/supabase-js` v2), Vitest + React Testing Library, ESLint + Prettier. Deploy is Vercel (front-end) plus managed Supabase.

## Commands (planned, per PRD §6.3)

```
npm run dev          # Vite dev server
npm run build        # must pass with no errors
npm run lint
npm run format
npm run test         # Vitest, single run
npm run test:watch
npx vitest run path/to/file.test.ts   # single test file
npx vitest run -t "test name"         # single test by name
npm run seed         # upsert data/questions.json into Supabase (needs SUPABASE_SERVICE_ROLE_KEY)
```

## Architecture (key cross-cutting decisions)

- **Game state lives in one `useReducer` state machine** (`src/game/reducer.ts`), with no router and no external state library. Screens are derived from the state: `idle → loading → question ⇄ feedback → result`, plus `error`. The actions are `SELECT_LEVEL`, `QUESTIONS_LOADED`, `LOAD_FAILED`, `ANSWER`, `TIMEOUT`, `NEXT`, `RESTART`, `GO_HOME`. A timeout counts as a wrong answer and goes straight to feedback.
- **Question data has two sources.** `data/questions.json` is the editable source of truth and is bundled as a fallback. `questionsRepo.getByLevel` queries Supabase (active rows only, 3s timeout). On any failure, or when env config is missing, it falls back to the JSON. Results are always validated with the Zod schema (`src/schemas/question.ts`), and invalid items are dropped with `console.warn`.
- **Analytics is fire-and-forget** (`src/services/analytics.ts`). It records `game_sessions` and `game_answers`, and on `beforeunload`/`visibilitychange` it marks a game in progress as `abandoned`. Analytics failures must **never** block or break gameplay, and the game must work fully with Supabase down.
- **Balanced draw** (`src/game/draw.ts`) picks 10 unique questions from the level, with 4–6 of them true. When the bank allows, it avoids the IDs from the previous game (`ccquiz:last:<level>` in localStorage).
- **The timer** (`useTimer`) is based on `performance.now()` timestamps rather than counting `setInterval` ticks. It keeps running when the tab is hidden (on purpose, to prevent cheating; document this in code), resets for each question, and stops during feedback.
- **localStorage keys:** `ccquiz:clientId` (anonymous UUID), `ccquiz:best:<level>`, `ccquiz:last:<level>`. Wrap every access in `try/catch`.

## Data and Supabase rules

- The schema, RLS and the `question_stats` view are in `supabase/migrations/0001_init.sql` (DDL in PRD §5.3–5.4). In the DB, columns are snake_case (`doc_url`). In the app and JSON they are camelCase (`docUrl`).
- RLS: `anon` can only `select` active questions, `insert` sessions/answers, and `update` session completion fields. `anon` has no select on sessions, answers or `question_stats`.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by `scripts/seed-questions.ts`, run locally or in CI. Never prefix it with `VITE_` and never import it in `src/`.
- Seeding upserts by `id`. Questions removed from the JSON are set to `active=false` and are never deleted, so answer history is preserved.

## Question bank constraints (enforced by tests)

- IDs follow `beg-NNN` / `int-NNN` / `adv-NNN` and are unique. There are at least 30 active questions per level, 90 or more in total.
- The share of true answers is 45–55% per level. `statement` is at most 200 chars and `explanation` at most 400. `docUrl` is optional but must be a valid https URL when present.
- Content must be factually checked against the official Claude Code docs (`code.claude.com/docs`, `docs.claude.com`). If a fact is uncertain, drop the question. Avoid double negatives and trick wording, and explain technical terms in plain business language.

## Frontend patterns

For anything in `src/components`, `src/screens`, `src/hooks` or `App.tsx`, follow the project skill `.claude/skills/frontend-patterns/SKILL.md`. It is adapted from the ECC skill and lists which upstream patterns (Next.js, Zustand, React Query, Framer Motion, etc.) do not apply here.

## Quality bar

- `build`, `lint` and `test` must all pass, with no implicit `any`. Coverage must be at least 80% in `src/game/` and `src/services/`.
- The test list is in PRD §6.1: bank validation, draw, scoring, reducer transitions, useTimer with fake timers, repo fallback, and RTL tests for click and keyboard answering.
- UX: mobile-first (360px and up), touch targets of at least 44px, WCAG 2.1 AA. Keyboard shortcuts are `V`/`F` or `←`/`→` to answer and `Enter` for next. `aria-live` announces the timer every 10s, not every second. Show ✓/✗ icons plus text, never color alone. Respect `prefers-reduced-motion`.
- Out of scope for the MVP: auth, rankings, sharing, dark mode, i18n, an admin panel, AI-generated questions.
