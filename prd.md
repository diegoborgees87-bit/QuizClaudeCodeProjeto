# PRD — Quizz Claude Code (Verdadeiro ou Falso)

> Documento de requisitos de produto. Consumido pelo Claude Code para construir o projeto.
> Versão: 1.0 · Data: 2026-11-08 · Status: Aprovado para MVP

---

## 1. Visão geral

Um quiz web de **Verdadeiro ou Falso** sobre o **Claude Code**, em **português (BR)**, voltado a **profissionais de negócio** (gestores, POs, analistas, líderes de time). O objetivo é ensinar, de forma rápida e leve, o que é o Claude Code, como ele funciona e quais conceitos sustentam seu uso — do básico (valor de negócio) até conceitos avançados (MCP, hooks, subagents, skills) explicados sem exigir conhecimento de programação.

### 1.1 Problema
Profissionais de negócio ouvem falar de Claude Code mas não sabem o que ele faz, o que ele *não* faz, nem entendem os termos técnicos usados pelos times de engenharia. Materiais existentes são longos e técnicos.

### 1.2 Solução
Rodadas curtas (10 perguntas, ~5 min) de Verdadeiro/Falso com **feedback imediato e explicação curta** após cada resposta, permitindo aprender errando.

### 1.3 Objetivos de negócio
| Objetivo | Métrica | Meta MVP |
|---|---|---|
| Educar sobre Claude Code | % de partidas concluídas (chegam ao resultado) | ≥ 70% |
| Identificar lacunas de conhecimento | Taxa de erro por pergunta (via Supabase) | Disponível em consulta SQL |
| Engajamento | Partidas por sessão de navegador | ≥ 1,5 |
| Progressão | % de jogadores que jogam mais de um nível | ≥ 30% |

### 1.4 Fora de escopo (MVP)
- Login/autenticação e contas de usuário
- Ranking global, apelidos, captura de e-mail/leads
- Compartilhamento em redes sociais
- Modo escuro, internacionalização (só PT-BR)
- Geração de perguntas por IA
- Painel administrativo de perguntas (edição é feita no JSON + script de seed)

---

## 2. Público-alvo e personas

**Persona principal — Marina, Gerente de Produto (não programa)**
- Quer entender o que o time de engenharia quer dizer com "o Claude Code fez o PR".
- Tem 5 minutos entre reuniões. Joga pelo celular ou notebook.
- Precisa de linguagem simples; termos técnicos sempre com explicação.

**Persona secundária — Rafael, Analista de Dados iniciando com IA**
- Já usou ChatGPT/Claude no navegador, quer saber o que muda no Claude Code.
- Interessado nos níveis intermediário e avançado.

---

## 3. Conteúdo: níveis e banco de perguntas

### 3.1 Níveis (selecionáveis livremente, sem desbloqueio)

| Nível | Foco | Exemplos de temas |
|---|---|---|
| **Iniciante (Negócio)** | O que é, para que serve, valor, limites | Onde roda (terminal, desktop, web, IDE), que tipo de tarefa faz, pede permissão, não substitui revisão humana, linguagens suportadas |
| **Intermediário** | Uso no dia a dia | CLAUDE.md, plan mode, comandos com `/` (ex.: `/clear`), modos de permissão, contexto da conversa, revisão de código, git/PRs |
| **Avançado (conceitos técnicos acessíveis)** | Extensibilidade e governança | MCP, hooks, subagents, skills, plugins, uso em CI/automação, settings e permissões corporativas, memória |

### 3.2 Regras do banco de perguntas
- **Tamanho mínimo:** 90 perguntas — **30 por nível**.
- **Balanceamento:** cada nível com ~50% verdadeiras e ~50% falsas (tolerância 45–55%).
- Cada pergunta é **uma afirmação** curta (≤ 200 caracteres), sem dupla negação, sem pegadinhas de palavra.
- Cada pergunta tem **explicação** (≤ 400 caracteres) em linguagem de negócio, explicando *por que* é V ou F.
- Cada pergunta tem **link para a documentação oficial** (`https://docs.claude.com/...` / `https://code.claude.com/docs/...`) quando aplicável.
- Conteúdo deve ser **factualmente verificado** contra a documentação oficial do Claude Code no momento da construção. Na dúvida, descartar a pergunta.
- Termos técnicos no nível avançado devem vir explicados na própria afirmação ou na explicação.

### 3.3 Perguntas de exemplo (seed inicial — validar e completar até 90)

