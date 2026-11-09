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
      <span aria-hidden="true">&nbsp;↗</span>
    </a>
  );
}
