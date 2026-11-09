import { useCallback, useEffect, useRef } from 'react';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { ProgressBar } from '../components/ProgressBar';
import { QuestionCard } from '../components/QuestionCard';
import { Timer } from '../components/Timer';
import { Button, ScreenShell } from '../components/ui';
import { LEVEL_INFO } from '../game/levels';
import { QUESTION_DURATION_MS, type PlayingState } from '../game/reducer';
import { useQuizShortcuts } from '../hooks/useQuizShortcuts';
import { useTimer } from '../hooks/useTimer';

interface Props {
  state: PlayingState;
  onAnswer: (answer: boolean, responseTimeMs: number) => void;
  onTimeout: () => void;
  onNext: () => void;
  onQuit: () => void;
}

export function QuizScreen({ state, onAnswer, onTimeout, onNext, onQuit }: Props) {
  const { status, index, questions } = state;
  const question = questions[index];
  const answer = status === 'feedback' ? (state.answers[state.answers.length - 1] ?? null) : null;
  const isLast = index === questions.length - 1;

  const { remainingMs, getElapsedMs } = useTimer({
    durationMs: QUESTION_DURATION_MS,
    running: status === 'question',
    resetKey: index,
    onExpire: onTimeout,
  });

  const answerNow = useCallback(
    (value: boolean) => onAnswer(value, getElapsedMs()),
    [onAnswer, getElapsedMs],
  );
  useQuizShortcuts({ status, onAnswer: answerNow, onNext });

  // New question: focus the statement. Feedback: focus "Próxima" (the answer buttons are disabled).
  const statementRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (status === 'question') statementRef.current?.focus();
    else nextRef.current?.focus();
  }, [status, index]);

  return (
    <ScreenShell>
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold text-slate-900">
          Nível {LEVEL_INFO[state.level].name}
        </h1>
        <Button variant="ghost" onClick={onQuit}>
          Sair
        </Button>
      </header>

      <div className="mt-2 space-y-3">
        <ProgressBar current={index + 1} total={questions.length} />
        <Timer
          remainingMs={remainingMs}
          durationMs={QUESTION_DURATION_MS}
          running={status === 'question'}
        />
      </div>

      <div className="mt-5">
        <QuestionCard ref={statementRef} question={question} answer={answer} onAnswer={answerNow} />
      </div>

      {/* Always mounted so screen readers pick up the change when feedback appears. */}
      <div role="status" aria-live="polite" className="mt-5">
        {answer && <FeedbackPanel question={question} answer={answer} />}
      </div>

      {answer && (
        <div className="mt-4">
          <Button
            ref={nextRef}
            onClick={onNext}
            aria-keyshortcuts="Enter"
            className="w-full sm:w-auto"
          >
            {isLast ? 'Ver resultado' : 'Próxima'}
            {/* Keyboard hints only from sm up: phones have no physical keyboard. */}
            <span
              className="ml-2 hidden text-xs font-normal opacity-80 sm:inline"
              aria-hidden="true"
            >
              Enter
            </span>
          </Button>
        </div>
      )}
    </ScreenShell>
  );
}
