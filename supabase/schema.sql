create extension if not exists pgcrypto;

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  admin_pin text not null default '0000',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  sort_order int not null,
  name text not null,
  photo_url text,
  submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, sort_order),
  unique (room_id, name)
);

create table if not exists public.player_pins (
  player_id uuid primary key references public.players(id) on delete cascade,
  pin text not null
);

create unique index if not exists player_pins_pin_unique on public.player_pins(pin);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  sort_order int not null,
  game_key text not null,
  name text not null,
  winner_points int not null,
  runner_up_points int not null,
  note text not null,
  visual jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, sort_order),
  unique (room_id, game_key)
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  winner_player_id uuid references public.players(id) on delete set null,
  runner_up_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, game_id)
);

create table if not exists public.secret_cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  kind text not null check (kind in ('boost', 'sabotage')),
  created_at timestamptz not null default now(),
  unique (room_id, player_id, game_id, kind)
);

create table if not exists public.reveal_state (
  room_id uuid primary key references public.game_rooms(id) on delete cascade,
  phase text not null default 'sealed' check (phase in ('sealed', 'active', 'complete')),
  visible_count int not null default 0 check (visible_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_updates (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  kind text not null default 'system' check (kind in ('score', 'player', 'admin', 'cards', 'reveal', 'system')),
  title text not null,
  detail text,
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists system_updates_room_created_idx on public.system_updates(room_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists game_rooms_touch_updated_at on public.game_rooms;
create trigger game_rooms_touch_updated_at before update on public.game_rooms
for each row execute function public.touch_updated_at();

drop trigger if exists players_touch_updated_at on public.players;
create trigger players_touch_updated_at before update on public.players
for each row execute function public.touch_updated_at();

drop trigger if exists games_touch_updated_at on public.games;
create trigger games_touch_updated_at before update on public.games
for each row execute function public.touch_updated_at();

drop trigger if exists results_touch_updated_at on public.results;
create trigger results_touch_updated_at before update on public.results
for each row execute function public.touch_updated_at();

drop trigger if exists reveal_state_touch_updated_at on public.reveal_state;
create trigger reveal_state_touch_updated_at before update on public.reveal_state
for each row execute function public.touch_updated_at();

alter table public.game_rooms enable row level security;
alter table public.players enable row level security;
alter table public.player_pins enable row level security;
alter table public.games enable row level security;
alter table public.results enable row level security;
alter table public.secret_cards enable row level security;
alter table public.reveal_state enable row level security;
alter table public.system_updates enable row level security;

drop policy if exists "public read rooms" on public.game_rooms;

drop policy if exists "public read players" on public.players;
create policy "public read players" on public.players for select using (true);

drop policy if exists "public read games" on public.games;
create policy "public read games" on public.games for select using (true);

drop policy if exists "public read results" on public.results;
create policy "public read results" on public.results for select using (true);

drop policy if exists "public read reveal state" on public.reveal_state;
create policy "public read reveal state" on public.reveal_state for select using (true);

drop policy if exists "public read system updates" on public.system_updates;
create policy "public read system updates" on public.system_updates for select using (true);

-- No anon policy is created for secret_cards. Booth choices are only accessed
-- through PIN-checked Next.js route handlers using the service role key.
-- No anon policy is created for game_rooms or player_pins, because those rows
-- contain admin/player PINs. Public clients use Next.js route handlers instead.

do $$
begin
  begin
    alter publication supabase_realtime add table public.players;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.results;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.reveal_state;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.system_updates;
  exception when duplicate_object then null;
  end;
end $$;

insert into public.game_rooms (slug, name, admin_pin)
values ('aolinpike-2026', 'Aolinpike Games', '0000')
on conflict (slug) do update set name = excluded.name;

with room as (
  select id from public.game_rooms where slug = 'aolinpike-2026'
)
insert into public.players (room_id, sort_order, name)
select room.id, seed.sort_order, seed.name
from room
cross join (values
  (1, 'Player 1', '1111'),
  (2, 'Player 2', '2222'),
  (3, 'Player 3', '3333'),
  (4, 'Player 4', '4444')
) as seed(sort_order, name, pin)
on conflict (room_id, sort_order) do update set name = excluded.name;

with room as (
  select id from public.game_rooms where slug = 'aolinpike-2026'
),
seed as (
  select * from (values
    (1, '1111'),
    (2, '2222'),
    (3, '3333'),
    (4, '4444')
  ) as seed(sort_order, pin)
)
insert into public.player_pins (player_id, pin)
select players.id, seed.pin
from room
join public.players on players.room_id = room.id
join seed on seed.sort_order = players.sort_order
on conflict (player_id) do nothing;

with room as (
  select id from public.game_rooms where slug = 'aolinpike-2026'
)
insert into public.games (room_id, sort_order, game_key, name, winner_points, runner_up_points, note, visual)
select room.id, seed.sort_order, seed.game_key, seed.name, seed.winner_points, seed.runner_up_points, seed.note, seed.visual::jsonb
from room
cross join (values
  (1, 'basketball', 'Grand Basketball', 4, 2, 'Skills + shooting + HORSE', '{"symbol":"BB","label":"Court Duel"}'),
  (2, 'pingpong', 'Ping Pong', 4, 2, '2v2 then 1v1 final', '{"symbol":"PP","label":"Spin Zone"}'),
  (3, 'gokart', 'Go Kart', 4, 2, 'Rank by lap time', '{"symbol":"GT","label":"Fast Lap"}'),
  (4, 'bowling', 'Bowling', 4, 2, 'Regular bowling', '{"symbol":"10","label":"Strike Lane"}'),
  (5, 'darts', 'Darts', 4, 2, '501', '{"symbol":"501","label":"Bullseye"}'),
  (6, 'bike', '800m Bike Sprint', 4, 2, 'Rank by time', '{"symbol":"800","label":"Sprint Heat"}'),
  (7, 'cornhole', 'Corn Hole', 4, 2, '2v2 then 1v1 final', '{"symbol":"CH","label":"Bag Toss"}'),
  (8, 'holdem', 'Texas Hold''em', 4, 2, '30-min quick game', '{"symbol":"A","label":"All In"}'),
  (9, 'pool', '5-5-5 Pool', 4, 2, 'Classic, 10 games', '{"symbol":"8","label":"Cue Clash"}'),
  (10, 'nba2k', 'NBA 2K26', 4, 2, 'PS5', '{"symbol":"2K","label":"Console Arena"}'),
  (11, 'mario', 'Mario Party', 4, 2, '10 rounds', '{"symbol":"MP","label":"Bonus Star"}'),
  (12, 'beerpong', 'Office Golf Beer Pong', 4, 2, 'Final game', '{"symbol":"19","label":"Final Cup"}')
) as seed(sort_order, game_key, name, winner_points, runner_up_points, note, visual)
on conflict (room_id, game_key) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    winner_points = excluded.winner_points,
    runner_up_points = excluded.runner_up_points,
    note = excluded.note,
    visual = excluded.visual;

insert into public.reveal_state (room_id)
select id from public.game_rooms where slug = 'aolinpike-2026'
on conflict (room_id) do nothing;
