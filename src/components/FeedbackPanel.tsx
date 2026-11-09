import { answerLabel } from '../game/levels';
import type { AnswerRecord } from '../game/scoring';
import type { Question } from '../schemas/question';
import { DocLink } from './DocLink';

interface Props {
  question: Question;
  answer: AnswerRecord;
}

function feedbackTitle(answer: AnswerRecord): string {
  if (answer.timedOut) return '⏱ Tempo esgotado';
  return answer.isCorrect ? '✓ Correto!' : '✗ Incorreto';
}

/** Content of the feedback live region. Icon + text, never color alone (PRD §4.4). */
export function FeedbackPanel({ question, answer }: Props) {
  const tone = answer.isCorrect
    ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
    : 'border-red-700 bg-red-50 text-red-950';

  return (
    <div className={`rounded-xl border-l-4 p-4 ${tone}`}>
      <p className="text-lg font-bold">{feedbackTitle(answer)}</p>
      {answer.timedOut && <p className="text-sm">Sem resposta conta como erro.</p>}
      <p className="mt-2">
        A resposta correta é <strong>{answerLabel(question.answer)}</strong>.
      </p>
      <p className="mt-2 text-slate-900">{question.explanation}</p>
      {question.docUrl && <DocLink href={question.docUrl} className="mt-3" />}
    </div>
  );
}
