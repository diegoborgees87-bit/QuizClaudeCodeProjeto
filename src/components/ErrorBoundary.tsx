import { Component, Fragment, type ReactNode } from 'react';
import { Button, ScreenShell } from './ui';

interface State {
  hasError: boolean;
  /** Bumped on reset so the app remounts with a fresh game state. */
  resets: number;
}

/** Root fallback. Never shows the technical error to the user. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, resets: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[app] erro inesperado:', error);
  }

  private reset = () => this.setState((s) => ({ hasError: false, resets: s.resets + 1 }));

  render() {
    if (this.state.hasError) {
      return (
        <ScreenShell>
          <h1 className="text-2xl font-bold text-slate-900">Algo deu errado.</h1>
          <p className="mt-2 text-slate-700">
            Sua partida foi interrompida. Você pode começar de novo.
          </p>
          <div className="mt-5">
            <Button onClick={this.reset}>Voltar ao início</Button>
          </div>
        </ScreenShell>
      );
    }
    return <Fragment key={this.state.resets}>{this.props.children}</Fragment>;
  }
}
