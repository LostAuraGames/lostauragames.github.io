// @ts-nocheck
// Shared OFAC compliance helpers (meowteor-geo, meowteor-nft-claim).
// Geo: client IP (cf-connecting-ip) -> blocked country via meowteor_geo_ranges (DB-IP country lite, refreshed monthly).
// Wallets: OFAC SDN digital-currency addresses (meowteor_sanctioned_addresses, refreshed daily) + Chainalysis sanctions oracle.
export const REGION_MSG = 'NFT features are not available in your region.';
export const WALLET_MSG = 'This wallet cannot use MeowTeor NFT features.';
const ORACLE = '0x40C57923924B5c5c5455c48D93317139ADDaC8fb';               // Chainalysis sanctions oracle (Ethereum mainnet)
const ORACLE_RPC = Deno.env.get('SANCTIONS_ORACLE_RPC') || 'https://ethereum-rpc.publicnode.com';
export function clientIp(req) { return (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim(); }
export async function ipHash(ip) { const d = new TextEncoder().encode('meowteor-geo:' + new Date().toISOString().slice(0, 7) + ':' + ip);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', d))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(''); }
export async function geoBlocked(req, rpc) { const ip = clientIp(req); if (!ip) return null; return await rpc('meowteor_geo_blocked', {p_ip: ip}); }
export async function oracleSanctioned(addr) {
  const data = '0xdf592f7d' + addr.toLowerCase().slice(2).padStart(64, '0');      // isSanctioned(address)
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 3500);
  try { const r = await fetch(ORACLE_RPC, {method: 'POST', signal: ctl.signal, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{to: ORACLE, data}, 'latest']})});
    const j = await r.json(); if (!j || typeof j.result !== 'string' || j.result.length < 66) return null; return BigInt(j.result) !== 0n; }
  catch (e) { return null; } finally { clearTimeout(tm); } }
export async function screenWallet(addr, rpc) {
  const list = await rpc('meowteor_wallet_sanctioned', {p_address: addr});
  if (list) return {sanctioned: true, source: 'ofac-sdn'};
  const o = await oracleSanctioned(addr);
  return {sanctioned: o === true, source: o === true ? 'chainalysis-oracle' : null, oracle: o === null ? 'unavailable' : 'ok'};
}
export async function logHit(rpc, kind, action, req, country, address, detail) {
  try { await rpc('meowteor_compliance_log_add', {p_kind: kind, p_action: action, p_country: country || null, p_address: address || null, p_ip_hash: await ipHash(clientIp(req)), p_detail: detail || null}); } catch (e) {}
}
