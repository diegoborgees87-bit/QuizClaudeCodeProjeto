import {
  bestKey,
  createLocalStore,
  lastKey,
  localStore,
  safeLocalStorage,
} from '../../src/services/localStore';
import { memoryStorage, throwingStorage } from '../helpers/memoryStorage';

describe('localStore', () => {
  it('usa as chaves do PRD §5.8', () => {
    expect(bestKey('beginner')).toBe('ccquiz:best:beginner');
    expect(lastKey('advanced')).toBe('ccquiz:last:advanced');
  });

  it('melhor pontuação: só grava quando supera a anterior', () => {
    const storage = memoryStorage();
    const store = createLocalStore(() => storage);
    expect(store.readBest('beginner')).toBeNull();
    expect(store.writeBest('beginner', 6)).toBe(true);
    expect(store.writeBest('beginner', 4)).toBe(false);
    expect(store.writeBest('beginner', 6)).toBe(false);
    expect(store.readBest('beginner')).toBe(6);
    expect(store.writeBest('beginner', 9)).toBe(true);
    expect(store.readAllBest()).toEqual({ beginner: 9, intermediate: null, advanced: null });
  });

  it.each(['abc', '11', '-1', '3.5', ''])('ignora melhor pontuação inválida (%j)', (raw) => {
    const store = createLocalStore(() => memoryStorage({ 'ccquiz:best:beginner': raw }));
    expect(store.readBest('beginner')).toBeNull();
  });

  it('IDs da última partida: grava e lê', () => {
    const storage = memoryStorage();
    const store = createLocalStore(() => storage);
    expect(store.readLastIds('beginner')).toEqual([]);
    store.writeLastIds('beginner', ['beg-001', 'beg-002']);
    expect(store.readLastIds('beginner')).toEqual(['beg-001', 'beg-002']);
    expect(store.readLastIds('advanced')).toEqual([]);
  });

  it.each(['não é json', '{"a":1}', '[1,2]', 'null'])(
    'ignora última partida inválida (%j)',
    (raw) => {
      const store = createLocalStore(() => memoryStorage({ 'ccquiz:last:beginner': raw }));
      expect(store.readLastIds('beginner')).toEqual([]);
    },
  );

  it('nunca lança quando o storage falha ou não existe', () => {
    for (const storage of [throwingStorage(), null]) {
      const store = createLocalStore(() => storage);
      expect(store.readBest('beginner')).toBeNull();
      expect(store.writeBest('beginner', 5)).toBe(true);
      expect(store.readLastIds('beginner')).toEqual([]);
      expect(() => store.writeLastIds('beginner', ['beg-001'])).not.toThrow();
    }
  });

  it('safeLocalStorage devolve o localStorage do navegador, ou null se o acesso lançar', () => {
    expect(safeLocalStorage()).toBe(window.localStorage);
    const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(safeLocalStorage()).toBeNull();
    spy.mockRestore();
  });

  it('a instância padrão usa o localStorage real', () => {
    window.localStorage.clear();
    localStore.writeLastIds('intermediate', ['int-001']);
    expect(window.localStorage.getItem('ccquiz:last:intermediate')).toBe('["int-001"]');
    window.localStorage.clear();
  });
});
