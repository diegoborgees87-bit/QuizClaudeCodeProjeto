# Data & Supabase reviewer

**Scope:** `src/services/**`, `src/schemas/**`, `supabase/**`, `scripts/**`, `src/vite-env.d.ts`
and `.env.example`.

Read `_contract.md`, then `prd.md` §5.3 (data model), §5.4 (RLS), §5.5 (data flow) and §5.9 (env).

**questionsRepo:**

- It queries only `active = true` rows for the level, with a **3s timeout** (AbortController or
  `Promise.race`, with the timer cleared afterwards).
- It falls back to the bundled `data/questions.json` on **any** failure: network error, timeout,
  Supabase `error`, missing env config, or an empty or all-invalid result. A failure path that throws
  to the UI instead of falling back is a **blocker**.
- Rows are mapped from snake_case (`doc_url`, `is_true`, ...) to camelCase before Zod validation,
  and the mapping matches the migration's real column names.
- Invalid items are dropped with `console.warn`, without failing the whole batch (`safeParse` per
  item).

**Supabase client (`src/services/supabase.ts`):** it is created only when both `VITE_` vars are
present, and the app works with no client at all. It doesn't throw at import time.

**Analytics (`src/services/analytics.ts`):**

- Every call is fire-and-forget: it is never awaited in the game flow, errors are caught and logged,
  and a slow or failed call cannot delay or break gameplay. Anything else is a **blocker**.
- It inserts `game_sessions` at the start of a game, `game_answers` for each answer, and updates the
  session on completion. On `beforeunload`/`visibilitychange` it marks only an **in-progress** game
  as `abandoned`, never one that is already completed.
- The update sends only the fields that RLS allows (`finished_at`, `status`, `score`).
- No personal data is recorded. `client_id` is a random UUID (`crypto.randomUUID`).

**Zod schema (`src/schemas/question.ts`):** it encodes the bank rules: the ID pattern for each
level, `statement` at most 200 chars, `explanation` at most 400, and `docUrl` optional but https when
present. The TS types are derived with `z.infer` rather than duplicated by hand.

**Migration (`supabase/migrations/*.sql`):**

- RLS is enabled on every table. `anon` gets `select` on `questions` only where `active`, `insert`
  on sessions and answers, and `update` on sessions limited to the completion fields. `anon` gets
  **no** `select` on sessions, answers or `question_stats` (`revoke`). Any wider grant is a
  **blocker**.
- Check the constraints and indexes that the PRD §5.3 DDL defines. Never edit an applied migration;
  add a new one.

**Seed (`scripts/seed-questions.ts`):** it upserts by `id`, and questions missing from the JSON are
set to `active = false`, **never deleted**. It validates the JSON with the same Zod schema before
writing. It reads `SUPABASE_SERVICE_ROLE_KEY` from the environment and fails clearly when the key is
missing.
