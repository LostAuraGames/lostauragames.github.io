-- =====================================================================================================
-- MEOWTEOR Pro Items as NFTs (Immutable zkEVM mainnet, ERC-1155 1-of-1, contract 0x7dde94d0299189ff7b6b092e788d382edb54b94c).
-- Minted directly on-chain by a server minter wallet (key in Supabase Vault, never leaves the DB/edge function).
-- Ownership rule (user decision): once a skin is minted, the in-game skin follows whoever holds the NFT
-- (via a verified wallet link). Before minting, the event winner owns it. Mints happen when the winner claims.
-- =====================================================================================================
begin;
create extension if not exists pg_net with schema extensions;

-- one verified wallet per player (and per wallet). Verification = personal_sign of a server nonce (MetaMask) or
-- a Passport ID token, checked in the edge function meowteor-nft-claim (service role writes here).
create table if not exists public.meowteor_wallet_links(
  player_id uuid primary key,
  address text not null unique check (address ~ '^0x[0-9a-f]{40}$'),
  method text not null check (method in ('metamask','passport')),
  verified_at timestamptz not null default now());
create table if not exists public.meowteor_wallet_nonces(
  player_id uuid primary key, nonce text not null, expires_at timestamptz not null);

-- one row per 1-of-1 token. token_id 1 = ASTRAL SOVEREIGN (event meowteor-2026-10-29, won by SKUFLER).
create table if not exists public.meowteor_nft_tokens(
  token_id integer primary key check (token_id > 0),
  item_id text not null unique,
  name text not null,
  event_id text unique,                       -- set when an event awards the skin
  status text not null default 'unminted' check (status in ('unminted','pending','minted','failed')),
  reference_id text unique,                   -- Minting API idempotency key: meowteor-<event>-<item>
  minted_to text,                             -- winner wallet at mint time
  minted_at timestamptz,
  tx_hash text,
  holder_address text,                        -- current on-chain holder (holder sync)
  holder_checked_at timestamptz,
  last_error text,
  claim_enabled boolean not null default false,  -- per-token kill switch: claims refused until the owner approves
  mint_lock_until timestamptz);                 -- lease so two requests never send two mint txs
insert into public.meowteor_nft_tokens (token_id, item_id, name, event_id) values
 (1,'skin_champion','ASTRAL SOVEREIGN','meowteor-2026-10-29'),
 (2,'skin_pro_01_solar_phoenix','SOLAR PHOENIX',null),(3,'skin_pro_02_frost_monarch','FROST MONARCH',null),
 (4,'skin_pro_03_void_reaper','VOID REAPER',null),(5,'skin_pro_04_emerald_dragon_knight','EMERALD DRAGON KNIGHT',null),
 (6,'skin_pro_05_neon_cyber','NEON CYBER',null),(7,'skin_pro_06_molten_titan','MOLTEN TITAN',null),
 (8,'skin_pro_07_storm_samurai','STORM SAMURAI',null),(9,'skin_pro_08_celestial_angel','CELESTIAL ANGEL',null),
 (10,'skin_pro_09_abyssal_kraken','ABYSSAL KRAKEN',null),(11,'skin_pro_10_golden_pharaoh','GOLDEN PHARAOH',null)
on conflict (token_id) do nothing;
-- later events: the event id is filled in from meowteor_champion when the skin's event is decided
update public.meowteor_nft_tokens t set event_id = c.event_id
  from public.meowteor_champion c where c.item_id = t.item_id and t.event_id is null and not c.is_test;

create table if not exists public.meowteor_nft_sync_log(
  id bigserial primary key, token_id integer not null, from_address text, to_address text, at timestamptz not null default now());

alter table public.meowteor_wallet_links enable row level security;
alter table public.meowteor_wallet_nonces enable row level security;
alter table public.meowteor_nft_tokens enable row level security;
alter table public.meowteor_nft_sync_log enable row level security;
revoke all on public.meowteor_wallet_links, public.meowteor_wallet_nonces, public.meowteor_nft_tokens, public.meowteor_nft_sync_log from anon, authenticated;

-- who owns the in-game skin right now
create or replace function public.meowteor_skin_owner(p_item text) returns uuid
language sql stable security definer set search_path to 'public' as $$
  select case when t.status = 'minted'
              then (select w.player_id from public.meowteor_wallet_links w where w.address = coalesce(t.holder_address, t.minted_to))
              else c.winner_player_id end
    from public.meowteor_champion c left join public.meowteor_nft_tokens t on t.item_id = c.item_id
   where c.item_id = p_item and c.decided_at is not null and not c.is_test
   order by c.deadline desc limit 1 $$;
revoke all on function public.meowteor_skin_owner(text) from public, anon, authenticated;

