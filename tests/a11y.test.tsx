import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import App from '../src/App';
import type { AppDeps } from '../src/appDeps';
import { createLocalStore } from '../src/services/localStore';
import { makeBank, seeded } from './game/fixtures';
import { memoryStorage } from './helpers/memoryStorage';

/**
 * Automated WCAG 2.1 A/AA checks on every screen (PRD §4.4). jsdom has no layout, so axe can't
 * measure color contrast here; contrast was checked by running axe and Lighthouse in real Chrome at
 * 360px and 1280px (PRD §10 step 9). Re-check it in a browser after changing colors.
 */
async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
    rules: { 'color-contrast': { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

function setup(repo: AppDeps['repo'] = { getByLevel: async () => makeBank(5, 5) }) {
  const deps: AppDeps = {
    repo,
    analytics: {
      startSession: () => 'sess',
      recordAnswer: () => {},
      finishSession: () => {},
      abandonSession: () => {},
      installUnloadHandlers: () => () => {},
    },
    store: createLocalStore(() => memoryStorage({ 'ccquiz:best:beginner': '7' })),
    random: seeded(1),
  };
  const { container } = render(<App deps={deps} />);
  return { container, user: userEvent.setup() };
}

describe('acessibilidade (axe)', () => {
  it('home, pergunta, feedback e resultado sem violações', async () => {
    const { container, user } = setup();
    await expectNoViolations(container);

    await user.click(screen.getByRole('button', { name: /iniciante/i }));
    await screen.findByRole('heading', { name: /^Afirmação \d+$/ });
    await expectNoViolations(container);

    await user.keyboard('v');
    await expectNoViolations(container);

    for (let i = 0; i < 10; i++) {
      if (i > 0) await user.keyboard('f');
      await user.click(screen.getByRole('button', { name: /próxima|ver resultado/i }));
    }
    await screen.findByRole('heading', { name: /resultado/i });
    await expectNoViolations(container);
  });

  it('tela de erro sem violações', async () => {
    const { container, user } = setup({ getByLevel: async () => [] });
    await user.click(screen.getByRole('button', { name: /avançado/i }));
    await screen.findByRole('heading', { name: 'Não foi possível começar o quiz' });
    await expectNoViolations(container);
  });
});
