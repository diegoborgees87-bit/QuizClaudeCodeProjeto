import { useEffect } from 'react';

interface Options {
  status: 'question' | 'feedback';
  onAnswer: (answer: boolean) => void;
  onNext: () => void;
}

/** Elements that already handle Enter themselves (a focused link or button). */
const INTERACTIVE = 'a, button, summary, input, select, textarea';

/**
 * Global shortcuts (PRD §4.2): `V`/`←` = Verdadeiro, `F`/`→` = Falso, `Enter` = next.
 * The reducer ignores actions that don't fit the current status, so a duplicate (key repeat,
 * button click plus shortcut) is harmless.
 */
export function useQuizShortcuts({ status, onAnswer, onNext }: Options): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      if (status === 'question') {
        if (key === 'v' || key === 'arrowleft') {
          e.preventDefault();
          onAnswer(true);
        } else if (key === 'f' || key === 'arrowright') {
          e.preventDefault();
          onAnswer(false);
        }
      } else if (key === 'enter') {
        // Enter on the focused "Próxima" button clicks it; on the doc link it opens the link.
        if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [status, onAnswer, onNext]);
}
