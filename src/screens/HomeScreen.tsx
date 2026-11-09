import { LevelCard } from '../components/LevelCard';
import { ScreenShell } from '../components/ui';
import { useFocusOnMount } from '../hooks/useFocusOnMount';
import { LEVELS, type Level } from '../schemas/question';
import type { BestScores } from '../services/localStore';

interface Props {
  best: BestScores;
  onSelectLevel: (level: Level) => void;
}

export function HomeScreen({ best, onSelectLevel }: Props) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <ScreenShell>
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-slate-900 outline-none">
        Quizz Claude Code
      </h1>
      <p className="mt-2 text-lg text-slate-700">
        Teste seus conhecimentos sobre Claude Code em 5 minutos.
      </p>
      <p className="mt-1 text-slate-600">
        Responda Verdadeiro ou Falso e veja a explicação de cada resposta.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Escolha um nível</h2>
      <ul className="mt-3 space-y-3">
        {LEVELS.map((level) => (
          <li key={level}>
            <LevelCard level={level} best={best[level]} onSelect={onSelectLevel} />
          </li>
        ))}
      </ul>
    </ScreenShell>
  );
}
