import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('App (smoke)', () => {
  it('renderiza o título', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Quizz Claude Code' })).toBeInTheDocument();
  });
});
