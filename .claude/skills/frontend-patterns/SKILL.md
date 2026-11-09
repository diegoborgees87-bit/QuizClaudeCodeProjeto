---
name: frontend-patterns
description: React 18 + Vite + Tailwind patterns for the Quizz Claude Code app (useReducer game state machine, custom hooks such as useTimer and useQuestions, screen and component composition, keyboard shortcuts, focus, aria-live, reduced motion). Use when building or reviewing anything in src/components, src/screens, src/hooks or App.tsx.
metadata:
  origin: ECC (affaan-m/everything-claude-code), adapted to this project
---

# Frontend patterns for Quizz Claude Code

Adapted from the generic ECC `frontend-patterns` skill. Everything here is subordinate to `prd.md`
and `CLAUDE.md`. When they disagree with this file, they win.

## What does NOT apply here

The upstream skill covers patterns this project rules out on purpose. Do not introduce them:

| Upstream pattern                         | Why not here                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Next.js, server components, routing      | Vite SPA. The screen is derived from the reducer state, no router (PRD §5.1).  |
| Zustand, Redux, Context-per-feature      | One `useReducer` in `src/game/reducer.ts`, no external state library.          |
| SWR, React Query, generic `useQuery`     | One fetch per game via `questionsRepo.getByLevel`, which never throws.         |
| Framer Motion, animation libraries       | Tailwind `motion-safe:` transitions only. Keep the bundle small (load < 2s).   |
| Virtualized lists, `React.lazy` splitting | The longest list is 10 review items. Not worth the complexity.                 |
| Compound components, render props        | The tree is shallow. Plain props and `children` are enough.                     |
| `useDebounce`, controlled forms          | There are no text inputs in the MVP.                                            |

## Layering

Keep logic out of components so it can be unit-tested and covered at 80%:

```
src/game/      pure functions (reducer, draw, scoring). No React, no I/O, no Date.now().
src/services/  I/O (Supabase, JSON fallback, analytics). No React.
src/hooks/     glue between React and the two layers above (useTimer, useQuestions, useBestScores).
src/screens/   one component per screen (HomeScreen, QuizScreen, ResultScreen). They get state + callbacks.
src/components/ presentational pieces (LevelCard, QuestionCard, Timer, FeedbackPanel, ProgressBar, ResultSummary).
```

A component never calls Supabase or `localStorage` directly. It calls a hook, and the hook calls a
service.

## State: one reducer, screens derived from it

`App.tsx` owns the only `useReducer` and picks the screen from `state.phase`. Pass state and
callbacks down as props: the tree is two levels deep, so a Context adds indirection without
benefit.

```tsx
export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  switch (state.phase) {
    case 'idle':
      return <HomeScreen onSelectLevel={(level) => dispatch({ type: 'SELECT_LEVEL', level })} />;
    case 'loading':
      return <LoadingScreen />;
    case 'question':
    case 'feedback':
      return <QuizScreen state={state} dispatch={dispatch} />;
    case 'result':
      return <ResultScreen state={state} dispatch={dispatch} />;
    case 'error':
      return <ErrorScreen onRetry={() => dispatch({ type: 'GO_HOME' })} />;
  }
}
```

Reducer rules:

- Model state as a **discriminated union on `phase`**, so `currentQuestion` cannot exist in
  `idle` and TypeScript checks the `switch` for exhaustiveness.
- An action that is invalid for the current phase returns the **same state object**. For example,
  `ANSWER` during `feedback` or `NEXT` during `question`. This makes double clicks, a key repeat,
  or `Enter` firing both a button click and the global shortcut harmless.
- No side effects in the reducer. Randomness (draw) happens before dispatch, and the drawn
  questions travel in `QUESTIONS_LOADED`.

## Custom hooks

### Loading questions (effect with cancellation)

```tsx
export function useQuestions(level: Level | null, dispatch: Dispatch<GameAction>) {
  useEffect(() => {
    if (!level) return;
    let cancelled = false; // GO_HOME or StrictMode remount before the fetch resolves

    questionsRepo.getByLevel(level).then((bank) => {
      if (cancelled) return;
      const drawn = drawQuestions(bank, readLastIds(level));
      if (drawn) dispatch({ type: 'QUESTIONS_LOADED', questions: drawn });
      else dispatch({ type: 'LOAD_FAILED' }); // bank too small even after JSON fallback
    });

    return () => {
      cancelled = true;
    };
  }, [level, dispatch]);
}
```

