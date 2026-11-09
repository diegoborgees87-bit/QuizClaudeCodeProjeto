import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import type { AppDeps } from '../src/appDeps';
import { createLocalStore } from '../src/services/localStore';
import { makeBank, seeded } from './game/fixtures';
import { memoryStorage } from './helpers/memoryStorage';

/** 10 beginner questions: "Afirmação 1".."Afirmação 5" are true, 6..10 are false. */
const bank = makeBank(5, 5);

function setup(overrides: Partial<AppDeps> = {}, initialStorage: Record<string, string> = {}) {
  const storage = memoryStorage(initialStorage);
  let sessions = 0;
  const analytics = {
    startSession: vi.fn(() => `sess-${++sessions}`),
    recordAnswer: vi.fn(),
    finishSession: vi.fn(),
    abandonSession: vi.fn(),
    installUnloadHandlers: vi.fn(() => () => {}),
  };
  const repo = { getByLevel: vi.fn(async () => bank) };
  const deps: AppDeps = {
    repo,
    analytics,
    store: createLocalStore(() => storage),
    random: seeded(42),
    ...overrides,
  };
  render(<App deps={deps} />);
  return { analytics, repo, storage, user: userEvent.setup() };
}

const statementHeading = () => screen.getByRole('heading', { name: /^Afirmação \d+$/ });
const isTrue = () => Number(statementHeading().textContent?.replace('Afirmação ', '')) <= 5;

async function startBeginner(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /iniciante/i }));
  return screen.findByRole('heading', { name: /^Afirmação \d+$/ });
}

async function answerAll(user: ReturnType<typeof userEvent.setup>, pick: () => boolean) {
  for (let i = 0; i < bank.length; i++) {
    await user.click(screen.getByRole('button', { name: pick() ? /^Verdadeiro/ : /^Falso/ }));
    await user.click(screen.getByRole('button', { name: /próxima|ver resultado/i }));
  }
}