| # | Nível | Afirmação | Resposta | Explicação |
|---|---|---|---|---|
| 1 | Iniciante | O Claude Code é um assistente de IA que pode ler arquivos, editar código e executar comandos em um projeto. | V | Ele atua como um agente: entende o projeto, faz alterações e roda comandos, sempre dentro das permissões dadas. |
| 2 | Iniciante | O Claude Code só funciona em projetos escritos em Python. | F | Ele trabalha com praticamente qualquer linguagem e tipo de arquivo de texto. |
| 3 | Iniciante | Por padrão, o Claude Code pede permissão antes de ações como editar arquivos ou executar comandos. | V | O usuário aprova as ações; é possível ajustar esse comportamento com modos de permissão. |
| 4 | Iniciante | O Claude Code só pode ser usado dentro de uma IDE como o VS Code. | F | Ele roda no terminal (CLI), no app desktop, na web e também tem extensões para IDEs. |
| 5 | Intermediário | O arquivo CLAUDE.md serve para dar ao Claude Code instruções e contexto persistentes sobre o projeto. | V | Ele é carregado automaticamente e funciona como um "manual do projeto" para o Claude. |
| 6 | Intermediário | O plan mode permite que o Claude analise o problema e proponha um plano antes de alterar arquivos. | V | É útil para revisar a estratégia antes de qualquer mudança acontecer. |
| 7 | Intermediário | O comando /clear apaga os arquivos do projeto. | F | Ele limpa o histórico da conversa, não os arquivos. |
| 8 | Avançado | O MCP (Model Context Protocol) permite conectar o Claude Code a ferramentas e fontes de dados externas. | V | É um padrão aberto para integrar sistemas como bancos de dados, Jira ou Slack. |
| 9 | Avançado | Hooks são comandos configurados pelo usuário que rodam automaticamente em eventos, como antes ou depois de o Claude usar uma ferramenta. | V | Permitem automatizar regras, como formatar código após cada edição. |
| 10 | Avançado | Subagents obrigatoriamente compartilham todo o contexto da conversa principal. | F | Subagents trabalham com contexto próprio e devolvem um resultado resumido, poupando o contexto principal. |
| 11 | Avançado | Skills são pacotes de instruções que o Claude carrega quando são relevantes para uma tarefa. | V | Servem para padronizar fluxos repetíveis, como um checklist de revisão do time. |
| 12 | Avançado | O Claude Code pode ser executado de forma não interativa, por exemplo em pipelines de CI, usando a flag -p. | V | O modo "print" executa um prompt e retorna o resultado, sem interface interativa. |

---

## 4. Experiência do usuário

### 4.1 Fluxo principal
```
[Home] → escolhe nível → [Pergunta 1..10] → (responde ou tempo esgota)
       → [Feedback: certo/errado + explicação + link] → próxima
       → [Resultado: pontuação, revisão das 10 perguntas] → Jogar de novo / Trocar nível
```

### 4.2 Telas

**Home**
- Título, subtítulo curto ("Teste seus conhecimentos sobre Claude Code em 5 minutos").
- 3 cards de nível com nome, descrição de 1 linha e indicação "10 perguntas · 30s cada".
- Exibe melhor pontuação anterior por nível, se houver (localStorage).

**Pergunta**
- Indicador de progresso ("Pergunta 3 de 10") + barra de progresso.
- Timer regressivo de **30 segundos** (visual: barra/anel; muda de cor nos últimos 10s).
- Afirmação em destaque.
- Dois botões grandes: **Verdadeiro** e **Falso** (atalhos de teclado: `V`/`F` ou `←`/`→`).

**Feedback (mesma tela, após responder)**
- Botões desabilitados; destaque verde (acerto) ou vermelho (erro); se tempo esgotou: "Tempo esgotado".
- Mostra a resposta correta, a explicação e o link "Saiba mais na documentação" (abre em nova aba).
- Botão **Próxima** (atalho `Enter`). O timer não roda durante o feedback.

**Resultado**
- Pontuação (ex.: 7/10) e percentual, com mensagem por faixa:
  - 0–4: "Bom começo! Revise as explicações e tente de novo."
  - 5–7: "Mandou bem! Você já entende o essencial."
  - 8–10: "Excelente! Que tal tentar o próximo nível?"
- Lista de revisão das 10 perguntas: afirmação, sua resposta, resposta correta, explicação (expansível).
- Botões: **Jogar novamente** (mesmo nível, novo sorteio) e **Escolher outro nível**.

