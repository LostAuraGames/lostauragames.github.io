-- MeowTeor NFT compliance (OFAC): IP geoblock (DB-IP country lite) + sanctioned-wallet screening (OFAC SDN + Chainalysis oracle).
begin;
create table if not exists public.meowteor_compliance_config(
  id int primary key default 1 check (id = 1),
  blocked_countries text[] not null default '{CU,IR,KP,SY}',
  -- Russian-occupied Ukraine (Crimea, Donetsk, Luhansk) cannot be detected with country-level IP data: those IPs
  -- geolocate as UA or RU. Documented limitation; blocking them would need region-level (city) data.
  notes text not null default 'RU-occupied regions of Ukraine (Crimea, Donetsk, Luhansk) are not detectable with country-level IP data (limitation).',
  geo_refreshed_at timestamptz, geo_source text, geo_rows int,
  sanctions_refreshed_at timestamptz, sanctions_source text, sanctions_rows int);
insert into public.meowteor_compliance_config(id) values (1) on conflict do nothing;
create table if not exists public.meowteor_geo_ranges(ip_start inet not null, ip_end inet not null, country text not null);
create index if not exists meowteor_geo_ranges_start on public.meowteor_geo_ranges(ip_start);
create table if not exists public.meowteor_sanctioned_addresses(address text primary key check (address ~ '^0x[0-9a-f]{40}$'), source text not null, added_at timestamptz not null default now());
create table if not exists public.meowteor_compliance_log(id bigserial primary key, at timestamptz not null default now(), kind text not null,
  action text, country text, address text, ip_hash text, detail jsonb);
alter table public.meowteor_compliance_config enable row level security;
alter table public.meowteor_geo_ranges enable row level security;
alter table public.meowteor_sanctioned_addresses enable row level security;
alter table public.meowteor_compliance_log enable row level security;
revoke all on public.meowteor_compliance_config, public.meowteor_geo_ranges, public.meowteor_sanctioned_addresses, public.meowteor_compliance_log from anon, authenticated;

-- country of an IP if it is blocked (null otherwise)
create or replace function public.meowteor_geo_blocked(p_ip text) returns text
language plpgsql stable security definer set search_path to 'public' as $$
declare v inet; c text;
begin
  begin v := p_ip::inet; exception when others then return null; end;
  -- the table holds only ranges of blocked countries (filtered at refresh), so any hit is a block
  select r.country into c from public.meowteor_geo_ranges r
   where family(r.ip_start) = family(v) and r.ip_start <= v and r.ip_end >= v
     and r.country = any((select blocked_countries from public.meowteor_compliance_config where id = 1)) limit 1;
  return c;
end $$;
create or replace function public.meowteor_wallet_sanctioned(p_address text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.meowteor_sanctioned_addresses where address = lower(p_address)) $$;
create or replace function public.meowteor_compliance_log_add(p_kind text, p_action text, p_country text, p_address text, p_ip_hash text, p_detail jsonb)
returns void language sql security definer set search_path to 'public' as $$
  insert into public.meowteor_compliance_log(kind, action, country, address, ip_hash, detail) values (p_kind, p_action, p_country, lower(p_address), p_ip_hash, p_detail) $$;
-- refresh helpers (edge function meowteor-geo)
create or replace function public.meowteor_geo_blocklist() returns text[] language sql stable security definer set search_path to 'public' as $$
  select blocked_countries from public.meowteor_compliance_config where id = 1 $$;
create or replace function public.meowteor_geo_replace(p_ranges jsonb, p_source text) returns int
language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  if jsonb_array_length(p_ranges) < 50 then raise exception 'geo refresh: suspiciously small list (%), keeping the old one', jsonb_array_length(p_ranges); end if;
  delete from public.meowteor_geo_ranges;
  insert into public.meowteor_geo_ranges(ip_start, ip_end, country) select (e->>0)::inet, (e->>1)::inet, e->>2 from jsonb_array_elements(p_ranges) e;
  get diagnostics n = row_count;
  update public.meowteor_compliance_config set geo_refreshed_at = now(), geo_source = p_source, geo_rows = n where id = 1;
  return n;
end $$;
create or replace function public.meowteor_sanctions_replace(p_addresses text[], p_source text) returns int
language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  if coalesce(array_length(p_addresses, 1), 0) < 20 then raise exception 'sanctions refresh: suspiciously small list, keeping the old one'; end if;
  -- additive: an address that was ever on the list stays blocked (delisting is rare; review manually)
  insert into public.meowteor_sanctioned_addresses(address, source) select distinct lower(a), p_source from unnest(p_addresses) a where lower(a) ~ '^0x[0-9a-f]{40}$'
  on conflict (address) do nothing;
  select count(*) into n from public.meowteor_sanctioned_addresses;
  update public.meowteor_compliance_config set sanctions_refreshed_at = now(), sanctions_source = p_source, sanctions_rows = n where id = 1;
  return n;
end $$;
revoke all on function public.meowteor_geo_blocked(text), public.meowteor_wallet_sanctioned(text), public.meowteor_compliance_log_add(text,text,text,text,text,jsonb),
  public.meowteor_geo_blocklist(), public.meowteor_geo_replace(jsonb,text), public.meowteor_sanctions_replace(text[],text) from public, anon, authenticated;
grant execute on function public.meowteor_geo_blocked(text), public.meowteor_wallet_sanctioned(text), public.meowteor_compliance_log_add(text,text,text,text,text,jsonb),
  public.meowteor_geo_blocklist(), public.meowteor_geo_replace(jsonb,text), public.meowteor_sanctions_replace(text[],text) to service_role;
commit;
