// @ts-nocheck
// Supabase Edge Function: meowteor-nft-holder-sync (pg_cron + pg_net every 5 min; auth = Vault token meowteor_sync_token).
// Reads the current holder of every minted 1-of-1 token from chain: latest TransferSingle/TransferBatch to-address
// (via eth_getLogs) cross-checked with ERC-1155 balanceOf == 1, then moves in-game ownership via meowteor_nft_set_holder.
import { ethers } from 'npm:ethers@6';
const SB_URL = Deno.env.get('SUPABASE_URL'), SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const IMX_CHAIN = Deno.env.get('IMX_CHAIN') || 'mainnet';
const RPC_URL = Deno.env.get('IMX_RPC') || (IMX_CHAIN === 'mainnet' ? 'https://rpc.immutable.com' : 'https://rpc.testnet.immutable.com');
const CHAIN_ID = IMX_CHAIN === 'mainnet' ? 13371 : 13473;
const CONTRACT = (Deno.env.get('NFT_CONTRACT') || '0x7dde94d0299189ff7b6b092e788d382edb54b94c').toLowerCase();
const IFACE = new ethers.Interface(['event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
  'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)',
  'function balanceOf(address, uint256) view returns (uint256)']);
export let provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, {staticNetwork: true});
export function _setProvider(p) { provider = p; }
async function rpc(fn, body) { const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {method:'POST', headers:{apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Content-Type':'application/json'}, body: JSON.stringify(body)});
  const t = await r.text(); if (!r.ok) throw new Error('rpc ' + fn + ' ' + r.status + ' ' + t.slice(0, 120)); return t ? JSON.parse(t) : null; }
// candidates: every address that ever received the id (newest first), from transfer logs since the mint block
async function candidates(id, fromBlock) {
  const logs = await provider.getLogs({address: CONTRACT, fromBlock, toBlock: 'latest', topics: [[IFACE.getEvent('TransferSingle').topicHash, IFACE.getEvent('TransferBatch').topicHash]]});
  const out = [];
  for (const l of logs) { const ev = IFACE.parseLog(l); const ids = ev.name === 'TransferSingle' ? [ev.args.id] : ev.args.ids;
    if (ids.some(x => x === BigInt(id))) out.unshift(String(ev.args.to).toLowerCase()); }
  return [...new Set(out)];
}
async function balanceOf(addr, id) { return BigInt(await provider.call({to: CONTRACT, data: IFACE.encodeFunctionData('balanceOf', [addr, id])})); }
export async function syncOnce(tokens) {
  const out = [];
  for (const t of tokens) {
    let fromBlock = 0;
    if (t.tx_hash) { const rc = await provider.getTransactionReceipt(t.tx_hash).catch(() => null); if (rc) fromBlock = rc.blockNumber; }
    const cands = [...new Set([...(await candidates(t.token_id, fromBlock)), t.holder_address, t.minted_to].filter(Boolean).map(a => a.toLowerCase()))];
    let holder = null;
    for (const a of cands) if (a !== ethers.ZeroAddress && (await balanceOf(a, t.token_id)) === 1n) { holder = a; break; }
    if (!holder) { out.push({token_id: t.token_id, skipped: 'no holder found'}); continue; }
    const moved = await rpc('meowteor_nft_set_holder', {p_token_id: t.token_id, p_address: holder});
    out.push({token_id: t.token_id, holder, moved});
  }
  return out;
}
export async function handle(req) {
  const tok = await rpc('meowteor_nft_secret', {p_name: 'meowteor_sync_token'});
  if (!tok || req.headers.get('x-sync-token') !== tok) return new Response('forbidden', {status: 403});
  const r = await fetch(`${SB_URL}/rest/v1/meowteor_nft_tokens?status=eq.minted&select=token_id,tx_hash,holder_address,minted_to`, {headers: {apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY}});
  const res = await syncOnce(await r.json());
  return new Response(JSON.stringify({ok: true, res}), {headers: {'Content-Type': 'application/json'}});
}
if (typeof Deno !== 'undefined' && Deno.serve && !Deno.env.get('NO_SERVE')) Deno.serve(handle);
