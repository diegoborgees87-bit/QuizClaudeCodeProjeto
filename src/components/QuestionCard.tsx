import { forwardRef } from 'react';
import { answerLabel } from '../game/levels';
import type { AnswerRecord } from '../game/scoring';
import type { Question } from '../schemas/question';
import { FOCUS_RING } from './styles';

interface Props {
  question: Question;
  /** Set during feedback: the buttons lock and show which one was right. */
  answer: AnswerRecord | null;
  onAnswer: (answer: boolean) => void;
}

const OPTIONS = [
  { value: true, key: 'V', keys: 'V ArrowLeft' },
  { value: false, key: 'F', keys: 'F ArrowRight' },
] as const;

/** The statement is the focus target on each new question, so screen readers read it first. */
export const QuestionCard = forwardRef<HTMLHeadingElement, Props>(function QuestionCard(
  { question, answer, onAnswer },
  headingRef,
) {
  const locked = answer !== null;

  return (
    <section aria-labelledby="question-statement">
      <h2
        id="question-statement"
        ref={headingRef}
        tabIndex={-1}
        className="rounded-xl bg-white p-5 text-xl leading-snug font-semibold text-slate-900 shadow-sm outline-none sm:text-2xl"
      >
        {question.statement}
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value, key, keys }) => {
          const isRight = locked && value === question.answer;
          const isWrongPick = locked && answer.userAnswer === value && !answer.isCorrect;
          const tone = isRight
            ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
            : isWrongPick
              ? 'border-red-700 bg-red-50 text-red-950'
              : locked
                ? 'border-slate-300 bg-slate-50 text-slate-600'
                : 'border-slate-400 bg-white text-slate-900 hover:border-indigo-600 hover:bg-indigo-50';
          return (
            <button
              key={key}
              type="button"
              disabled={locked}
              aria-keyshortcuts={keys}
              onClick={() => onAnswer(value)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl border-2 px-4 py-3 text-lg font-semibold motion-safe:transition-colors ${tone} ${FOCUS_RING}`}
            >
              <span>{answerLabel(value)}</span>
              {isRight && <span className="text-sm font-medium">✓ Resposta correta</span>}
              {isWrongPick && <span className="text-sm font-medium">✗ Sua resposta</span>}
              {!locked && (
                <span className="text-xs font-normal text-slate-600" aria-hidden="true">
                  tecla {key}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
});
