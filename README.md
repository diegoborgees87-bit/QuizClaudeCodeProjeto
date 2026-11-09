# Quizz Claude Code

Quiz de **Verdadeiro ou Falso** sobre o Claude Code, em português, para profissionais de negócio.
São 3 níveis (Iniciante, Intermediário e Avançado), 10 perguntas por partida, 30 segundos por
pergunta, feedback imediato com explicação e link para a documentação oficial, e uma tela de
resultado com revisão.

A especificação completa está em [`prd.md`](prd.md).

## Stack

React 18 + Vite + TypeScript, Tailwind CSS, Zod, Supabase (banco e analytics), Vitest + Testing
Library. Por enquanto o app roda só localmente (sem hospedagem publicada).

O jogo funciona **sem o Supabase**: as perguntas vêm de [`data/questions.json`](data/questions.json),
empacotado no build. Quando o Supabase está configurado, as perguntas vêm dele (com o JSON como
reserva) e cada partida é registrada de forma anônima.

## Rodar localmente

Requer Node.js 22.18 ou mais recente.

```bash
npm install
npm run dev          # http://localhost:5173
```

Sem um arquivo `.env`, o app usa o JSON local e não envia analytics. Para usar o Supabase, copie
`.env.example` para `.env` e preencha as variáveis (veja abaixo).

### Scripts

| Comando                     | O que faz                                                                 |
| --------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`               | Servidor de desenvolvimento                                               |
| `npm run build`             | Checagem de tipos + build de produção em `dist/`                          |
| `npm run preview`           | Serve o build de produção localmente                                      |
| `npm run lint`              | ESLint                                                                    |
| `npm run format`            | Prettier                                                                  |
| `npm run test`              | Todos os testes (uma execução)                                            |
| `npm run test:watch`        | Testes em modo observação                                                 |
| `npx vitest run --coverage` | Testes com cobertura (mínimo de 80% em `src/game` e `src/services`)       |
| `npm run seed`              | Envia `data/questions.json` para o Supabase (precisa da service role key) |

## Variáveis de ambiente

| Variável                    | Onde usar                                    | Para quê                                            |
| --------------------------- | -------------------------------------------- | --------------------------------------------------- |
| `VITE_SUPABASE_URL`         | `.env` local                                 | URL do projeto Supabase                             |
| `VITE_SUPABASE_ANON_KEY`    | `.env` local                                 | Chave pública (anon). Protegida pelas regras de RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **Só** no `.env` local ou no CI, para o seed | Chave de administrador: ignora o RLS                |

> **Nunca** prefixe a `SUPABASE_SERVICE_ROLE_KEY` com `VITE_` nem a importe em `src/`. Tudo que
> começa com `VITE_` vai para o JavaScript público do site.

## Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Aplique a migration [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql):
   com a Supabase CLI (`supabase link` e depois `supabase db push`) ou colando o arquivo no
   **SQL Editor** do painel. Ela cria as tabelas, as regras de RLS, a view `question_stats` e a
   função `finish_game_session`.
3. Em **Project Settings > API**, copie a URL, a chave `anon` e a chave `service_role` para o `.env`.
4. Rode `npm run seed` para enviar as perguntas.

Para ver a taxa de erro por pergunta, rode no SQL Editor (como administrador):

```sql
select * from public.question_stats order by error_rate desc nulls last;
```

## Atualizar as perguntas

1. Edite [`data/questions.json`](data/questions.json). Regras (verificadas pelos testes):
   - IDs no formato `beg-NNN`, `int-NNN` ou `adv-NNN`, sem repetição;
   - pelo menos 30 perguntas ativas por nível, com 45% a 55% de verdadeiras;
   - afirmação com até 200 caracteres e explicação com até 400;
   - `docUrl`, se houver, em `https://`. Use as páginas em português:
     `https://code.claude.com/docs/pt/<página>`.
2. Confira cada fato na [documentação oficial](https://code.claude.com/docs/pt/overview). Na
   dúvida, não inclua a pergunta. Evite dupla negação e pegadinhas.
3. Rode `npm run test`.
4. Rode `npm run seed`. Ele atualiza as perguntas pelo `id`. Perguntas removidas do JSON viram
   `active = false` no banco e nunca são apagadas, para preservar o histórico de respostas.

O app também usa o JSON como reserva quando o Supabase não responde.

## Estrutura

```
data/questions.json        banco de perguntas (fonte da verdade)
scripts/seed-questions.ts  envia o banco para o Supabase
supabase/migrations/       tabelas, RLS, view e função
src/game/                  regras puras: sorteio, pontuação, máquina de estados
src/services/              Supabase, perguntas com fallback, analytics, localStorage
src/hooks/                 timer, carregamento, analytics, atalhos, foco
src/screens/, components/  interface
tests/                     testes (Vitest + Testing Library + axe)
```

## Qualidade

- `npm run build`, `npm run lint` e `npm run test` precisam passar.
- Acessibilidade: WCAG 2.1 AA, operável só por teclado (`V`/`F` ou `←`/`→` para responder,
  `Enter` para avançar), alvos de toque de 44px, respeita `prefers-reduced-motion`.
  `tests/a11y.test.tsx` roda o axe em todas as telas. O contraste de cores não é medido no jsdom,
  então confira no navegador (Lighthouse ou axe DevTools) se mudar as cores.
- Na última medição (passo 9 do PRD), o Lighthouse deu 100 em Performance, Acessibilidade,
  Boas práticas e SEO, no perfil mobile e no desktop.
