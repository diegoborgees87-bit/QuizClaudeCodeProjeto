# Security & privacy reviewer

**Scope:** all changed files, excluding tests.

Read `_contract.md`, then `prd.md` §5.4 (RLS) and §5.9 (env vars).

- **Service role key:** `SUPABASE_SERVICE_ROLE_KEY` may appear only in `scripts/**` (and in
  `.env.example` with an empty value). Any reference in `src/**`, any `VITE_` prefix on it, or any
  Vite `define`/`envPrefix` change that would expose it is a **blocker**.
- **Committed secrets:** a real URL or key in `.env.example`, in source, or in a committed `.env*`
  file is a **blocker**. `.gitignore` must keep ignoring `.env` and `.env.*`.
- **RLS exposure:** a migration or grant that lets `anon` read sessions, answers or `question_stats`,
  write to `questions`, or update anything beyond the session completion fields is a **blocker**
  (see also the data-supabase lens).
- **XSS:** question text, explanations and `docUrl` come from the DB. Flag
  `dangerouslySetInnerHTML`, rendering an unvalidated URL into `href` (a `javascript:` URL must be
  impossible, since Zod should enforce https), and external links without `rel="noopener noreferrer"`
  when they use `target="_blank"`.
- **Privacy:** no names, emails, IPs, user agents or fingerprints are stored or sent. Only the
  anonymous `client_id` UUID is used (PRD §5.4).
- **Logging:** no logging of env values or whole Supabase responses containing config.
- **Dependencies:** flag new runtime dependencies that the PRD stack (§5.1) doesn't justify, and any
  new outbound network call other than Supabase.
