---
name: quiz-review
description: Review a diff, branch, or the uncommitted working tree of the Quizz Claude Code app with focused reviewer lenses (correctness, game logic, data/Supabase, security, UI/a11y, question bank, tests, conventions), checked against prd.md and CLAUDE.md. Report findings in PT-BR grouped by file.
---

# Reviewing Quizz Claude Code changes

Sources of truth, in this order: `prd.md` (the approved spec), then `CLAUDE.md` (decisions and
quality bar), then the code itself. When a doc and the code disagree, report the drift. Don't
silently accept either side.

The review is split into **lenses**. Each lens lives in its own file under `reviewers/` and stays
scoped to one concern. You, the orchestrator, pick the diff, choose the lenses, run them, then merge
and report.

## 1. Get the diff

Review only what changed, never untouched code.

- **Branch mode:** use this when the current branch is not `main` and `git diff main...HEAD` is
  non-empty. Every lens reads `git diff main...HEAD -- <its globs>`.
- **Working-tree mode:** use this when you are on `main`, when asked to review uncommitted work, or
  when the branch diff is empty. Capture the diff **once** so every lens sees the same snapshot.
  Untracked files are marked intent-to-add so they appear, then unmarked again, which leaves the
  user's real staging untouched:
  ```bash
  NEW=$(git ls-files --others --exclude-standard)
  [ -n "$NEW" ] && git add -N $NEW
  git diff HEAD > "$SCRATCH/review.diff"
  [ -n "$NEW" ] && git reset -q -- $NEW
  ```
  `$SCRATCH` is the session scratchpad directory. Lenses read this file for their globs, plus the
  files on disk for surrounding context.

If the user passed a path or glob as an argument, restrict the diff to it.

## 2. Pick the lenses

List the changed files with `git diff --name-only main...HEAD` (branch mode) or from the snapshot
(working-tree mode). Skip a lens only when none of its globs is touched. Never skip `correctness`,
`security` or `conventions` when there is any source change.

| Reviewer file                | Lens                                                     | Scope                                                                                                 |
| ---------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `reviewers/correctness.md`   | Correctness & root cause                                 | `src/**`, `scripts/**` (excluding tests)                                                              |
| `reviewers/game-logic.md`    | State machine, draw, scoring, timer                      | `src/game/**`, `src/hooks/**`                                                                         |
| `reviewers/data-supabase.md` | Question loading, fallback, analytics, schema, RLS, seed | `src/services/**`, `src/schemas/**`, `supabase/**`, `scripts/**`, `src/vite-env.d.ts`, `.env.example` |
| `reviewers/security.md`      | Secrets, RLS exposure, XSS, privacy                      | all files (excluding tests)                                                                           |
| `reviewers/ui-a11y.md`       | UX, WCAG 2.1 AA, keyboard, mobile, PT-BR copy            | `src/components/**`, `src/screens/**`, `src/App.tsx`, `src/index.css`, `index.html`                   |
| `reviewers/question-bank.md` | Content and constraints of the bank                      | `data/**`                                                                                             |
| `reviewers/tests.md`         | Test quality and PRD §6.1 coverage                       | `tests/**`, `src/**/*.test.{ts,tsx}`, plus any new source branch with no test                         |
| `reviewers/conventions.md`   | TS strict, lint/format, naming, scope creep, tooling     | all files                                                                                             |

## 3. Run the lenses

- **Small diff** (roughly under 300 changed lines, or 3 lenses or fewer in scope): apply the lenses
  yourself, in sequence. Spawning agents for a small diff costs more than it saves.
- **Larger diff:** in a _single message_, launch one `Agent` (subagent_type `Explore`) per in-scope
  lens. Give each one this briefing:
  - The diff source, either the range (`main...HEAD`) or the snapshot path, and the globs it owns.
  - "Read `.claude/skills/quiz-review/reviewers/_contract.md`, then
    `.claude/skills/quiz-review/reviewers/<file>`, and the sections of `prd.md` / `CLAUDE.md` it
    cites. Apply **only** that lens to the changed files in your scope. Return findings in the
    contract format."

Lenses are read-only and independent. Overlap between them is fine, because you dedupe at merge time.

## 4. Verify mechanically

Unless the user asked you not to, run these (prepend Node to PATH if needed, see `CLAUDE.md`):

```
npm run build
npm run lint
npx vitest run --coverage
npx prettier --check .
```

Report failures as **blocker** findings, with the relevant output. `build`, `lint` and `test` must
pass (PRD §6.2), and coverage must be at least 80% in `src/game/` and `src/services/`.

## 5. Merge and report

- Drop exact duplicates. When two lenses flag the same `file:line`, keep the higher severity.
- Group findings **by file**. Each finding is `severity | file:line | one sentence`, with severity
  `blocker`, `suggestion` or `nit`.
- Reconcile against the PRD. If the change implements a step from PRD §10, check that step's
  deliverables (code plus the matching tests from §6.1) and flag any that are missing. Flag work that
  belongs to a later step, or to "Fora de escopo" (§1.4 / §9), as scope creep.
- Write the report to the user in **Brazilian Portuguese**, and keep it short. If nothing is wrong,
  say so. Don't manufacture nits.
- Don't apply fixes unless the user asked for them. End by offering to fix.
