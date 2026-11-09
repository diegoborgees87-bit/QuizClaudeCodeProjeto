import type { Level } from '../schemas/question';

export interface LevelInfo {
  name: string;
  description: string;
}

/** User-facing copy for each level (PRD §3.1). */
export const LEVEL_INFO: Record<Level, LevelInfo> = {
  beginner: {
    name: 'Iniciante',
    description: 'O que é o Claude Code, para que serve e quais são seus limites.',
  },
  intermediate: {
    name: 'Intermediário',
    description: 'Como os times usam o Claude Code no dia a dia.',
  },
  advanced: {
    name: 'Avançado',
    description: 'Extensões e governança: MCP, hooks, subagents e skills.',
  },
};

export function answerLabel(answer: boolean): string {
  return answer ? 'Verdadeiro' : 'Falso';
}
