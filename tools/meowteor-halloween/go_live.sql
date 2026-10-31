-- MeowTeor Halloween 2026: GO LIVE (run only after the user approves AND the PR is merged).
begin;
update public.meowteor_hw_config set enabled = true, starts_at = now() where id = 1;          -- ends 2026-11-14 00:00 ET (config)
update public.meowteor_nft_tokens set claim_enabled = true where token_id = 12;               -- earners can mint token 12
-- close the legacy "raw player id" doors once the new client (keys) is live
revoke execute on function public.get_my_champion_skins(uuid), public.get_my_nft_status(uuid), public.claim_champion_skin(uuid, text) from anon, authenticated;
commit;
-- then redeploy meowteor-nft-claim with LEGACY_PID off (edit default '1' -> '0', or set Edge secret ALLOW_LEGACY_PID=0).
