import { act, renderHook } from '@testing-library/react';
import { TIMER_TICK_MS, useTimer, type TimerOptions } from '../../src/hooks/useTimer';

const DURATION = 30_000;

function setup(initial: Partial<TimerOptions> = {}) {
  const onExpire = vi.fn();
  const props: TimerOptions = {
    durationMs: DURATION,
    running: true,
    resetKey: 0,
    onExpire,
    ...initial,
  };
  const hook = renderHook((p: TimerOptions) => useTimer(p), { initialProps: props });
  const rerender = (next: Partial<TimerOptions>) => hook.rerender({ ...props, ...next });
  return { ...hook, onExpire, rerender };
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'],
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useTimer', () => {
  it('começa cheio e conta para baixo', () => {
    const { result } = setup();
    expect(result.current.remainingMs).toBe(DURATION);
    advance(10_000);
    expect(result.current.remainingMs).toBe(20_000);
    expect(result.current.getElapsedMs()).toBe(10_000);
  });

  it('expira em 30s e chama onExpire uma única vez', () => {
    const { result, onExpire } = setup();
    advance(DURATION - TIMER_TICK_MS);
    expect(onExpire).not.toHaveBeenCalled();
    advance(TIMER_TICK_MS);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(result.current.remainingMs).toBe(0);
    advance(10_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('não dispara após desmontar', () => {
    const { unmount, onExpire } = setup();
    advance(5_000);
    unmount();
    advance(DURATION);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('para quando a pergunta é respondida (running=false) e congela o tempo', () => {
    const { result, rerender, onExpire } = setup();
    advance(12_000);
    rerender({ running: false });
    advance(DURATION);
    expect(onExpire).not.toHaveBeenCalled();
    expect(result.current.remainingMs).toBe(18_000);
  });

  it('reinicia cheio na próxima pergunta', () => {
    const { result, rerender, onExpire } = setup();
    advance(20_000);
    rerender({ running: false });
    rerender({ running: true, resetKey: 1 });
    expect(result.current.remainingMs).toBe(DURATION);
    advance(DURATION - TIMER_TICK_MS);
    expect(onExpire).not.toHaveBeenCalled();
    advance(TIMER_TICK_MS);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('reinicia ao trocar resetKey mesmo sem parar', () => {
    const { result, rerender } = setup();
    advance(20_000);
    rerender({ resetKey: 1 });
    expect(result.current.remainingMs).toBe(DURATION);
    expect(result.current.getElapsedMs()).toBe(0);
  });

  it('não inicia enquanto running=false', () => {
    const { result, onExpire } = setup({ running: false });
    advance(DURATION * 2);
    expect(onExpire).not.toHaveBeenCalled();
    expect(result.current.remainingMs).toBe(DURATION);
  });

  it('usa o onExpire mais recente sem reiniciar a contagem', () => {
    const { result, rerender, onExpire } = setup();
    advance(10_000);
    const latest = vi.fn();
    rerender({ onExpire: latest });
    expect(result.current.remainingMs).toBe(20_000);
    advance(20_000);
    expect(latest).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('calcula pelo relógio, não pelos ticks (aba em segundo plano continua contando)', () => {
    const { result, onExpire } = setup();
    const start = performance.now();
    // O navegador segurou o intervalo: 15s passaram no relógio e só um tick chega.
    const now = vi.spyOn(performance, 'now').mockReturnValue(start + 15_000);
    advance(TIMER_TICK_MS);
    expect(result.current.remainingMs).toBe(15_000);
    // Mais um salto além do prazo: o próximo tick expira na hora.
    now.mockReturnValue(start + 40_000);
    advance(TIMER_TICK_MS);
    expect(result.current.remainingMs).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('getElapsedMs fica limitado à duração', () => {
    const { result, rerender } = setup();
    advance(DURATION);
    rerender({ running: false });
    advance(60_000);
    expect(result.current.getElapsedMs()).toBe(DURATION);
  });
});
