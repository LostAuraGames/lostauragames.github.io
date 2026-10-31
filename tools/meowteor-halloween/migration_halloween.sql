-- =====================================================================================================
-- MEOWTEOR Halloween 2026 event + player keys (server-derived identity) + open-edition NFT token 12.
-- Ships DISABLED: meowteor_hw_config.enabled=false. Go-live: see go_live.sql.
-- =====================================================================================================
begin;

-- ---------- 1. player keys: the server derives the player id from a secret key it issued ----------
-- The player id (localStorage UUID) used to be the only credential. Sensitive calls (ownership, claims, kills)
-- now take p_key: a 256-bit secret the server hands out once per player id (first come, first bound) and stores
-- only as a SHA-256 hash. The player id is looked up from the key; a client-supplied player id is never trusted there.
create table if not exists public.meowteor_player_keys(
  player_id uuid primary key, key_hash bytea not null unique, created_at timestamptz not null default now(), last_seen timestamptz);
alter table public.meowteor_player_keys enable row level security;
revoke all on public.meowteor_player_keys from anon, authenticated;

create or replace function public.meowteor_session(p_player_id uuid, p_key text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_hash bytea; v_key text;
begin
  if p_player_id is null then raise exception 'auth: player id required' using errcode = '22023'; end if;
  select key_hash into v_hash from public.meowteor_player_keys where player_id = p_player_id;
  if v_hash is null then
    v_key := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.meowteor_player_keys(player_id, key_hash) values (p_player_id, extensions.digest(v_key, 'sha256'))
      on conflict (player_id) do nothing;
    if not found then raise exception 'auth: key mismatch' using errcode = '28000'; end if;
    return jsonb_build_object('ok', true, 'key', v_key, 'new', true);
  end if;
  if p_key is null or extensions.digest(p_key, 'sha256') <> v_hash then
    raise exception 'auth: key mismatch' using errcode = '28000'; end if;
  update public.meowteor_player_keys set last_seen = now() where player_id = p_player_id;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.meowteor_session(uuid, text) from public;
grant execute on function public.meowteor_session(uuid, text) to anon, authenticated;

-- internal: key -> player id (raises when unknown)
create or replace function public.meowteor_me(p_key text) returns uuid
language plpgsql stable security definer set search_path to 'public' as $$
declare v uuid;
begin
  if p_key is null or length(p_key) <> 64 then raise exception 'auth: key required' using errcode = '28000'; end if;
  select player_id into v from public.meowteor_player_keys where key_hash = extensions.digest(p_key, 'sha256');
  if v is null then raise exception 'auth: unknown key' using errcode = '28000'; end if;
  return v;
end $$;
revoke all on function public.meowteor_me(text) from public, anon, authenticated;
grant execute on function public.meowteor_me(text) to service_role;

-- ---------- 2. Halloween event config + kill tables (RLS on, no policies; only SECURITY DEFINER code writes) ----------
create table if not exists public.meowteor_hw_config(
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  starts_at timestamptz,                                         -- set at go-live
  ends_at timestamptz not null default timestamptz '2026-11-14 00:00:00 America/New_York',
  threshold int not null default 25,
  spawn_rate double precision not null default 0.001,           -- per gap passed (endless normal only)
  item_id text not null default 'skin_halloween_widow',
  token_id int not null default 12,
  art_id text not null default 'hw-2026-widow');
insert into public.meowteor_hw_config(id) values (1) on conflict do nothing;

create table if not exists public.meowteor_hw_kills(
  player_id uuid primary key, kills int not null default 0 check (kills >= 0),
  gaps bigint not null default 0,                                -- gaps passed in credited runs (for outlier stats)
  runs int not null default 0, earned_at timestamptz, updated_at timestamptz not null default now());
create table if not exists public.meowteor_hw_runs(              -- each run ticket can be redeemed once
  run_id uuid primary key, player_id uuid not null, score int not null, frames int not null,
  kills int not null, verdict text not null, at timestamptz not null default now());
create table if not exists public.meowteor_hw_kill_log(
  run_id uuid not null, gap int not null, player_id uuid not null, kill_frame int not null, at timestamptz not null default now(),
  primary key (run_id, gap));
create table if not exists public.meowteor_hw_review(
  id bigserial primary key, player_id uuid, run_id uuid, reason text not null, data jsonb, at timestamptz not null default now());
alter table public.meowteor_hw_config enable row level security;
alter table public.meowteor_hw_kills enable row level security;
alter table public.meowteor_hw_runs enable row level security;
alter table public.meowteor_hw_kill_log enable row level security;
alter table public.meowteor_hw_review enable row level security;
revoke all on public.meowteor_hw_config, public.meowteor_hw_kills, public.meowteor_hw_runs, public.meowteor_hw_kill_log, public.meowteor_hw_review from anon, authenticated;

-- spider key (server secret; spawn decisions = HMAC(run_id:gap) so nobody can predict or forge them)
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'meowteor_spider_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'meowteor_spider_key', 'MeowTeor Halloween spider spawn HMAC key'); end if;
end $$;

create or replace function public.meowteor_hw_live(p_at timestamptz default now()) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select coalesce((select enabled and starts_at is not null and p_at >= starts_at and p_at < ends_at from public.meowteor_hw_config where id = 1), false) $$;

-- spawn gaps of a run (1-based gap index = score right after passing it), up to p_max
create or replace function public.meowteor_hw_spawns(p_run_id uuid, p_max int) returns int[]
language plpgsql stable security definer set search_path to 'public' as $$
declare k bytea; lim bigint; out int[] := '{}'; g int; h bytea;
begin
  select decode(decrypted_secret, 'hex') into k from vault.decrypted_secrets where name = 'meowteor_spider_key';
  select floor(spawn_rate * 4294967296)::bigint into lim from public.meowteor_hw_config where id = 1;
  for g in 1 .. least(greatest(p_max, 0), 20000) loop
    h := extensions.hmac(convert_to(p_run_id::text || ':' || g, 'UTF8'), k, 'sha256');
    if ((get_byte(h,0)::bigint << 24) | (get_byte(h,1) << 16) | (get_byte(h,2) << 8) | get_byte(h,3)) < lim then out := out || g; end if;
  end loop;
  return out;
end $$;
revoke all on function public.meowteor_hw_live(timestamptz), public.meowteor_hw_spawns(uuid,int) from public, anon, authenticated;

-- client: where spiders appear in this run. Only for the run's owner (derived from key), fresh ticket, live event.
-- Knowing the plan gives no advantage: a kill only counts after the server replays the whole run (see credit).
create or replace function public.meowteor_spider_plan(p_key text, p_run_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_pid uuid := public.meowteor_me(p_key); r public.meowteor_runs%rowtype;
begin
  if not public.meowteor_hw_live() then return jsonb_build_object('live', false); end if;
  if public.lb_banned(v_pid) then raise exception 'player is banned' using errcode = 'P0001'; end if;
  select * into r from public.meowteor_runs where id = p_run_id;
  if not found or r.player_id <> v_pid then raise exception 'bad run ticket' using errcode = '22023'; end if;
  if r.started_at < now() - interval '15 minutes' then raise exception 'run ticket expired' using errcode = '22023'; end if;
  return jsonb_build_object('live', true, 'gaps', to_jsonb(public.meowteor_hw_spawns(p_run_id, 5000)));
end $$;
revoke all on function public.meowteor_spider_plan(text, uuid) from public;
grant execute on function public.meowteor_spider_plan(text, uuid) to anon, authenticated;

-- service role (edge function meowteor-spider, AFTER a successful deterministic replay of the run):
-- credits kills. p_kills = [[gap, kill_frame], ...]; p_gap_frames[g] = replay frame when gap g was passed.
create or replace function public.meowteor_hw_credit(p_player_id uuid, p_run_id uuid, p_score int, p_frames int,
  p_kills jsonb, p_gap_frames jsonb, p_verdict text, p_why jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare c public.meowteor_hw_config%rowtype; r public.meowteor_runs%rowtype; sp int[]; k jsonb; g int; f int; gf int;
  ok_g int[] := '{}'; bad jsonb := '[]'; v_total int; v_earned timestamptz; v_gaps bigint; v_exp double precision; WIN constant int := 420;
begin
  select * into c from public.meowteor_hw_config where id = 1;
  perform pg_advisory_xact_lock(hashtext('meowteor_hw:' || p_player_id::text));
  if public.lb_banned(p_player_id) then raise exception 'player is banned' using errcode = 'P0001'; end if;
  select * into r from public.meowteor_runs where id = p_run_id;
  if not found or r.player_id <> p_player_id then raise exception 'bad run ticket' using errcode = '22023'; end if;
  if not public.meowteor_hw_live(r.started_at) then raise exception 'run not in event' using errcode = '22023'; end if;
  if now() > r.started_at + interval '3 hours' then raise exception 'run ticket expired' using errcode = '22023'; end if;
  -- plausible time: the run cannot be submitted before it could have been played (60 fps, 10 s grace)
  if now() < r.started_at + make_interval(secs => p_frames / 60.0 - 10) then
    insert into public.meowteor_hw_review(player_id, run_id, reason, data) values (p_player_id, p_run_id, 'submitted faster than the run lasts', jsonb_build_object('frames', p_frames));
    raise exception 'bad run: too fast' using errcode = '22023'; end if;
  if exists (select 1 from public.meowteor_hw_runs where run_id = p_run_id) then raise exception 'run already redeemed' using errcode = '22023'; end if;
  if p_verdict <> 'ok' then
    insert into public.meowteor_hw_runs values (p_run_id, p_player_id, p_score, p_frames, 0, p_verdict, now());
    insert into public.meowteor_hw_review(player_id, run_id, reason, data) values (p_player_id, p_run_id, 'anticheat verdict ' || p_verdict, p_why);
    return jsonb_build_object('ok', false, 'credited', 0, 'reason', 'run not verified');
  end if;
  sp := public.meowteor_hw_spawns(p_run_id, p_score);
  for k in select * from jsonb_array_elements(coalesce(p_kills, '[]')) loop
    g := (k->>0)::int; f := (k->>1)::int; gf := (p_gap_frames->>g::text)::int;
    if g is null or f is null or not (g = any(sp)) or g > p_score or g = any(ok_g) or gf is null or f < gf or f > gf + WIN or f > p_frames then
      bad := bad || jsonb_build_array(k); continue; end if;
    ok_g := ok_g || g;
    insert into public.meowteor_hw_kill_log(run_id, gap, player_id, kill_frame) values (p_run_id, g, p_player_id, f);
  end loop;
  insert into public.meowteor_hw_runs values (p_run_id, p_player_id, p_score, p_frames, coalesce(array_length(ok_g,1),0), 'ok', now());
  insert into public.meowteor_hw_kills(player_id, kills, gaps, runs) values (p_player_id, coalesce(array_length(ok_g,1),0), p_score, 1)
  on conflict (player_id) do update set kills = meowteor_hw_kills.kills + excluded.kills, gaps = meowteor_hw_kills.gaps + excluded.gaps,
     runs = meowteor_hw_kills.runs + 1, updated_at = now()
  returning kills, earned_at, gaps into v_total, v_earned, v_gaps;
  if v_total >= c.threshold and v_earned is null and now() < c.ends_at then
    update public.meowteor_hw_kills set earned_at = now() where player_id = p_player_id returning earned_at into v_earned; end if;
  -- statistics: kills are capped by real spawns, but flag anything far above the expected rate for an admin look
  v_exp := v_gaps * c.spawn_rate;
  if jsonb_array_length(bad) > 0 then
    insert into public.meowteor_hw_review(player_id, run_id, reason, data) values (p_player_id, p_run_id, 'rejected kill claims', bad); end if;
  if coalesce(array_length(ok_g,1),0) >= 4 or (v_total >= 5 and v_total > v_exp + 4 * sqrt(greatest(v_exp, 1)) + 3) then
    insert into public.meowteor_hw_review(player_id, run_id, reason, data) values (p_player_id, p_run_id, 'kill rate outlier',
      jsonb_build_object('run_kills', coalesce(array_length(ok_g,1),0), 'total', v_total, 'gaps', v_gaps, 'expected', round(v_exp::numeric, 2))); end if;
  return jsonb_build_object('ok', true, 'credited', coalesce(array_length(ok_g,1),0), 'rejected', jsonb_array_length(bad),
    'kills', v_total, 'threshold', c.threshold, 'earned', v_earned is not null);
end $$;
revoke all on function public.meowteor_hw_credit(uuid,uuid,int,int,jsonb,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.meowteor_hw_credit(uuid,uuid,int,int,jsonb,jsonb,text,jsonb) to service_role;

-- ---------- 3. NFT token 12: open edition (one per earner, one per wallet) ----------
alter table public.meowteor_nft_tokens add column if not exists edition boolean not null default false;
insert into public.meowteor_nft_tokens(token_id, item_id, name, event_id, edition, claim_enabled)
values (12, 'skin_halloween_widow', 'BLACK WIDOW', 'meowteor-halloween-2026', true, false) on conflict (token_id) do nothing;

create table if not exists public.meowteor_nft_editions(
  token_id int not null references public.meowteor_nft_tokens(token_id),
  player_id uuid not null, address text not null check (address ~ '^0x[0-9a-f]{40}$'),
  edition_no int, status text not null default 'pending' check (status in ('pending','minted','failed')),
  tx_hash text, minted_at timestamptz, lock_until timestamptz, last_error text, created_at timestamptz not null default now(),
  primary key (token_id, player_id), unique (token_id, address), unique (token_id, edition_no));
create table if not exists public.meowteor_nft_balances(                -- holder sync for edition tokens
  token_id int not null, address text not null, balance numeric not null, checked_at timestamptz not null default now(),
  primary key (token_id, address));
alter table public.meowteor_nft_editions enable row level security;
alter table public.meowteor_nft_balances enable row level security;
revoke all on public.meowteor_nft_editions, public.meowteor_nft_balances from anon, authenticated;

-- 1-of-1 path must never touch edition tokens (defence in depth for the pro items)
create or replace function public.meowteor_nft_claim_begin(p_player_id uuid, p_token_id integer)
returns table(token_id integer, item_id text, reference_id text, owner_address text, status text)
language plpgsql security definer set search_path to 'public' as $$
#variable_conflict use_column
declare t public.meowteor_nft_tokens%rowtype; v_addr text;
begin
  select * into t from public.meowteor_nft_tokens x where x.token_id = p_token_id for update;
  if not found or t.event_id is null or t.edition then raise exception 'bad claim: unknown token' using errcode = '22023'; end if;
  if not exists (select 1 from public.meowteor_champion c where c.event_id = t.event_id and c.winner_player_id = p_player_id and c.decided_at is not null and not c.is_test) then
    raise exception 'bad claim: not the winner' using errcode = '22023'; end if;
  if public.lb_banned(p_player_id) then raise exception 'player is banned' using errcode = 'P0001'; end if;
  select w.address into v_addr from public.meowteor_wallet_links w where w.player_id = p_player_id;
  if v_addr is null then raise exception 'bad claim: link a wallet first' using errcode = '22023'; end if;
  if t.status = 'minted' then raise exception 'bad claim: already minted' using errcode = '22023'; end if;
  if not t.claim_enabled then raise exception 'bad claim: claiming opens soon' using errcode = '22023'; end if;
  if t.mint_lock_until > now() then raise exception 'bad claim: mint in progress, try again in a minute' using errcode = '22023'; end if;
  update public.meowteor_nft_tokens x set status = 'pending', mint_lock_until = now() + interval '3 minutes',
         minted_to = coalesce(case when x.status = 'pending' then x.minted_to end, v_addr),
         reference_id = coalesce(x.reference_id, 'meowteor-' || t.event_id || '-' || t.item_id), last_error = null
   where x.token_id = p_token_id returning x.minted_to into v_addr;
  return query select t.token_id, t.item_id, coalesce(t.reference_id, 'meowteor-' || t.event_id || '-' || t.item_id), v_addr, 'pending'::text;
end $$;

create or replace function public.meowteor_nft_edition_begin(p_player_id uuid, p_token_id int)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare t public.meowteor_nft_tokens%rowtype; e public.meowteor_nft_editions%rowtype; v_addr text;
begin
  select * into t from public.meowteor_nft_tokens where token_id = p_token_id for update;
  if not found or not t.edition then raise exception 'bad claim: unknown token' using errcode = '22023'; end if;
  if not t.claim_enabled then raise exception 'bad claim: claiming opens soon' using errcode = '22023'; end if;
  if public.lb_banned(p_player_id) then raise exception 'player is banned' using errcode = 'P0001'; end if;
  if t.item_id = (select item_id from public.meowteor_hw_config where id = 1) and not exists
     (select 1 from public.meowteor_hw_kills k, public.meowteor_hw_config c where k.player_id = p_player_id and k.earned_at is not null and k.earned_at < c.ends_at) then
    raise exception 'bad claim: not earned' using errcode = '22023'; end if;
  select address into v_addr from public.meowteor_wallet_links where player_id = p_player_id;
  if v_addr is null then raise exception 'bad claim: link a wallet first' using errcode = '22023'; end if;
  select * into e from public.meowteor_nft_editions where token_id = p_token_id and player_id = p_player_id for update;
  if found then
    if e.status = 'minted' then raise exception 'bad claim: already minted' using errcode = '22023'; end if;
    if e.lock_until > now() then raise exception 'bad claim: mint in progress, try again in a minute' using errcode = '22023'; end if;
    update public.meowteor_nft_editions set lock_until = now() + interval '3 minutes', status = 'pending', last_error = null,
       address = case when tx_hash is null then v_addr else address end
     where token_id = p_token_id and player_id = p_player_id returning * into e;
  else
    if exists (select 1 from public.meowteor_nft_editions where token_id = p_token_id and address = v_addr) then
      raise exception 'bad claim: this wallet already claimed one' using errcode = '22023'; end if;
    insert into public.meowteor_nft_editions(token_id, player_id, address, lock_until) values (p_token_id, p_player_id, v_addr, now() + interval '3 minutes') returning * into e;
  end if;
  return jsonb_build_object('token_id', p_token_id, 'owner_address', e.address, 'tx_hash', e.tx_hash, 'status', e.status);
end $$;
create or replace function public.meowteor_nft_edition_finish(p_token_id int, p_player_id uuid, p_status text, p_tx text, p_error text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_no int;
begin
  perform pg_advisory_xact_lock(hashtext('meowteor_edition:' || p_token_id));
  if p_status = 'minted' then
    select edition_no into v_no from public.meowteor_nft_editions where token_id = p_token_id and player_id = p_player_id;
    if v_no is null then select coalesce(max(edition_no), 0) + 1 into v_no from public.meowteor_nft_editions where token_id = p_token_id; end if;
  end if;
  update public.meowteor_nft_editions set status = p_status, tx_hash = coalesce(p_tx, tx_hash), last_error = p_error,
     edition_no = coalesce(edition_no, v_no), minted_at = case when p_status = 'minted' then coalesce(minted_at, now()) else minted_at end,
     lock_until = case when p_status = 'pending' then lock_until else null end
   where token_id = p_token_id and player_id = p_player_id and p_status in ('pending','minted','failed');
  return jsonb_build_object('edition_no', v_no);
end $$;
create or replace function public.meowteor_nft_set_balance(p_token_id int, p_address text, p_balance numeric) returns void
language sql security definer set search_path to 'public' as $$
  insert into public.meowteor_nft_balances values (p_token_id, lower(p_address), p_balance, now())
  on conflict (token_id, address) do update set balance = excluded.balance, checked_at = now() $$;
revoke all on function public.meowteor_nft_edition_begin(uuid,int), public.meowteor_nft_edition_finish(int,uuid,text,text,text),
  public.meowteor_nft_set_balance(int,text,numeric) from public, anon, authenticated;
grant execute on function public.meowteor_nft_edition_begin(uuid,int), public.meowteor_nft_edition_finish(int,uuid,text,text,text),
  public.meowteor_nft_set_balance(int,text,numeric) to service_role;

-- Halloween skin owner rule (keyed on player id + wallet, never on names):
--  earned and not minted yet -> the earner; once minted -> whoever's linked wallet holds >= 1 (holder sync).
create or replace function public.meowteor_hw_owns(p_player_id uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select (exists (select 1 from public.meowteor_hw_kills k where k.player_id = p_player_id and k.earned_at is not null)
          and not exists (select 1 from public.meowteor_nft_editions e, public.meowteor_hw_config c where e.player_id = p_player_id and e.token_id = c.token_id and e.status = 'minted'))
      or exists (select 1 from public.meowteor_wallet_links w join public.meowteor_nft_balances b on b.address = w.address
                 join public.meowteor_hw_config c on c.token_id = b.token_id where w.player_id = p_player_id and b.balance > 0) $$;
revoke all on function public.meowteor_hw_owns(uuid) from public, anon, authenticated;

-- ---------- 4. key-based (v2) reads used by the new client ----------
create or replace function public.get_my_champion_skins_v2(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_pid uuid := public.meowteor_me(p_key); v jsonb; c public.meowteor_hw_config%rowtype;
begin
  v := public.get_my_champion_skins(v_pid);
  select * into c from public.meowteor_hw_config where id = 1;
  if public.meowteor_hw_owns(v_pid) then
    v := v || jsonb_build_array((select jsonb_build_object('event', 'meowteor-halloween-2026', 'item', c.item_id, 'name', 'BLACK WIDOW', 'score', 0,
        'art', jsonb_build_object('id', x.id, 'v', x.version, 'code', x.code), 'grants', '[]'::jsonb,
        'nft', (select jsonb_build_object('token_id', t.token_id, 'status', coalesce(e.status, 'unminted'), 'edition_no', e.edition_no)
                  from public.meowteor_nft_tokens t left join public.meowteor_nft_editions e on e.token_id = t.token_id and e.player_id = v_pid where t.token_id = c.token_id))
      from public.meowteor_champion_art x where x.id = c.art_id));
  end if;
  return coalesce(v, '[]'::jsonb);
end $$;
create or replace function public.get_halloween_status(p_key text default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare c public.meowteor_hw_config%rowtype; v_pid uuid; k public.meowteor_hw_kills%rowtype;
begin
  select * into c from public.meowteor_hw_config where id = 1;
  if p_key is not null then v_pid := public.meowteor_me(p_key); select * into k from public.meowteor_hw_kills where player_id = v_pid; end if;
  return jsonb_build_object('live', public.meowteor_hw_live(), 'enabled', c.enabled, 'starts_at', c.starts_at, 'ends_at', c.ends_at, 'server_now', now(),
    'threshold', c.threshold, 'kills', coalesce(k.kills, 0), 'earned', k.earned_at is not null, 'item', c.item_id, 'token_id', c.token_id);
end $$;
create or replace function public.get_my_nft_status_v2(p_key text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_pid uuid := public.meowteor_me(p_key); v jsonb;
begin
  v := public.get_my_nft_status(v_pid);
  return v || jsonb_build_object('editions', coalesce((select jsonb_agg(jsonb_build_object('token_id', t.token_id, 'item', t.item_id, 'name', t.name,
      'enabled', t.claim_enabled, 'status', coalesce(e.status, 'unminted'), 'edition_no', e.edition_no, 'minted_at', e.minted_at, 'tx', e.tx_hash))
    from public.meowteor_nft_tokens t left join public.meowteor_nft_editions e on e.token_id = t.token_id and e.player_id = v_pid
    join public.meowteor_hw_config c on c.token_id = t.token_id
    where t.edition and (e.player_id is not null or exists (select 1 from public.meowteor_hw_kills k where k.player_id = v_pid and k.earned_at is not null))), '[]'::jsonb));
end $$;
revoke all on function public.get_my_champion_skins_v2(text), public.get_halloween_status(text), public.get_my_nft_status_v2(text) from public;
grant execute on function public.get_my_champion_skins_v2(text), public.get_halloween_status(text), public.get_my_nft_status_v2(text) to anon, authenticated;

-- ---------- 5. metadata for the open edition ----------
create or replace function public.get_nft_metadata(p_token_id integer)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when t.edition then jsonb_build_object(
    'name', t.name || ' (Halloween 2026)',
    'description', 'MeowTeor Halloween 2026 event skin. Earned by slaying 25 black widow spiders in MeowTeor during the Halloween 2026 event (Oct 31 to Nov 14, 2026). One per player. Equip it in MeowTeor while this NFT is in your linked wallet. Your edition number and mint date are shown on lostauragames.com/nft/meowteor/claim.html.',
    'image', 'https://lostauragames.com/nft/meowteor/images/' || t.token_id || '.png',
    'animation_url', 'https://lostauragames.com/nft/meowteor/images/' || t.token_id || '.gif',
    'external_url', 'https://lostauragames.com/games/meowteor.html',
    'attributes', jsonb_build_array(
      jsonb_build_object('trait_type','Event','value','Halloween 2026 Event'),
      jsonb_build_object('trait_type','Edition','value','Open Edition (one per player)'),
      jsonb_build_object('trait_type','Requirement','value','25 spiders slain'),
      jsonb_build_object('trait_type','Total Minted','value', (select count(*) from public.meowteor_nft_editions e where e.token_id = t.token_id and e.status = 'minted'), 'display_type','number'))
      || coalesce((select jsonb_build_array(jsonb_build_object('trait_type','First Mint Date','value', extract(epoch from min(e.minted_at))::bigint, 'display_type','date'))
           from public.meowteor_nft_editions e where e.token_id = t.token_id and e.status = 'minted' having count(*) > 0), '[]'::jsonb))
  else jsonb_build_object(
    'name', t.name || ' #' || t.token_id,
    'description', 'MeowTeor Pro Item. A 1 of 1 full-body space cat skin awarded to the Leaderboard Champion. Equip it in MeowTeor while this NFT is in your linked wallet.',
    'image', 'https://lostauragames.com/nft/meowteor/images/' || t.token_id || '.png',
    'animation_url', 'https://lostauragames.com/nft/meowteor/images/' || t.token_id || '.gif',
    'external_url', 'https://lostauragames.com/games/meowteor.html',
    'attributes', jsonb_build_array(
      jsonb_build_object('trait_type','Edition','value','1 of 1'),
      jsonb_build_object('trait_type','Rarity','value','Unique'),
      jsonb_build_object('trait_type','Total Minted','value', case when t.status = 'minted' then 1 else 0 end, 'display_type','number'),
      jsonb_build_object('trait_type','Event','value', coalesce(t.event_id,'unassigned')),
      jsonb_build_object('trait_type','Won By','value', coalesce(c.winner_name,'-')),
      jsonb_build_object('trait_type','Score','value', coalesce(c.winner_score,0), 'display_type','number'))
      || case when t.minted_at is not null then jsonb_build_array(jsonb_build_object('trait_type','Mint Date','value', extract(epoch from t.minted_at)::bigint, 'display_type','date')) else '[]'::jsonb end) end
  from public.meowteor_nft_tokens t left join public.meowteor_champion c on c.event_id = t.event_id and not t.edition
  where t.token_id = p_token_id $$;

-- auto-enable (pro tokens) must skip edition tokens: their event_id is not a leaderboard event
create or replace function public.meowteor_nft_auto_enable(p_dry boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_link jsonb; v_en jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('token_id', t.token_id, 'event_id', c.event_id)), '[]') into v_link
    from public.meowteor_nft_tokens t join public.meowteor_champion c on c.item_id = t.item_id and not c.is_test
   where t.event_id is null and not t.edition;
  select coalesce(jsonb_agg(t.token_id), '[]') into v_en
    from public.meowteor_nft_tokens t join public.meowteor_champion c on c.event_id = t.event_id
   where not t.claim_enabled and not t.edition and t.event_id is not null and not c.is_test
     and c.deadline <= now() and c.decided_at is not null and c.winner_player_id is not null;
  if not p_dry then
    update public.meowteor_nft_tokens t set event_id = c.event_id
      from public.meowteor_champion c where c.item_id = t.item_id and not c.is_test and t.event_id is null and not t.edition;
    update public.meowteor_nft_tokens t set claim_enabled = true
      from public.meowteor_champion c where c.event_id = t.event_id and not t.claim_enabled and not t.edition and t.event_id is not null and not c.is_test
       and c.deadline <= now() and c.decided_at is not null and c.winner_player_id is not null;
  end if;
  return jsonb_build_object('dry', p_dry, 'linked', v_link, 'enabled', v_en);
end $$;
commit;
