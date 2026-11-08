# UI, UX & accessibility reviewer

**Scope:** `src/components/**`, `src/screens/**`, `src/App.tsx`, `src/index.css` and `index.html`.

Read `_contract.md`, then `prd.md` §4.1–4.4 (flow, screens, game rules, UX requirements).

**Accessibility (WCAG 2.1 AA), most findings here are a blocker:**

- Interactive elements are real `<button>`/`<a>` elements, not clickable `<div>`s. They have
  accessible names and a visible focus style (no `outline-none` without a replacement).
- Keyboard: `V`/`F` or `←`/`→` answer, and `Enter` goes to the next question. The listeners ignore
  key repeat, only act in the right state (no answering during feedback), and are removed on
  unmount. Focus moves sensibly between question, feedback and result.
- `aria-live` announces feedback, and announces the timer **every 10s, not every second**. A live
  region updated on each tick is a **blocker**.
- Correct and incorrect are shown with a ✓/✗ icon **plus text**, never with color alone. Text
  contrast is at least 4.5:1 (watch light Tailwind grays such as `slate-400` on white).
- Motion respects `prefers-reduced-motion`, through the global rule in `index.css` or `motion-safe:`.
- Headings follow a logical order, the page has `lang="pt-BR"`, and decorative icons use
  `aria-hidden`.

**Mobile and layout:** the layout is mobile-first and works at 360px with no horizontal scroll.
Touch targets are at least 44×44px (`min-h-11`/`h-11` or larger).

**Copy:** all user-facing text is in **Brazilian Portuguese**, with correct accents and plain
business language. There are no leftover English strings and no jargon without an explanation.

**Screens and flow:** the screens match PRD §4.2. Feedback shows correct or incorrect, the correct
answer, the explanation and the doc link. The result screen shows the score, the message for the
score range and the full review, with "jogar novamente" and "trocar nível". The loading and error
states exist and the error state is recoverable.

**Components:** components are presentational and get state and dispatch from the reducer. There is
no game logic duplicated inside a component, and no new state library or router (CLAUDE.md
architecture).
