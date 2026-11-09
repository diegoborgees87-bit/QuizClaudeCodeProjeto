-- Quizz Claude Code: initial schema (PRD §5.3–5.4).
-- Apply with `supabase db push` or paste into the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create type public.quiz_level as enum ('beginner', 'intermediate', 'advanced');

create table public.questions (
  id           text primary key check (id ~ '^(beg|int|adv)-[0-9]{3}$'),
  level        public.quiz_level not null,
  statement    text not null check (char_length(statement) <= 200),
  answer       boolean not null,
  explanation  text not null check (char_length(explanation) <= 400),
  doc_url      text check (doc_url is null or doc_url like 'https://%'),
  topic        text,
  active       boolean not null default true,
  updated_at   timestamptz not null default now()
);
create index questions_level_active_idx on public.questions (level) where active;

create table public.game_sessions (
  id            uuid primary key default gen_random_uuid(), -- the client generates it (see below)
  level         public.quiz_level not null,
  client_id     uuid not null,                               -- anonymous UUID from localStorage
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'in_progress'
                check (status in ('in_progress', 'completed', 'abandoned')),
  score         smallint check (score between 0 and 10),
  total         smallint not null default 10,
  user_agent    text
);

create table public.game_answers (
  id               bigint generated always as identity primary key,
  session_id       uuid not null references public.game_sessions (id) on delete cascade,
  question_id      text not null references public.questions (id),
  position         smallint not null check (position between 1 and 10),
  user_answer      boolean,                 -- null when the timer ran out
  is_correct       boolean not null,
  timed_out        boolean not null default false,
  response_time_ms integer check (response_time_ms >= 0),
  answered_at      timestamptz not null default now(),
  unique (session_id, position)
);
create index game_answers_question_idx on public.game_answers (question_id);

-- Analysis view: most-missed questions. Read it from the Supabase dashboard.
create view public.question_stats
with (security_invoker = true) as
select q.id, q.level, q.statement,
       count(a.id)                                  as times_answered,
       avg((not a.is_correct)::int)::numeric(5, 2)  as error_rate,
       avg(a.timed_out::int)::numeric(5, 2)         as timeout_rate,
       avg(a.response_time_ms)::int                 as avg_response_ms
from public.questions q
left join public.game_answers a on a.question_id = q.id
group by q.id, q.level, q.statement;

-- ---------------------------------------------------------------------------
-- Privileges. Supabase grants everything on public tables to anon/authenticated
-- by default, so start from zero and grant only what the app needs.
-- ---------------------------------------------------------------------------

revoke all on public.questions, public.game_sessions, public.game_answers, public.question_stats
  from anon, authenticated;

grant select on public.questions     to anon, authenticated;
grant insert on public.game_sessions to anon, authenticated;
grant insert on public.game_answers  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.questions     enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_answers  enable row level security;

create policy "anon reads active questions"
  on public.questions for select
  to anon, authenticated
  using (active);

-- The client generates the session id (crypto.randomUUID) and inserts without RETURNING,
-- so anon never needs SELECT on game_sessions.
create policy "anon starts a session"
  on public.game_sessions for insert
  to anon, authenticated
  with check (status = 'in_progress' and finished_at is null and score is null);

-- Answers are accepted only for sessions that are not completed. A session marked
-- 'abandoned' by a tab switch can still receive answers if the player comes back.
create function public.is_session_open(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.game_sessions
    where id = p_session_id and status <> 'completed'
  );
$$;

revoke execute on function public.is_session_open(uuid) from public;
grant execute on function public.is_session_open(uuid) to anon, authenticated;

create policy "anon records an answer"
  on public.game_answers for insert
  to anon, authenticated
  with check (public.is_session_open(session_id));

-- ---------------------------------------------------------------------------
-- Finishing a session.
-- PRD §5.4 allows anon to update finished_at/status/score. A plain UPDATE ... WHERE id = ?
-- would also need SELECT on game_sessions (Postgres applies SELECT policies to the WHERE),
-- which anon must not have. This SECURITY DEFINER function does exactly that update and
-- nothing else, so anon gets no UPDATE or SELECT privilege on the table.
--   - 'completed' is allowed from 'in_progress' or 'abandoned' (the player switched tabs,
--     which fired visibilitychange, then came back and finished).
--   - 'abandoned' is allowed only from 'in_progress'.
-- ---------------------------------------------------------------------------

create function public.finish_game_session(
  p_session_id uuid,
  p_status text,
  p_score smallint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status = 'completed' then
    if p_score is null or p_score not between 0 and 10 then
      raise exception 'score must be between 0 and 10';
    end if;
    update public.game_sessions
       set status = 'completed', score = p_score, finished_at = now()
     where id = p_session_id and status in ('in_progress', 'abandoned');
  elsif p_status = 'abandoned' then
    update public.game_sessions
       set status = 'abandoned', finished_at = now()
     where id = p_session_id and status = 'in_progress';
  else
    raise exception 'invalid status: %', p_status;
  end if;
end;
$$;

revoke execute on function public.finish_game_session(uuid, text, smallint) from public;
grant execute on function public.finish_game_session(uuid, text, smallint) to anon, authenticated;
