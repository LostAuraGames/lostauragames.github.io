-- MeowTeor admin NFT grants (e.g. "Runner up" rewards). A grant lets a player claim an open-edition token
-- (token 12 Black Widow) to their own linked wallet without the 25-kill / event-date requirement. One per player still.
-- Only the database owner / service side writes grants; clients have no access (RLS on, no policies, grants revoked).
create table if not exists public.meowteor_nft_grants(
  player_id uuid not null, token_id int not null, event_id text, place int, score int,
  reason text not null, granted_at timestamptz not null default now(), granted_by text not null default 'admin',
  primary key (player_id, token_id));
alter table public.meowteor_nft_grants enable row level security;
revoke all on public.meowteor_nft_grants from anon, authenticated, public;

create or replace function public.meowteor_has_grant(p_player_id uuid, p_token_id int) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.meowteor_nft_grants g where g.player_id = p_player_id and g.token_id = p_token_id) $$;
revoke all on function public.meowteor_has_grant(uuid,int) from anon, authenticated, public;

-- owns the Halloween skin in game: earned (or granted) and not yet minted, or holds the NFT
create or replace function public.meowteor_hw_owns(p_player_id uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select ((exists (select 1 from public.meowteor_hw_kills k where k.player_id = p_player_id and k.earned_at is not null)
           or exists (select 1 from public.meowteor_nft_grants g, public.meowteor_hw_config c where g.player_id = p_player_id and g.token_id = c.token_id))
          and not exists (select 1 from public.meowteor_nft_editions e, public.meowteor_hw_config c where e.player_id = p_player_id and e.token_id = c.token_id and e.status = 'minted'))
      or exists (select 1 from public.meowteor_wallet_links w join public.meowteor_nft_balances b on b.address = w.address
                 join public.meowteor_hw_config c on c.token_id = b.token_id where w.player_id = p_player_id and b.balance > 0) $$;

create or replace function public.meowteor_nft_edition_begin(p_player_id uuid, p_token_id integer) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare t public.meowteor_nft_tokens%rowtype; e public.meowteor_nft_editions%rowtype; v_addr text;
begin
  select * into t from public.meowteor_nft_tokens where token_id = p_token_id for update;
  if not found or not t.edition then raise exception 'bad claim: unknown token' using errcode = '22023'; end if;
  if not t.claim_enabled then raise exception 'bad claim: claiming opens soon' using errcode = '22023'; end if;
  if public.lb_banned(p_player_id) then raise exception 'player is banned' using errcode = 'P0001'; end if;
  if t.item_id = (select item_id from public.meowteor_hw_config where id = 1) and not exists
     (select 1 from public.meowteor_hw_kills k, public.meowteor_hw_config c where k.player_id = p_player_id and k.earned_at is not null and k.earned_at < c.ends_at)
     and not public.meowteor_has_grant(p_player_id, p_token_id) then
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
end $function$;

create or replace function public.get_my_nft_status_v2(p_key text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare v_pid uuid := public.meowteor_me(p_key); v jsonb;
begin
  v := public.get_my_nft_status(v_pid);
  return v || jsonb_build_object('editions', coalesce((select jsonb_agg(jsonb_build_object('token_id', t.token_id, 'item', t.item_id, 'name', t.name,
      'enabled', t.claim_enabled, 'status', coalesce(e.status, 'unminted'), 'edition_no', e.edition_no, 'minted_at', e.minted_at, 'tx', e.tx_hash,
      'reward', (select g.reason from public.meowteor_nft_grants g where g.player_id = v_pid and g.token_id = t.token_id)))
    from public.meowteor_nft_tokens t left join public.meowteor_nft_editions e on e.token_id = t.token_id and e.player_id = v_pid
    join public.meowteor_hw_config c on c.token_id = t.token_id
    where t.edition and (e.player_id is not null or exists (select 1 from public.meowteor_hw_kills k where k.player_id = v_pid and k.earned_at is not null)
                         or public.meowteor_has_grant(v_pid, t.token_id))), '[]'::jsonb));
end $function$;

create or replace function public.get_my_champion_skins_v2(p_key text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_pid uuid := public.meowteor_me(p_key); v jsonb; c public.meowteor_hw_config%rowtype;
begin
  v := public.get_my_champion_skins(v_pid);
  select * into c from public.meowteor_hw_config where id = 1;
  if public.meowteor_hw_owns(v_pid) then
    v := v || jsonb_build_array((select jsonb_build_object('event', 'meowteor-halloween-2026', 'item', c.item_id, 'name', 'BLACK WIDOW', 'score', 0,
        'art', jsonb_build_object('id', x.id, 'v', x.version, 'code', x.code), 'grants', '[]'::jsonb,
        'reward', (select g.reason from public.meowteor_nft_grants g where g.player_id = v_pid and g.token_id = c.token_id),
        'nft', (select jsonb_build_object('token_id', t.token_id, 'status', coalesce(e.status, 'unminted'), 'edition_no', e.edition_no)
                  from public.meowteor_nft_tokens t left join public.meowteor_nft_editions e on e.token_id = t.token_id and e.player_id = v_pid where t.token_id = c.token_id))
      from public.meowteor_champion_art x where x.id = c.art_id));
  end if;
  return coalesce(v, '[]'::jsonb);
end $function$;
