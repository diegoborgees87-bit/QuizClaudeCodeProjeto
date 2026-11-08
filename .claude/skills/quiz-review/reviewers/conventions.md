# Conventions & tooling reviewer

**Scope:** all changed files.

Read `_contract.md`, then `CLAUDE.md` (tooling notes and architecture) and `prd.md` §5.2 (folder
structure).

- **TypeScript:** `strict` must stay on. Flag explicit `any`, implicit `any`, and loosened compiler
  flags in `tsconfig*.json`. Types should come from the Zod schema (`z.infer`) instead of being
  duplicated, and there should be a single `Level` type (`'beginner' | 'intermediate' | 'advanced'`).
- **Structure:** files live where PRD §5.2 says (`game/`, `hooks/`, `services/`, `schemas/`,
  `components/`, `screens/`). App and JSON use camelCase, and the DB uses snake_case only at the
  mapping boundary.
- **Scope creep:** flag code for items that are out of scope for the MVP (auth, ranking, sharing,
  dark mode, i18n, admin panel, AI-generated questions, a router, a state library), and flag work
  from a later PRD §10 step mixed into the current one.
- **Readability:** flag misleading names, abstractions that earn nothing, dead code left behind after
  a replacement, commented-out code, and stray `console.log`. Only the documented `console.warn` for
  invalid questions is allowed. Complex logic needs a short comment, and the timer's "keeps running
  when hidden" choice must be commented.
- **Reuse:** check for an existing helper, type or constant before accepting a duplicate. That
  includes localStorage key builders, the level list and the question count/time constants (10 and
  30s).
- **Tooling:** config changes (`vite.config.ts`, `eslint.config.js`, `tsconfig*.json`,
  `package.json`) must keep `build`, `lint`, `test` and the coverage gate meaningful. Disabling a lint
  rule or adding an `eslint-disable` needs a reason.
- **Windows:** the author works on Windows. npm scripts run in `cmd.exe` there, so flag POSIX-only
  syntax (`rm -rf`, `VAR=x cmd`, single quotes, `&&` chains that rely on `sh`) in `package.json`
  scripts, and hardcoded `/` path joins in `scripts/**` (use `node:path` / `import.meta.url`).
- **Files:** text files are UTF-8 (not UTF-16) with consistent line endings.
- **Formatting:** formatting matches `.prettierrc.json`. Keep these findings to `nit`, since
  `npm run format` fixes them.