### 4.3 Regras de jogo
- 10 perguntas por partida, sorteadas aleatoriamente do nível escolhido, **sem repetição** dentro da partida.
- O sorteio deve garantir **entre 4 e 6 verdadeiras** por partida.
- Evitar repetir perguntas da partida anterior do mesmo nível quando o banco permitir (guardar IDs da última partida no localStorage).
- Pontuação: 1 ponto por acerto; erro ou tempo esgotado = 0.
- **Tempo esgotado conta como erro** e abre o feedback automaticamente.
- Sair no meio da partida (fechar/voltar) descarta a partida; ela é registrada como `abandoned` se já tiver sido criada no Supabase.

### 4.4 Requisitos não funcionais de UX
- **Responsivo, mobile-first** (≥ 360px de largura); botões com área de toque ≥ 44px.
- **Acessibilidade:** WCAG 2.1 AA — contraste, navegação por teclado, foco visível, `aria-live` para feedback e timer (anunciar a cada 10s, não a cada segundo), não depender só de cor (usar ícone ✓/✗ + texto).
- Respeitar `prefers-reduced-motion`.
- Primeira carga < 2s em 4G; Lighthouse ≥ 90 em Performance e Acessibilidade.

---

## 5. Arquitetura técnica

### 5.1 Stack
| Camada | Tecnologia |
|---|---|
| Front-end | **React 18 + Vite + TypeScript** (strict) |
| Estilo | **Tailwind CSS** |
| Estado | React hooks + `useReducer` para a máquina de estados do jogo (sem lib externa) |
| Roteamento | Não necessário (estado de tela no reducer) — ou `react-router` apenas se houver URL por nível |
| Dados | **Supabase** (Postgres) — banco de perguntas e registro de partidas |
| Cliente | `@supabase/supabase-js` v2 |
| Validação | **Zod** (schema das perguntas, no app e nos testes) |
| Testes | **Vitest** + **React Testing Library** |
| Lint/format | ESLint + Prettier |
| Deploy | **Vercel** (front-end) + **Supabase** (projeto gerenciado) |

### 5.2 Estrutura de pastas sugerida
```
/
├─ data/
│  └─ questions.json            # fonte da verdade editável do banco de perguntas
├─ scripts/
│  └─ seed-questions.ts         # upsert do JSON na tabela `questions` (usa service role, roda local/CI)
├─ supabase/
│  └─ migrations/
│     └─ 0001_init.sql          # tabelas, índices, RLS, views
├─ src/
│  ├─ main.tsx / App.tsx
│  ├─ components/               # LevelCard, QuestionCard, Timer, FeedbackPanel, ResultSummary, ProgressBar
│  ├─ screens/                  # HomeScreen, QuizScreen, ResultScreen
│  ├─ game/
│  │  ├─ reducer.ts             # máquina de estados do jogo
│  │  ├─ draw.ts                # sorteio balanceado
│  │  └─ scoring.ts
│  ├─ hooks/                    # useTimer, useQuestions, useBestScores
│  ├─ services/
│  │  ├─ supabase.ts            # cliente
│  │  ├─ questionsRepo.ts       # busca no Supabase com fallback para JSON local
│  │  └─ analytics.ts           # registro de partidas/respostas (fire-and-forget)
│  ├─ schemas/question.ts       # Zod
│  └─ types.ts
├─ tests/
├─ .env.example
└─ prd.md
```

### 5.3 Modelo de dados

**Formato do `data/questions.json`** (e do tipo `Question` no app):
```json
{
  "id": "beg-001",
  "level": "beginner",
  "statement": "O Claude Code só funciona em projetos escritos em Python.",
  "answer": false,
  "explanation": "Ele trabalha com praticamente qualquer linguagem e tipo de arquivo de texto.",
  "docUrl": "https://code.claude.com/docs/...",
  "topic": "fundamentos",
  "active": true
}
```
- `id`: string estável, padrão `beg-NNN` | `int-NNN` | `adv-NNN`.
- `level`: `"beginner" | "intermediate" | "advanced"`.
- `docUrl`: opcional.

**Tabelas Supabase (`supabase/migrations/0001_init.sql`):**

