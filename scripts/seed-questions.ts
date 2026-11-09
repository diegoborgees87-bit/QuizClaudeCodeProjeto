/**
 * Upserts data/questions.json into public.questions (PRD §7).
 *
 *   npm run seed
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (or VITE_SUPABASE_URL) in .env or the
 * environment. Run locally or in CI only: the service role key bypasses RLS and must never be
 * prefixed with VITE_ or imported from src/.
 *
 * - Aborts if any question fails the Zod schema or IDs repeat (nothing is written).
 * - Upserts by id.
 * - Questions in the DB that are no longer in the JSON are set to active=false, never deleted,
 *   so answer history is preserved.
 */
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { questionSchema, type Question } from '../src/schemas/question.ts';

function fail(message: string): never {
  console.error(`seed: ${message}`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  fail('defina SUPABASE_SERVICE_ROLE_KEY e SUPABASE_URL (ou VITE_SUPABASE_URL) no .env');
}

const raw: unknown = JSON.parse(
  await readFile(new URL('../data/questions.json', import.meta.url), 'utf8'),
);
if (!Array.isArray(raw)) fail('data/questions.json deve ser um array');

const questions: Question[] = [];
const errors: string[] = [];
for (const [i, item] of raw.entries()) {
  const r = questionSchema.safeParse(item);
  if (r.success) questions.push(r.data);
  else errors.push(`#${i}: ${r.error.message}`);
}
const ids = questions.map((q) => q.id);
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
if (duplicates.length) errors.push(`IDs repetidos: ${[...new Set(duplicates)].join(', ')}`);
if (errors.length) fail(`banco inválido, nada foi gravado:\n${errors.join('\n')}`);

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const now = new Date().toISOString();
const rows = questions.map((q) => ({
  id: q.id,
  level: q.level,
  statement: q.statement,
  answer: q.answer,
  explanation: q.explanation,
  doc_url: q.docUrl ?? null,
  topic: q.topic ?? null,
  active: q.active,
  updated_at: now,
}));

const { error: upsertError } = await supabase.from('questions').upsert(rows, { onConflict: 'id' });
if (upsertError) fail(`upsert falhou: ${upsertError.message}`);

const { data: existing, error: selectError } = await supabase
  .from('questions')
  .select('id')
  .eq('active', true);
if (selectError) fail(`leitura falhou: ${selectError.message}`);

const keep = new Set(ids);
const removed = (existing ?? []).map((r: { id: string }) => r.id).filter((id) => !keep.has(id));
if (removed.length) {
  const { error } = await supabase
    .from('questions')
    .update({ active: false, updated_at: now })
    .in('id', removed);
  if (error) fail(`desativação falhou: ${error.message}`);
}

console.log(
  `seed: ${rows.length} perguntas gravadas (upsert), ${removed.length} desativadas${
    removed.length ? `: ${removed.join(', ')}` : ''
  }.`,
);
