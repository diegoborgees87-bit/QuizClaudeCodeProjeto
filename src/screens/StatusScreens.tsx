import { Button, ScreenShell } from '../components/ui';
import { useFocusOnMount } from '../hooks/useFocusOnMount';

export function LoadingScreen() {
  return (
    <ScreenShell>
      <p role="status" className="m-auto text-lg text-slate-700">
        Carregando perguntas…
      </p>
    </ScreenShell>
  );
}

interface ErrorProps {
  message: string;
  onRetry: () => void;
  onHome: () => void;
}

export function ErrorScreen({ message, onRetry, onHome }: ErrorProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <ScreenShell>
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 outline-none">
        Não foi possível começar o quiz
      </h1>
      <p className="mt-2 text-slate-700">{message}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onRetry}>Tentar de novo</Button>
        <Button variant="secondary" onClick={onHome}>
          Voltar ao início
        </Button>
      </div>
    </ScreenShell>
  );
}