```sql
create type quiz_level as enum ('beginner','intermediate','advanced');

create table questions (
  id           text primary key,
  level        quiz_level not null,
  statement    text not null check (char_length(statement) <= 200),
  answer       boolean not null,
  explanation  text not null check (char_length(explanation) <= 400),
  doc_url      text,
  topic        text,
  active       boolean not null default true,
  updated_at   timestamptz not null default now()
);
create index on questions (level) where active;

create table game_sessions (
  id            uuid primary key default gen_random_uuid(),
  level         quiz_level not null,
  client_id     uuid not null,              -- uuid anônimo gerado e salvo no localStorage
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'in_progress'
                check (status in ('in_progress','completed','abandoned')),
  score         smallint check (score between 0 and 10),
  total         smallint not null default 10,
  user_agent    text
);

create table game_answers (
  id               bigint generated always as identity primary key,
  session_id       uuid not null references game_sessions(id) on delete cascade,
  question_id      text not null references questions(id),
  position         smallint not null check (position between 1 and 10),
  user_answer      boolean,                 -- null quando o tempo esgotou
  is_correct       boolean not null,
  timed_out        boolean not null default false,
  response_time_ms integer,
  answered_at      timestamptz not null default now(),
  unique (session_id, position)
);

-- View de análise: perguntas mais erradas
create view question_stats as
select q.id, q.level, q.statement,
       count(a.*)                                   as times_answered,
       avg((not a.is_correct)::int)::numeric(5,2)   as error_rate,
       avg(a.timed_out::int)::numeric(5,2)          as timeout_rate,
       avg(a.response_time_ms)::int                 as avg_response_ms
from questions q
left join game_answers a on a.question_id = q.id
group by q.id, q.level, q.statement;
```

### 5.4 Segurança (RLS)
- Habilitar **RLS** em todas as tabelas.
- `questions`: `select` liberado para `anon` **apenas onde `active = true`**; sem insert/update/delete para `anon`.
- `game_sessions`: `anon` pode **insert**; **update** apenas para marcar `finished_at`, `status`, `score` (o cliente envia o `id` da própria sessão; aceitável no MVP pois os dados são anônimos e não sensíveis). Sem `select` para `anon`.
- `game_answers`: `anon` pode apenas **insert**. Sem `select`.
- `question_stats`: não exposta ao `anon` (`revoke select ... from anon`); consulta pelo dashboard do Supabase.
- O script de seed usa `SUPABASE_SERVICE_ROLE_KEY` **somente localmente/CI**, nunca no bundle do front-end.
- Nenhum dado pessoal é coletado (sem nome, e-mail ou IP armazenado explicitamente). `client_id` é um UUID aleatório.

> Observação: como a resposta correta está na tabela `questions` (legível pelo `anon`), um usuário técnico pode descobrir as respostas. Aceitável no MVP (quiz educativo, sem ranking).

### 5.5 Fluxo de dados
1. **Carregar perguntas:** `questionsRepo.getByLevel(level)` busca no Supabase (`select * from questions where level = ? and active`). Se falhar (rede/timeout de 3s/config ausente), usa `data/questions.json` empacotado no build. O resultado é validado com Zod; perguntas inválidas são descartadas com `console.warn`.
2. **Iniciar partida:** sorteio local balanceado; cria `game_sessions` (fire-and-forget — falhas de analytics **nunca** bloqueiam o jogo).
3. **Cada resposta:** insere em `game_answers`.
4. **Fim:** atualiza `game_sessions` com `score`, `status='completed'`, `finished_at`.
5. **Abandono:** no `beforeunload`/`visibilitychange` com partida em andamento, tentar marcar `status='abandoned'` (best-effort).

### 5.6 Máquina de estados do jogo
```
idle ──selectLevel──▶ loading ──loaded──▶ question ──answer|timeout──▶ feedback
                         │                    ▲                          │
                         └──error──▶ error    └────────next──────────────┤
                                                                         ▼ (após 10ª)
                                                                       result ──restart──▶ loading
                                                                              ──home─────▶ idle
```
Ações: `SELECT_LEVEL`, `QUESTIONS_LOADED`, `LOAD_FAILED`, `ANSWER`, `TIMEOUT`, `NEXT`, `RESTART`, `GO_HOME`.

### 5.7 Timer
- Hook `useTimer(durationMs, onExpire)` baseado em timestamps (`performance.now()`), não em contagem de `setInterval`, para não acumular desvio.
- Pausa quando a aba fica oculta? **Não** — o tempo continua (evita trapaça simples); documentar no código.
- Reinicia a cada nova pergunta; para no feedback.

### 5.8 Persistência local (localStorage)
| Chave | Conteúdo |
|---|---|
| `ccquiz:clientId` | UUID anônimo |
| `ccquiz:best:<level>` | melhor pontuação do nível |
| `ccquiz:last:<level>` | IDs da última partida (para evitar repetição) |

Todo acesso ao localStorage em `try/catch` (modo privado pode lançar erro).

