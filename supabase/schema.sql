-- Daily Delivery schema. Anyone with the link can play (anonymous sign-ins).

create extension if not exists fuzzystrmatch with schema extensions;

-- Roster of answer options (seeded from content/players.json)
create table players (
  id       text primary key,           -- 'marco-otto'
  name     text not null,
  aliases  text[] not null default '{}'
);

-- One question per day (seeded from content/questions/*.json)
create table questions (
  date      date primary key,
  prompt    text not null,
  answers   jsonb not null              -- [{ "player": "marco-otto", "runs": 6, "note": "..." }, ...]
);

-- One attempt per session per day
create table plays (
  user_id      uuid not null references auth.users on delete cascade,
  date         date not null references questions(date),
  started_at   timestamptz not null default now(),
  answered_at  timestamptz,
  guess        text references players(id),   -- matched answer, null if none
  guess_text   text,                          -- what was typed
  runs         smallint check (runs in (0, 1, 2, 4, 6)),
  primary key (user_id, date)
);

alter table players   enable row level security;
alter table questions enable row level security;
alter table plays     enable row level security;

create policy "players read roster" on players for select to authenticated using (true);
create policy "read own plays"      on plays   for select to authenticated using (user_id = auth.uid());

-- questions deliberately has NO policy: the browser can't read it at all.
-- plays has no insert/update policy: only the game functions below write to it.

-- Table access for the API roles (RLS policies still decide which rows)
grant usage on schema public to service_role, authenticated;
grant all on players, questions, plays to service_role;   -- seed script
grant select on players, plays to authenticated;          -- the app

-- Today's date in New Zealand (Supabase runs on UTC)
create function today_nz()
returns date
language sql
stable
as $$
  select (now() at time zone 'Pacific/Auckland')::date
$$;

-- Faces today's ball: starts the clock and returns the question.
-- Calling it again (e.g. after a refresh) keeps the original start time.
create function start_ball()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day    date := today_nz();
  v_prompt text;
  v_play   plays;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select prompt into v_prompt from questions where date = v_day;
  if v_prompt is null then
    raise exception 'No ball today';
  end if;

  insert into plays (user_id, date)
  values (auth.uid(), v_day)
  on conflict (user_id, date) do nothing;

  select * into v_play from plays where user_id = auth.uid() and date = v_day;

  return jsonb_build_object(
    'date', v_day,
    'prompt', v_prompt,
    'started_at', v_play.started_at,
    'finished', v_play.answered_at is not null
                or now() > v_play.started_at + interval '23 seconds'
  );
end;
$$;

-- Lowercase and keep only letters/digits: "Na’il Moerat" → "nailmoerat"
create or replace function norm_key(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(t), '[^a-z0-9]', '', 'g')
$$;

-- Every way of naming each of a day's answers: full name, aliases and each word of the name
create or replace function answer_keys(p_day date)
returns table (player text, k text)
language sql
stable
set search_path = public
as $$
  select distinct pl.id, norm_key(n)
  from questions q
  cross join lateral jsonb_array_elements(q.answers) a
  join players pl on pl.id = a->>'player'
  cross join lateral unnest(pl.aliases || pl.name || string_to_array(pl.name, ' ')) as n
  where q.date = p_day
    and length(norm_key(n)) >= 3
$$;
revoke execute on function answer_keys(date) from public, anon, authenticated;

-- Plays the shot: matches what was typed against today's answers only.
create function submit_answer(p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_day  date := today_nz();
  v_play plays;
  v_key  text := left(norm_key(coalesce(p_text, '')), 50);
  v_max  int;
  v_ids  text[];
  v_pick text;
  v_runs smallint;
begin
  select * into v_play from plays
  where user_id = auth.uid() and date = v_day
  for update;

  if not found then
    raise exception 'Face the ball first';
  end if;
  if v_play.answered_at is not null then
    raise exception 'You''ve already played today';
  end if;
  if now() > v_play.started_at + interval '23 seconds' then
    return jsonb_build_object('out', true);
  end if;
  if length(v_key) < 3 then
    raise exception 'Type at least 3 letters';
  end if;

  -- 1. Exact first name, surname, full name or alias of one of today's answers
  select array_agg(distinct player) into v_ids
  from answer_keys(v_day)
  where k = v_key;

  -- 2. Otherwise a close typo: 1 letter off (4–7 letters typed) or 2 off (8+)
  if v_ids is null and length(v_key) >= 4 then
    v_max := case when length(v_key) >= 8 then 2 else 1 end;
    with d as (
      select player, min(levenshtein(k, v_key)) as dist
      from answer_keys(v_day)
      group by player
    )
    select array_agg(player) into v_ids
    from d
    where dist <= v_max
      and dist = (select min(dist) from d);
  end if;

  -- Two answers fit equally well: ask for more, don't use up the shot
  if array_length(v_ids, 1) > 1 then
    return jsonb_build_object('ambiguous', true);
  end if;

  v_pick := v_ids[1];

  -- Not one of today's answers: try again, shot not used up
  if v_pick is null then
    return jsonb_build_object('unrecognised', true);
  end if;

  select (a->>'runs')::smallint into v_runs
  from questions q, jsonb_array_elements(q.answers) a
  where q.date = v_day and a->>'player' = v_pick;

  update plays
  set answered_at = now(),
      guess = v_pick,
      guess_text = left(p_text, 80),
      runs = coalesce(v_runs, 0)
  where user_id = auth.uid() and date = v_day;

  return jsonb_build_object(
    'out', false,
    'runs', coalesce(v_runs, 0)
  );
end;
$$;

revoke execute on function submit_answer(text) from public, anon;
grant  execute on function submit_answer(text) to authenticated;

-- The tier board. Only works once you've played (or timed out) today.
create or replace function get_reveal()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day    date := today_nz();
  v_play   plays;
  v_result jsonb;
begin
  select * into v_play from plays where user_id = auth.uid() and date = v_day;

  if not found
     or (v_play.answered_at is null
         and now() <= v_play.started_at + interval '23 seconds') then
    raise exception 'Play today''s ball first';
  end if;

  select jsonb_build_object(
    'prompt', q.prompt,
    'your_guess', v_play.guess,
    'your_guess_name', (select name from players where id = v_play.guess),
    'your_guess_text', v_play.guess_text,
    'your_runs', v_play.runs,
    'out', v_play.answered_at is null,
    'played_today', (select count(*) from plays where date = v_day),
    'board', coalesce((
      select jsonb_agg(jsonb_build_object(
               'player', pl.id,
               'name', pl.name,
               'runs', (a->>'runs')::int,
               'note', a->>'note',
               'picks', (select count(*) from plays x
                         where x.date = v_day and x.guess = pl.id)
             ) order by (a->>'runs')::int desc, pl.name)
      from jsonb_array_elements(q.answers) a
      join players pl on pl.id = a->>'player'
    ), '[]'::jsonb)
  )
  into v_result
  from questions q
  where q.date = v_day;

  return v_result;
end;
$$;

revoke execute on function start_ball(), get_reveal() from public, anon;
grant  execute on function start_ball(), get_reveal() to authenticated;