-- same output as before, but ownership follows the NFT holder once minted
create or replace function public.get_my_champion_skins(p_player_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_out jsonb;
begin
  if p_player_id is null then return '[]'::jsonb; end if;
  update public.meowteor_champion set claimed_at = now() where winner_player_id = p_player_id and decided_at is not null and claimed_at is null;
  select coalesce(jsonb_agg(jsonb_build_object('event', c.event_id, 'item', c.item_id, 'name', c.winner_name, 'score', c.winner_score,
           'art', jsonb_build_object('id', x.id, 'v', x.version, 'code', x.code),
           'grants', case when c.winner_player_id = p_player_id
                          then coalesce((select jsonb_agg(g.item_id) from public.meowteor_champion_grants g where g.event_id = c.event_id), '[]'::jsonb)
                          else '[]'::jsonb end,
           'nft', (select jsonb_build_object('token_id', t.token_id, 'status', t.status) from public.meowteor_nft_tokens t where t.item_id = c.item_id))
         order by c.deadline), '[]'::jsonb) into v_out
    from public.meowteor_champion c join public.meowteor_champion_art x on x.id = c.art_id
   where c.decided_at is not null and not c.is_test and public.meowteor_skin_owner(c.item_id) = p_player_id;
  return v_out;
end $function$;

-- public: claim/link status for the claim button
create or replace function public.get_my_nft_status(p_player_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'wallet', (select jsonb_build_object('address', w.address, 'method', w.method) from public.meowteor_wallet_links w where w.player_id = p_player_id),
    'claimable', coalesce((select jsonb_agg(jsonb_build_object('token_id', t.token_id, 'item', t.item_id, 'name', t.name, 'event', t.event_id, 'status', t.status, 'enabled', t.claim_enabled) order by t.token_id)
       from public.meowteor_nft_tokens t join public.meowteor_champion c on c.event_id = t.event_id
      where c.winner_player_id = p_player_id and c.decided_at is not null and not c.is_test and t.status in ('unminted','failed','pending')), '[]'::jsonb),
    'held', coalesce((select jsonb_agg(t.token_id) from public.meowteor_nft_tokens t join public.meowteor_wallet_links w on w.address = coalesce(t.holder_address, t.minted_to)
      where w.player_id = p_player_id and t.status = 'minted'), '[]'::jsonb)) $$;
revoke all on function public.get_my_nft_status(uuid) from public;
grant execute on function public.get_my_nft_status(uuid) to anon, authenticated;

-- public metadata source (also used by the GitHub Action that writes the static files under the base URI)
create or replace function public.get_nft_metadata(p_token_id integer)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
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
      || case when t.minted_at is not null then jsonb_build_array(jsonb_build_object('trait_type','Mint Date','value', extract(epoch from t.minted_at)::bigint, 'display_type','date')) else '[]'::jsonb end)
  from public.meowteor_nft_tokens t left join public.meowteor_champion c on c.event_id = t.event_id
  where t.token_id = p_token_id $$;
revoke all on function public.get_nft_metadata(integer) from public;
grant execute on function public.get_nft_metadata(integer) to anon, authenticated;

-- ---- service-role only (edge functions) ----
create or replace function public.meowteor_wallet_nonce(p_player_id uuid) returns text
language plpgsql security definer set search_path to 'public' as $$
declare v text := encode(extensions.gen_random_bytes(16),'hex');
begin
  insert into public.meowteor_wallet_nonces values (p_player_id, v, now() + interval '10 minutes')
  on conflict (player_id) do update set nonce = excluded.nonce, expires_at = excluded.expires_at;
  return v;
end $$;
create or replace function public.meowteor_wallet_link(p_player_id uuid, p_address text, p_method text, p_nonce text) returns boolean
language plpgsql security definer set search_path to 'public' as $$
begin
  if p_method = 'metamask' and not exists (select 1 from public.meowteor_wallet_nonces n where n.player_id = p_player_id and n.nonce = p_nonce and n.expires_at > now()) then
    raise exception 'bad link: nonce expired' using errcode = '22023'; end if;
  delete from public.meowteor_wallet_nonces where player_id = p_player_id;
  if exists (select 1 from public.meowteor_wallet_links w where w.address = lower(p_address) and w.player_id <> p_player_id) then
    raise exception 'bad link: wallet already linked to another player' using errcode = '22023'; end if;
  insert into public.meowteor_wallet_links (player_id, address, method) values (p_player_id, lower(p_address), p_method)
  on conflict (player_id) do update set address = excluded.address, method = excluded.method, verified_at = now();
  return true;
