import { ResultSummary } from '../components/ResultSummary';
import { Button, ScreenShell } from '../components/ui';
import { LEVEL_INFO } from '../game/levels';
import type { GameState } from '../game/reducer';
import { percent, resultMessage } from '../game/scoring';
import { useFocusOnMount } from '../hooks/useFocusOnMount';

interface Props {
  state: Extract<GameState, { status: 'result' }>;
  onRestart: () => void;
  onHome: () => void;
}

export function ResultScreen({ state, onRestart, onHome }: Props) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const total = state.questions.length;

  return (
    <ScreenShell>
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 outline-none">
        Resultado · Nível {LEVEL_INFO[state.level].name}
      </h1>

      <section
        className="mt-4 rounded-xl bg-white p-5 text-center shadow-sm"
        aria-label="Pontuação"
      >
        <p className="text-5xl font-bold text-slate-900">
          {state.score}/{total}
        </p>
        <p className="mt-1 text-slate-700">{percent(state.score, total)}% de acertos</p>
        <p className="mt-3 text-lg font-medium text-slate-900">
          {resultMessage(state.score, total)}
        </p>
      </section>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onRestart}>Jogar novamente</Button>
        <Button variant="secondary" onClick={onHome}>
          Escolher outro nível
        </Button>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Revisão</h2>
      <div className="mt-3">
        <ResultSummary questions={state.questions} answers={state.answers} />
      </div>
    </ScreenShell>
  );
}
