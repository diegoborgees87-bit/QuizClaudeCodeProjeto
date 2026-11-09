import { QUESTION_DURATION_MS } from '../game/reducer';
import { QUESTIONS_PER_GAME } from '../game/draw';
import { LEVEL_INFO } from '../game/levels';
import type { Level } from '../schemas/question';
import { FOCUS_RING } from './styles';

interface Props {
  level: Level;
  best: number | null;
  onSelect: (level: Level) => void;
}

export function LevelCard({ level, best, onSelect }: Props) {
  const info = LEVEL_INFO[level];
  return (
    <button
      type="button"
      onClick={() => onSelect(level)}
      className={`w-full rounded-xl border border-slate-300 bg-white p-4 text-left shadow-sm hover:border-indigo-600 motion-safe:transition-colors ${FOCUS_RING}`}
    >
      <span className="block text-lg font-semibold text-slate-900">{info.name}</span>
      <span className="mt-1 block text-slate-700">{info.description}</span>
      <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>
          {QUESTIONS_PER_GAME} perguntas · {QUESTION_DURATION_MS / 1000}s cada
        </span>
        {best !== null && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-900">
            Melhor: {best}/{QUESTIONS_PER_GAME}
          </span>
        )}
      </span>
    </button>
  );
}