### 5.9 Variáveis de ambiente
`.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# apenas para o script de seed (NUNCA prefixar com VITE_)
SUPABASE_SERVICE_ROLE_KEY=
```
Na Vercel, configurar apenas as duas variáveis `VITE_*`.

---

## 6. Testes e qualidade

### 6.1 Testes obrigatórios (Vitest)
- **Validação do banco (`questions.json`):**
  - todas as perguntas passam no schema Zod;
  - IDs únicos e no padrão do nível;
  - ≥ 30 perguntas ativas por nível;
  - proporção de verdadeiras entre 45% e 55% por nível;
  - `statement` ≤ 200 e `explanation` ≤ 400 caracteres;
  - `docUrl`, se presente, é URL https válida.
- **Sorteio (`draw.ts`):** retorna 10 itens, sem repetição, todos do nível, entre 4 e 6 verdadeiras; evita IDs da última partida quando possível; funciona com banco no limite mínimo.
- **Pontuação (`scoring.ts`):** acerto, erro, timeout.
- **Reducer:** todas as transições da máquina de estados, incluindo timeout e restart.
- **useTimer:** expira em 30s com fake timers; não dispara após desmontar ou após resposta.
- **questionsRepo:** usa fallback JSON quando o Supabase falha.
- **Componentes (RTL):** responder com clique e com teclado; feedback exibe explicação; tela de resultado mostra pontuação correta.

### 6.2 Critérios de qualidade
- `npm run build`, `npm run lint`, `npm run test` sem erros.
- TypeScript `strict: true`, sem `any` implícito.
- Cobertura ≥ 80% em `src/game/` e `src/services/`.

### 6.3 Scripts npm
```
dev, build, preview, lint, format, test, test:watch, seed
```

---

## 7. Deploy

- **Vercel:** projeto conectado ao repositório GitHub; build `npm run build`, output `dist`; preview automático por PR; produção na branch `main`.
- **Supabase:** aplicar `supabase/migrations/*.sql` (via Supabase CLI `supabase db push` ou SQL Editor), depois rodar `npm run seed` para popular `questions` a partir do JSON.
- **Atualizar perguntas:** editar `data/questions.json` → testes passam → `npm run seed` (upsert por `id`; perguntas removidas do JSON viram `active=false`, nunca são deletadas, para preservar histórico de respostas).

---

## 8. Critérios de aceite do MVP

1. Usuário escolhe um dos 3 níveis e joga 10 perguntas V/F com timer de 30s.
2. Após cada resposta (ou tempo esgotado), vê certo/errado, resposta correta, explicação e link.
3. Ao final, vê pontuação, mensagem por faixa e revisão completa; pode jogar novamente ou trocar de nível.
4. Banco com ≥ 90 perguntas verificadas (30 por nível, balanceadas V/F) em PT-BR.
5. Perguntas carregadas do Supabase, com fallback para o JSON local se indisponível.
6. Cada partida e cada resposta registradas no Supabase de forma anônima; a view `question_stats` mostra taxa de erro por pergunta.
7. Jogo funciona normalmente mesmo se o Supabase estiver fora do ar.
8. Funciona em mobile e desktop, totalmente operável por teclado, Lighthouse ≥ 90 (Performance e Acessibilidade).
9. Todos os testes da seção 6 passando; publicado na Vercel.

---

## 9. Roadmap pós-MVP (ideias levantadas, não implementar agora)
- Ranking global com apelido (exige proteção contra respostas expostas — mover validação para Edge Function).
- Compartilhar resultado (LinkedIn) com imagem gerada.
- Modo escuro.
- Versão em inglês.
- Painel admin para gerenciar perguntas no Supabase.
- Certificado/badge por nível concluído com ≥ 8/10.
- Perguntas geradas/sugeridas por IA com curadoria humana.

---

## 10. Ordem sugerida de implementação (para o Claude Code)
1. Scaffold Vite + React + TS + Tailwind + Vitest + ESLint/Prettier.
2. Schema Zod + `data/questions.json` com as 12 perguntas de exemplo + testes de validação do banco.
3. `draw.ts`, `scoring.ts`, `reducer.ts` + testes.
4. `useTimer` + testes.
5. Telas e componentes (Home → Quiz → Feedback → Resultado) usando o JSON local.
6. Migration Supabase + cliente + `questionsRepo` com fallback + `analytics.ts`.
7. Script de seed.
8. Completar banco até 90 perguntas, verificando cada uma na documentação oficial.
9. Acessibilidade, responsividade, Lighthouse.
10. Configurar deploy na Vercel e README com instruções de setup.