end $$;
-- reserve the mint (idempotent): returns what to send to the Minting API
create or replace function public.meowteor_nft_claim_begin(p_player_id uuid, p_token_id integer)
returns table(token_id integer, item_id text, reference_id text, owner_address text, status text)
language plpgsql security definer set search_path to 'public' as $$
#variable_conflict use_column
declare t public.meowteor_nft_tokens%rowtype; v_addr text;
begin
  select * into t from public.meowteor_nft_tokens x where x.token_id = p_token_id for update;
  if not found or t.event_id is null then raise exception 'bad claim: unknown token' using errcode = '22023'; end if;
  if not exists (select 1 from public.meowteor_champion c where c.event_id = t.event_id and c.winner_player_id = p_player_id and c.decided_at is not null and not c.is_test) then
    raise exception 'bad claim: not the winner' using errcode = '22023'; end if;
  if public.lb_banned(p_player_id) then raise exception 'player is banned' using errcode = 'P0001'; end if;
  select w.address into v_addr from public.meowteor_wallet_links w where w.player_id = p_player_id;
  if v_addr is null then raise exception 'bad claim: link a wallet first' using errcode = '22023'; end if;
  if t.status = 'minted' then raise exception 'bad claim: already minted' using errcode = '22023'; end if;
  if not t.claim_enabled then raise exception 'bad claim: claiming opens soon' using errcode = '22023'; end if;
  if t.mint_lock_until > now() then raise exception 'bad claim: mint in progress, try again in a minute' using errcode = '22023'; end if;
  update public.meowteor_nft_tokens x set status = 'pending', mint_lock_until = now() + interval '3 minutes', minted_to = coalesce(case when x.status = 'pending' then x.minted_to end, v_addr),
         reference_id = coalesce(x.reference_id, 'meowteor-' || t.event_id || '-' || t.item_id), last_error = null
   where x.token_id = p_token_id returning x.minted_to into v_addr;
  return query select t.token_id, t.item_id, coalesce(t.reference_id, 'meowteor-' || t.event_id || '-' || t.item_id), v_addr, 'pending'::text;
end $$;
create or replace function public.meowteor_nft_claim_finish(p_token_id integer, p_status text, p_tx text, p_error text)
returns void language sql security definer set search_path to 'public' as $$
  update public.meowteor_nft_tokens set status = p_status, tx_hash = coalesce(p_tx, tx_hash), last_error = p_error,
         mint_lock_until = case when p_status = 'pending' then mint_lock_until else null end,
         minted_at = case when p_status = 'minted' then coalesce(minted_at, now()) else minted_at end,
         holder_address = case when p_status = 'minted' then coalesce(holder_address, minted_to) else holder_address end
   where token_id = p_token_id and p_status in ('pending','minted','failed') $$;
-- holder sync: called by the sync job with the on-chain holder of each minted token
create or replace function public.meowteor_nft_set_holder(p_token_id integer, p_address text) returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare v_old text;
begin
  select holder_address into v_old from public.meowteor_nft_tokens where token_id = p_token_id and status = 'minted' for update;
  if not found then return false; end if;
  update public.meowteor_nft_tokens set holder_address = lower(p_address), holder_checked_at = now() where token_id = p_token_id;
  if v_old is distinct from lower(p_address) then insert into public.meowteor_nft_sync_log (token_id, from_address, to_address) values (p_token_id, v_old, lower(p_address)); return true; end if;
  return false;
end $$;
-- minter key + cron token live in Vault (service role only)
create or replace function public.meowteor_nft_secret(p_name text) returns text
language sql stable security definer set search_path to 'public' as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name and p_name in ('meowteor_minter_key','meowteor_sync_token') $$;
revoke all on function public.meowteor_nft_secret(text) from public, anon, authenticated;
grant execute on function public.meowteor_nft_secret(text) to service_role;
revoke all on function public.meowteor_wallet_nonce(uuid), public.meowteor_wallet_link(uuid,text,text,text),
  public.meowteor_nft_claim_begin(uuid,integer), public.meowteor_nft_claim_finish(integer,text,text,text),
  public.meowteor_nft_set_holder(integer,text) from public, anon, authenticated;
grant execute on function public.meowteor_wallet_nonce(uuid), public.meowteor_wallet_link(uuid,text,text,text),
  public.meowteor_nft_claim_begin(uuid,integer), public.meowteor_nft_claim_finish(integer,text,text,text),
  public.meowteor_nft_set_holder(integer,text) to service_role;
-- secrets generated inside the DB (no copy anywhere else); idempotent
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'meowteor_minter_key') then
    perform vault.create_secret('0x' || encode(extensions.gen_random_bytes(32),'hex'), 'meowteor_minter_key', 'MeowTeor NFT minter wallet private key'); end if;
  if not exists (select 1 from vault.secrets where name = 'meowteor_sync_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24),'hex'), 'meowteor_sync_token', 'pg_cron -> meowteor-nft-holder-sync auth'); end if;
end $$;
commit;
