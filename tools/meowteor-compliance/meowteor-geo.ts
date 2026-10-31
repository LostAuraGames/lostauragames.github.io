// @ts-nocheck
// Supabase Edge Function meowteor-geo (verify_jwt false).
//  {action:'check'}                 -> {blocked, message?}   (client IP geoblock; pages + in-game chip use this)
//  {action:'screen', address}       -> {blocked, sanctioned, message?} (geo + sanctioned-wallet screen, market page guard)
//  {action:'refresh_geo'|'refresh_sanctions'} + header x-sync-token  (pg_cron jobs)
// IP data by DB-IP (https://db-ip.com), CC BY 4.0.
import { REGION_MSG, WALLET_MSG, geoBlocked, screenWallet, logHit } from './compliance.ts';
const SB_URL = Deno.env.get('SUPABASE_URL'), SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info'};
const J = (s, o) => new Response(JSON.stringify(o), {status: s, headers: {...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
export async function rpc(fn, body) { const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {method: 'POST', headers: {apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const t = await r.text(); let v = null; try { v = t ? JSON.parse(t) : null; } catch (e) {} if (!r.ok) throw new Error((v && v.message) || ('rpc ' + fn + ' ' + r.status)); return v; }
// ---- refresh: DB-IP country lite (monthly). Only ranges of blocked countries are stored. ----
export async function refreshGeo(fetchFn = fetch) {
  const block = new Set(await rpc('meowteor_geo_blocklist', {}));
  const now = new Date(); const months = [0, 1].map(k => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)); return d.toISOString().slice(0, 7); });
  let res = null, src = '';
  for (const m of months) { src = `https://download.db-ip.com/free/dbip-country-lite-${m}.csv.gz`; res = await fetchFn(src); if (res.ok) break; }
  if (!res || !res.ok) throw new Error('DB-IP download failed');
  const lines = res.body.pipeThrough(new DecompressionStream('gzip')).pipeThrough(new TextDecoderStream());
  const out = []; let buf = '', total = 0;
  for await (const chunk of lines) { buf += chunk; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); total++;
    const p = l.split(','); if (p.length >= 3 && block.has(p[2].trim())) out.push([p[0].trim(), p[1].trim(), p[2].trim()]); } }
  if (total < 100000) throw new Error('DB-IP list looks incomplete (' + total + ' rows)');
  const n = await rpc('meowteor_geo_replace', {p_ranges: out, p_source: src});
  return {source: src, scanned: total, stored: n};
}
// ---- refresh: OFAC SDN digital currency addresses (EVM 0x addresses of any listed chain/token) ----
export async function refreshSanctions(fetchFn = fetch) {
  const src = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML';
  const r = await fetchFn(src); if (!r.ok) throw new Error('OFAC download failed ' + r.status);
  const xml = await r.text(); const set = new Set();
  const re = /<idType>Digital Currency Address - [^<]*<\/idType>\s*<idNumber>\s*(0x[0-9a-fA-F]{40})\s*<\/idNumber>/g; let m;
  while ((m = re.exec(xml))) set.add(m[1].toLowerCase());
  const n = await rpc('meowteor_sanctions_replace', {p_addresses: [...set], p_source: 'OFAC SDN.XML'});
  return {source: src, found: set.size, total: n};
}
export async function handle(req) {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS});
  let b = {}; if (req.method === 'POST') { try { b = JSON.parse(await req.text() || '{}'); } catch (e) { return J(400, {message: 'bad json'}); } }
  const action = String(b.action || new URL(req.url).searchParams.get('action') || 'check');
  try {
    if (action === 'refresh_geo' || action === 'refresh_sanctions') {
      const tok = await rpc('meowteor_nft_secret', {p_name: 'meowteor_sync_token'});
      if (!tok || req.headers.get('x-sync-token') !== tok) return J(403, {message: 'forbidden'});
      return J(200, action === 'refresh_geo' ? await refreshGeo() : await refreshSanctions());
    }
    const c = await geoBlocked(req, rpc);
    if (c) { await logHit(rpc, 'geo', action, req, c, b.address, null); return J(200, {blocked: true, message: REGION_MSG}); }
    if (action === 'screen') {
      const a = String(b.address || ''); if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return J(400, {message: 'bad address'});
      const s = await screenWallet(a, rpc);
      if (s.sanctioned) { await logHit(rpc, 'wallet', 'screen', req, null, a, {source: s.source}); return J(200, {blocked: true, sanctioned: true, message: WALLET_MSG}); }
      return J(200, {blocked: false, sanctioned: false});
    }
    return J(200, {blocked: false});
  } catch (e) { return J(502, {message: String(e && e.message || e)}); }
}
if (typeof Deno !== 'undefined' && Deno.serve && !Deno.env.get('NO_SERVE')) Deno.serve(handle);