### Timer (timestamps, not tick counting)

The tick only triggers re-renders. The remaining time is always recomputed from
`performance.now()`, so throttled or skipped ticks never cause drift. Keep `onExpire` in a ref so
an inline callback does not restart the timer on every render.

```tsx
export function useTimer(durationMs: number, running: boolean, resetKey: unknown, onExpire: () => void) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!running) return;
    // Intentionally NOT paused when the tab is hidden: it prevents simple cheating
    // (switch tab, look up the answer, come back). See PRD §5.7.
    const deadline = performance.now() + durationMs;
    setRemainingMs(durationMs);

    const id = setInterval(() => {
      const left = Math.max(0, deadline - performance.now());
      setRemainingMs(left);
      if (left === 0) {
        clearInterval(id);
        onExpireRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [durationMs, running, resetKey]); // resetKey = question index

  return remainingMs;
}
```

Test it with `vi.useFakeTimers()` and `vi.advanceTimersByTime()`. Check that `performance.now()`
is faked too (add `'performance'` to `toFake` if it is not), otherwise the deadline never arrives.

### localStorage

Always go through a small helper with `try/catch`, because private mode can throw. Never let a
storage failure reach the UI.

```ts
export function readJson<T>(key: string, schema: z.ZodType<T>): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
```

## Component patterns

- **Small, typed props.** Pass the data a component needs (`statement`, `remainingMs`), not the
  whole game state. Callbacks are named `onAnswer`, `onNext`, `onSelectLevel`.
- **Composition with `children`** for repeated layout, such as a `ScreenShell` with the max width,
  padding and heading slot shared by all screens.
- **Memoization only when measured.** With 10 questions and one timer, `React.memo` and
  `useCallback` are usually noise. The exception is the `dispatch`-derived callbacks passed to a
  component that re-renders on every timer tick, where memoizing the static siblings
  (`QuestionCard`) is cheap and worthwhile.
- **Error boundary at the root**, with PT-BR fallback copy ("Algo deu errado. Voltar ao início.")
  and a button that resets the boundary and the game. Never show `error.message` to the user.

## Accessibility (WCAG 2.1 AA, PRD §4.4)

### Global keyboard shortcuts

```tsx
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    if (phase === 'question') {
      if (key === 'v' || key === 'arrowleft') onAnswer(true);
      else if (key === 'f' || key === 'arrowright') onAnswer(false);
    } else if (phase === 'feedback' && key === 'enter') {
      onNext(); // the reducer ignores a duplicate NEXT if a focused button also fired
    }
  }
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [phase, onAnswer, onNext]);
```

Show the shortcut on the buttons themselves (for example "Verdadeiro (V)").

### Focus management

On each phase or question change, move focus to the new screen's heading (`tabIndex={-1}`,
`ref.current?.focus()`), so screen readers announce the new content and keyboard users do not
stay on a disabled button. In feedback, focus the **Próxima** button.

### Live regions

- Feedback: `role="status"` / `aria-live="polite"` containing "✓ Correto" or "✗ Incorreto" (or
  "Tempo esgotado") plus the explanation. Never use color alone.
- Timer: a visually hidden `aria-live="polite"` node whose text changes only at 30, 20, 10 s
  (`Math.ceil(remainingMs / 10000) * 10`), not every second. The visual bar can update freely.

### Touch, responsive, motion

- Mobile-first: design at 360px, add `sm:` / `md:` upward. Answer buttons at least `min-h-11`
  (44px) and full width on mobile.
- Visible focus: `focus-visible:ring-2 focus-visible:ring-offset-2`. Never remove outlines
  without a replacement.
- Animations and transitions only under `motion-safe:` (for example
  `motion-safe:transition-[width]` on the timer bar).
- External doc links: `target="_blank" rel="noopener noreferrer"` plus visible text such as
  "(abre em nova aba)" or an equivalent `aria-label`.

## Copy

All user-facing text is Brazilian Portuguese, written for non-technical business users. Keep
identifiers, comments and test names in English unless the surrounding file does otherwise.

## Testing components (RTL)

- Query by role and accessible name (`getByRole('button', { name: /verdadeiro/i })`), which also
  checks the a11y contract.
- Use `userEvent` for clicks and keys (`await user.keyboard('v')`, `'{ArrowRight}'`, `'{Enter}'`).
- Test screens with a real reducer state built from fixture questions, not with mocked hooks,
  unless the hook does I/O.
