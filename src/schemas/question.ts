import { z } from 'zod';

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const levelSchema = z.enum(LEVELS);
export type Level = z.infer<typeof levelSchema>;

/** ID prefix per level: `beg-001`, `int-001`, `adv-001`. */
export const ID_PREFIX: Record<Level, string> = {
  beginner: 'beg',
  intermediate: 'int',
  advanced: 'adv',
};

export const STATEMENT_MAX = 200;
export const EXPLANATION_MAX = 400;

export const questionSchema = z
  .object({
    id: z
      .string()
      .regex(/^(beg|int|adv)-\d{3}$/, 'id deve seguir o padrão beg-NNN, int-NNN ou adv-NNN'),
    level: levelSchema,
    statement: z.string().trim().min(1).max(STATEMENT_MAX),
    answer: z.boolean(),
    explanation: z.string().trim().min(1).max(EXPLANATION_MAX),
    docUrl: z.url({ protocol: /^https$/ }).optional(),
    topic: z.string().trim().min(1).optional(),
    active: z.boolean().default(true),
  })
  .refine((q) => q.id.startsWith(`${ID_PREFIX[q.level]}-`), {
    message: 'o prefixo do id não corresponde ao nível',
    path: ['id'],
  });

export type Question = z.infer<typeof questionSchema>;

/**
 * Validates an untrusted list (Supabase rows already mapped to camelCase, or the bundled JSON).
 * Invalid items are dropped with `console.warn` instead of failing the whole list, so one bad
 * row never breaks a game.
 */
export function parseQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) {
    console.warn('[questions] esperado um array, recebido:', typeof raw);
    return [];
  }
  const valid: Question[] = [];
  for (const item of raw) {
    const result = questionSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      const id = (item as { id?: unknown } | null)?.id;
      console.warn(
        `[questions] pergunta inválida descartada (id=${String(id)}):`,
        z.prettifyError(result.error),
      );
    }
  }
  return valid;
}
