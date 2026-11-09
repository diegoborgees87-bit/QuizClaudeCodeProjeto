import { FOCUS_RING } from './styles';

export function DocLink({ href, className = '' }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Saiba mais na documentação (abre em nova aba)"
      className={`inline-flex min-h-11 items-center rounded font-semibold text-indigo-800 underline underline-offset-4 hover:text-indigo-950 ${FOCUS_RING} ${className}`}
    >
      Saiba mais na documentação
      {/* An SVG, not "↗": Windows renders that character as a color emoji. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="ml-1 h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 3h7v7M13 3 4 12" />
      </svg>
    </a>
  );
}
