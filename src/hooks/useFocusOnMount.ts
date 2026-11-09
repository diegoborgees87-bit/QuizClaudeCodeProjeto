import { useEffect, useRef } from 'react';

/**
 * Moves focus to the returned element when the screen mounts, so a screen reader announces the
 * new screen and keyboard users don't stay on a button that no longer exists. Give the target
 * `tabIndex={-1}`.
 */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
