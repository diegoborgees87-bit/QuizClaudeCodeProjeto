import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackPanel } from '../../src/components/FeedbackPanel';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { ResultSummary } from '../../src/components/ResultSummary';
import { Timer } from '../../src/components/Timer';
import { buildAnswer } from '../../src/game/scoring';
import { timerAnnouncement } from '../../src/game/timer';
import { makeQuestion } from '../game/fixtures';

const question = { ...makeQuestion(1, true), docUrl: 'https://code.claude.com/docs/pt/overview' };

describe('FeedbackPanel', () => {
  it('acerto: ícone + texto, resposta correta, explicação e link', () => {
    render(<FeedbackPanel question={question} answer={buildAnswer(question, true, 1000)} />);
    expect(screen.getByText('✓ Correto!')).toBeInTheDocument();
    expect(screen.getByText('Verdadeiro')).toBeInTheDocument();
    expect(screen.getByText('Explicação 1')).toBeInTheDocument();
    const link = screen.getByRole('link', {
      name: /saiba mais na documentação \(abre em nova aba\)/i,
    });
    expect(link).toHaveAttribute('href', question.docUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('erro', () => {
    render(<FeedbackPanel question={question} answer={buildAnswer(question, false, 1000)} />);
    expect(screen.getByText('✗ Incorreto')).toBeInTheDocument();
  });

  it('tempo esgotado, sem link quando não há docUrl', () => {
    const q = makeQuestion(2, false);
    render(<FeedbackPanel question={q} answer={buildAnswer(q, null, 30_000)} />);
    expect(screen.getByText('⏱ Tempo esgotado')).toBeInTheDocument();
    expect(screen.getByText(/sem resposta conta como erro/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('Timer', () => {
  it('anuncia só a cada 10s', () => {
    expect(timerAnnouncement(30_000)).toBe('Restam 30 segundos');
    expect(timerAnnouncement(20_001)).toBe('Restam 30 segundos');
    expect(timerAnnouncement(20_000)).toBe('Restam 20 segundos');
    expect(timerAnnouncement(9_999)).toBe('Restam 10 segundos');
    expect(timerAnnouncement(0)).toBe('');
  });

  it('mostra os segundos e fica em silêncio quando parado', () => {
    const { rerender } = render(<Timer remainingMs={12_300} durationMs={30_000} running />);
    expect(screen.getByText('13s')).toBeInTheDocument();
    expect(screen.getByText('Restam 20 segundos')).toBeInTheDocument();
    rerender(<Timer remainingMs={12_300} durationMs={30_000} running={false} />);
    expect(screen.queryByText(/restam/i)).not.toBeInTheDocument();
  });
});

describe('ResultSummary', () => {
  it('lista cada pergunta com a resposta dada e a correta', () => {
    const q2 = makeQuestion(2, false);
    render(
      <ResultSummary
        questions={[question, q2]}
        answers={[buildAnswer(question, true, 1), buildAnswer(q2, null, 30_000)]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Acertou');
    expect(items[0]).toHaveTextContent('Sua resposta: Verdadeiro');
    expect(items[1]).toHaveTextContent('Errou');
    expect(items[1]).toHaveTextContent('sem resposta (tempo esgotado)');
    expect(items[1]).toHaveTextContent('Correta: Falso');
  });
});

describe('ErrorBoundary', () => {
  it('mostra mensagem amigável e reinicia ao clicar', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // React rethrows render errors to window in dev; jsdom would print the stack.
    const silence = (e: ErrorEvent) => e.preventDefault();
    window.addEventListener('error', silence);
    let shouldThrow = true;
    function Bomb() {
      if (shouldThrow) throw new Error('detalhe técnico');
      return <p>de volta</p>;
    }
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Algo deu errado.' })).toBeInTheDocument();
    expect(screen.queryByText(/detalhe técnico/)).not.toBeInTheDocument();
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(screen.getByText('de volta')).toBeInTheDocument();
    window.removeEventListener('error', silence);
    vi.restoreAllMocks();
  });
});
