interface Props {
  /** 1-based */
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: Props) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">
        Pergunta {current} de {total}
      </p>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div
          className="h-full rounded-full bg-indigo-700 motion-safe:transition-[width] motion-safe:duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
