-- Squad roster (seeded from content/players.json)
create table players (
  id       text primary key,           -- 'marco-otto'
  name     text not null,
  aliases  text[] not null default '{}'
);

-- One question per day (seeded from content/questions/*.json)
create table questions (
  date      date primary key,
  prompt    text not null,
  answers   jsonb not null              -- [{ "player": "marco-otto", "runs": 6 }, ...]
);

-- Links a login to a player in the roster
create table squad_members (
  user_id    uuid primary key references auth.users on delete cascade,
  player_id  text not null unique references players(id)
);

-- One daily attempt per player
create table plays (
  user_id      uuid not null references auth.users on delete cascade,
  date         date not null references questions(date),
  started_at   timestamptz not null default now(),
  answered_at  timestamptz,
  guess        text references players(id),
  runs         smallint check (runs in (0, 1, 2, 4, 6)),
  primary key (user_id, date)
);

alter table players       enable row level security;
alter table questions     enable row level security;
alter table squad_members enable row level security;
alter table plays         enable row level security;

create policy "squad reads roster"  on players       for select to authenticated using (true);
create policy "read own membership" on squad_members for select to authenticated using (user_id = auth.uid());
create policy "read own plays"      on plays         for select to authenticated using (user_id = auth.uid());

-- questions deliberately has NO policy: the browser can't read it at all.
-- plays has no insert/update policy: only the game functions (next step) write to it.

create function claim_player(p_player_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  insert into squad_members (user_id, player_id)
  values (auth.uid(), p_player_id);
exception
  when unique_violation then
    raise exception 'That player is already taken';
end;
$$;

revoke execute on function claim_player from public, anon;
grant execute on function claim_player to authenticated;

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
  if not exists (select 1 from squad_members where user_id = auth.uid()) then
    raise exception 'Pick your name first';
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

-- Plays the shot. p_guess is a player id picked from the dropdown.
-- 20s on screen + 3s grace for slow connections.
create function submit_answer(p_guess text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day  date := today_nz();
  v_play plays;
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
  if not exists (select 1 from players where id = p_guess) then
    raise exception 'Unknown player';
  end if;

  select (a->>'runs')::smallint into v_runs
  from questions q, jsonb_array_elements(q.answers) a
  where q.date = v_day and a->>'player' = p_guess;

  update plays
  set answered_at = now(), guess = p_guess, runs = coalesce(v_runs, 0)
  where user_id = auth.uid() and date = v_day;

  return jsonb_build_object(
    'out', false,
    'runs', coalesce(v_runs, 0),
    'valid', v_runs is not null
  );
end;
$$;

-- The tier board. Only works once you've played (or timed out) today.
create function get_reveal()
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
    'your_runs', v_play.runs,
    'out', v_play.answered_at is null,
    'played_today', (select count(*) from plays where date = v_day),
    'board', coalesce((
      select jsonb_agg(jsonb_build_object(
               'player', pl.id,
               'name', pl.name,
               'runs', (a->>'runs')::int,
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

revoke execute on function start_ball(), submit_answer(text), get_reveal() from public, anon;
grant  execute on function start_ball(), submit_answer(text), get_reveal() to authenticated;