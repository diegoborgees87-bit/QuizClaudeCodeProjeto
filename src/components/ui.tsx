import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { FOCUS_RING } from './styles';

/** Shared page frame: mobile-first column, 16px gutter, max width on larger screens. */
export function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6 sm:py-10">
      {children}
    </main>
  );
}

const VARIANTS = {
  primary: 'bg-indigo-700 text-white hover:bg-indigo-800',
  secondary: 'border border-slate-400 bg-white text-slate-900 hover:bg-slate-100',
  ghost: 'text-slate-700 underline underline-offset-4 hover:text-slate-900',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
}

/** Touch target of at least 44px (`min-h-11`) and a visible focus ring. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 font-semibold motion-safe:transition-colors ${VARIANTS[variant]} ${FOCUS_RING} ${className}`}
      {...props}
    />
  );
});