describe('App', () => {
  it('home mostra os 3 níveis e a melhor pontuação salva', () => {
    setup({}, { 'ccquiz:best:intermediate': '7' });
    expect(screen.getByRole('heading', { name: 'Quizz Claude Code' })).toHaveFocus();
    expect(screen.getByRole('button', { name: /iniciante/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /intermediário.*melhor: 7\/10/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /avançado/i })).not.toHaveTextContent('Melhor');
  });

  it('responder com clique mostra o feedback com explicação e foca "Próxima"', async () => {
    const { user } = setup();
    const heading = await startBeginner(user);
    expect(heading).toHaveFocus();
    expect(screen.getByText('Pergunta 1 de 10')).toBeInTheDocument();

    const right = isTrue();
    await user.click(screen.getByRole('button', { name: right ? /^Verdadeiro/ : /^Falso/ }));

    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto!');
    expect(screen.getByRole('status')).toHaveTextContent(/Explicação \d+/);
    expect(screen.getByRole('button', { name: /^Verdadeiro/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Falso/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /próxima/i })).toHaveFocus();
  });

  it('resposta errada mostra ✗ e a resposta correta', async () => {
    const { user } = setup();
    await startBeginner(user);
    const right = isTrue();
    await user.click(screen.getByRole('button', { name: right ? /^Falso/ : /^Verdadeiro/ }));
    expect(screen.getByRole('status')).toHaveTextContent('✗ Incorreto');
    expect(screen.getByRole('status')).toHaveTextContent(
      `A resposta correta é ${right ? 'Verdadeiro' : 'Falso'}`,
    );
    expect(screen.getByRole('button', { name: /✓ resposta correta/i })).toHaveTextContent(
      right ? 'Verdadeiro' : 'Falso',
    );
  });

  it('responde e avança só com o teclado (V/F, setas, Enter)', async () => {
    const { user } = setup();
    await startBeginner(user);
    const keys = [
      (t: boolean) => (t ? 'v' : 'f'),
      (t: boolean) => (t ? 'V' : 'F'),
      (t: boolean) => (t ? '{ArrowLeft}' : '{ArrowRight}'),
    ];
    for (let i = 0; i < bank.length; i++) {
      await user.keyboard(keys[i % keys.length](isTrue()));
      expect(screen.getByRole('status')).toHaveTextContent('✓ Correto!');
      await user.keyboard('{Enter}');
    }
    expect(screen.getByRole('heading', { name: /resultado/i })).toHaveFocus();
    expect(screen.getByText('10/10')).toBeInTheDocument();
  });

  it('Enter fora de um botão também avança, e uma resposta dupla é ignorada', async () => {
    const { user, analytics } = setup();
    await startBeginner(user);
    await user.keyboard('v');
    await user.keyboard('f'); // already in feedback: ignored
    expect(analytics.recordAnswer).toHaveBeenCalledTimes(1);
    statementHeading().focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Pergunta 2 de 10')).toBeInTheDocument();
  });

  it('tela de resultado mostra a pontuação certa, a mensagem e a revisão', async () => {
    const { user, analytics, storage } = setup();
    await startBeginner(user);
    // Acerta as verdadeiras e erra as falsas: 5/10.
    await answerAll(user, () => true);

    expect(screen.getByText('5/10')).toBeInTheDocument();
    expect(screen.getByText('50% de acertos')).toBeInTheDocument();
    expect(screen.getByText('Mandou bem! Você já entende o essencial.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getAllByText('Ver explicação')).toHaveLength(10);

    expect(analytics.startSession).toHaveBeenCalledWith('beginner');
    expect(analytics.recordAnswer).toHaveBeenCalledTimes(10);
    expect(analytics.recordAnswer).toHaveBeenLastCalledWith(
      'sess-1',
      expect.objectContaining({ position: 10, timedOut: false }),
    );
    expect(analytics.finishSession).toHaveBeenCalledWith('sess-1', 5);
    expect(analytics.abandonSession).not.toHaveBeenCalled();
    expect(storage.getItem('ccquiz:best:beginner')).toBe('5');
    expect(JSON.parse(storage.getItem('ccquiz:last:beginner') ?? '[]')).toHaveLength(10);
  });

  it('jogar novamente sorteia de novo e abre outra sessão; escolher nível volta à home com o recorde', async () => {
    const { user, analytics, repo } = setup();
    await startBeginner(user);
    await answerAll(user, isTrue);
    expect(screen.getByText('Excelente! Que tal tentar o próximo nível?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Jogar novamente' }));
    await screen.findByRole('heading', { name: /^Afirmação \d+$/ });
    expect(repo.getByLevel).toHaveBeenCalledTimes(2);
    expect(analytics.startSession).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(analytics.abandonSession).toHaveBeenCalledWith('sess-2');
    expect(screen.getByRole('button', { name: /iniciante.*melhor: 10\/10/i })).toBeInTheDocument();
  });

  it('sair no meio da partida volta para a home e marca abandono', async () => {
    const { user, analytics } = setup();
    await startBeginner(user);
    await user.keyboard('v');
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('heading', { name: 'Quizz Claude Code' })).toBeInTheDocument();
    expect(analytics.abandonSession).toHaveBeenCalledWith('sess-1');
    expect(analytics.finishSession).not.toHaveBeenCalled();
  });

  it('falha ao carregar mostra erro; "Tentar de novo" recarrega', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const getByLevel = vi
      .fn<AppDeps['repo']['getByLevel']>()
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValue(bank);
    const { user } = setup({ repo: { getByLevel } });
    await user.click(screen.getByRole('button', { name: /iniciante/i }));
    expect(
      await screen.findByRole('heading', { name: 'Não foi possível começar o quiz' }),
    ).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await screen.findByRole('heading', { name: /^Afirmação \d+$/ });
    vi.restoreAllMocks();
  });

  it('banco vazio mostra erro e "Voltar ao início" volta para a home', async () => {
    const { user } = setup({ repo: { getByLevel: async () => [] } });
    await user.click(screen.getByRole('button', { name: /avançado/i }));
    expect(
      await screen.findByText('Não encontramos perguntas para este nível.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(screen.getByRole('heading', { name: 'Quizz Claude Code' })).toBeInTheDocument();
  });

  describe('com fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'],
      });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('tempo esgotado abre o feedback como erro e registra timeout', async () => {
      const { analytics } = setup();
      fireEvent.click(screen.getByRole('button', { name: /iniciante/i }));
      await act(async () => {}); // resolve the repo promise
      expect(screen.getByText('30s')).toBeInTheDocument();
      expect(screen.getByText('Restam 30 segundos')).toBeInTheDocument();

      act(() => void vi.advanceTimersByTime(15_000));
      expect(screen.getByText('15s')).toBeInTheDocument();
      expect(screen.getByText('Restam 20 segundos')).toBeInTheDocument();

      act(() => void vi.advanceTimersByTime(15_000));
      expect(screen.getByRole('status')).toHaveTextContent('⏱ Tempo esgotado');
      expect(screen.getByRole('button', { name: /^Verdadeiro/ })).toBeDisabled();
      expect(analytics.recordAnswer).toHaveBeenCalledWith(
        'sess-1',
        expect.objectContaining({
          userAnswer: null,
          timedOut: true,
          isCorrect: false,
          position: 1,
        }),
      );

      // O timer não roda no feedback.
      act(() => void vi.advanceTimersByTime(60_000));
      expect(analytics.recordAnswer).toHaveBeenCalledTimes(1);
    });

    it('registra o tempo de resposta', async () => {
      const { analytics } = setup();
      fireEvent.click(screen.getByRole('button', { name: /iniciante/i }));
      await act(async () => {});
      act(() => void vi.advanceTimersByTime(4_000));
      fireEvent.keyDown(window, { key: 'v' });
      expect(analytics.recordAnswer).toHaveBeenCalledWith(
        'sess-1',
        expect.objectContaining({ responseTimeMs: 4_000 }),
      );
    });
  });
});
