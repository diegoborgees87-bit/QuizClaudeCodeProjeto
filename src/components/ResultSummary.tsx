import { answerLabel } from '../game/levels';
import type { AnswerRecord } from '../game/scoring';
import type { Question } from '../schemas/question';
import { DocLink } from './DocLink';
import { FOCUS_RING } from './styles';

interface Props {
  questions: Question[];
  answers: AnswerRecord[];
}

/** Review list of the game: statement, the user's answer, the right one, and the explanation. */
export function ResultSummary({ questions, answers }: Props) {
  const byId = new Map(answers.map((a) => [a.questionId, a]));

  return (
    <ol className="space-y-3">
      {questions.map((q, i) => {
        const a = byId.get(q.id);
        const correct = a?.isCorrect ?? false;
        const yours =
          a === undefined || a.userAnswer === null
            ? 'sem resposta (tempo esgotado)'
            : answerLabel(a.userAnswer);
        return (
          <li
            key={q.id}
            className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${
              correct ? 'border-emerald-700' : 'border-red-700'
            }`}
          >
            <p className="font-semibold text-slate-900">
              <span className="sr-only">Pergunta {i + 1}: </span>
              <span aria-hidden="true">{correct ? '✓' : '✗'} </span>
              {q.statement}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="sr-only">{correct ? 'Acertou. ' : 'Errou. '}</span>
              Sua resposta: <strong>{yours}</strong> · Correta:{' '}
              <strong>{answerLabel(q.answer)}</strong>
            </p>
            <details className="mt-2">
              <summary
                className={`inline-flex min-h-11 cursor-pointer items-center rounded font-medium text-indigo-800 ${FOCUS_RING}`}
              >
                Ver explicação
              </summary>
              <p className="mt-1 text-slate-800">{q.explanation}</p>
              {q.docUrl && <DocLink href={q.docUrl} className="mt-1" />}
            </details>
          </li>
        );
      })}
    </ol>
  );
}
