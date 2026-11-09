import { timerAnnouncement } from '../game/timer';

interface Props {
  remainingMs: number;
  durationMs: number;
  running: boolean;
}

/** Last stretch where the bar turns red (PRD §4.2). */
const WARNING_MS = 10_000;

export function Timer({ remainingMs, durationMs, running }: Props) {
  const seconds = Math.ceil(remainingMs / 1000);
  const warning = remainingMs <= WARNING_MS;
  const pct = durationMs > 0 ? (remainingMs / durationMs) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">Tempo</span>
        <span className={warning ? 'font-bold text-red-800' : 'font-medium text-slate-800'}>
          {seconds}s
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div
          className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-linear ${
            warning ? 'bg-red-600' : 'bg-emerald-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Announced every 10s, not every second (PRD §4.4). */}
      <p className="sr-only" aria-live="polite">
        {running ? timerAnnouncement(remainingMs) : ''}
      </p>
    </div>
  );
}
