// @ts-nocheck
// Supabase Edge Function: meowteor-nft-claim (verify_jwt false; does its own checks).
// Actions (POST JSON {action, p_player_id, ...}):
//   nonce  -> message to sign with MetaMask (personal_sign)
//   link   -> {address, signature} (MetaMask) or {id_token} (Passport); stores a verified wallet link
//   claim  -> {token_id}: winner + enabled + wallet + lease (SQL), chain totalSupply check, safeMint, wait for receipt
//   status -> {token_id}: settles a pending mint tx
//   minter -> public minter wallet address
// Mints directly on Immutable zkEVM with ImmutableERC1155.safeMint(to, id, 1, 0x) from a server minter wallet (needs MINTER_ROLE).
// Secrets: MINTER_PRIVATE_KEY (optional; otherwise Vault secret meowteor_minter_key via service-role RPC), NFT_CONTRACT, IMX_CHAIN.
import { ethers } from 'npm:ethers@6';
import { verifyMessage } from 'npm:viem@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';
const SB_URL = Deno.env.get('SUPABASE_URL'), SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const IMX_CHAIN = Deno.env.get('IMX_CHAIN') || 'mainnet';
const RPC_URL = Deno.env.get('IMX_RPC') || (IMX_CHAIN === 'mainnet' ? 'https://rpc.immutable.com' : 'https://rpc.testnet.immutable.com');
const CHAIN_ID = IMX_CHAIN === 'mainnet' ? 13371 : 13473;
const CONTRACT = (Deno.env.get('NFT_CONTRACT') || '0x7dde94d0299189ff7b6b092e788d382edb54b94c').toLowerCase();
const LEGACY_PID = (Deno.env.get('ALLOW_LEGACY_PID') ?? '1') !== '0';         // turn off at go-live (go_live.sql + env)
const MIN_PRIO = 10_000_000_000n;                                   // zkEVM minimum priority fee: 10 gwei
const ABI = ['function safeMint(address to, uint256 id, uint256 value, bytes data)', 'function totalSupply(uint256 id) view returns (uint256)',
  'function balanceOf(address, uint256) view returns (uint256)', 'function hasRole(bytes32, address) view returns (bool)'];
export let provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, {staticNetwork: true});
export function _setProvider(p) { provider = p; }
let signer = null;
async function getSigner() {
  if (signer) return signer;
  const k = Deno.env.get('MINTER_PRIVATE_KEY') || await rpc('meowteor_nft_secret', {p_name: 'meowteor_minter_key'});
  if (!k) throw new Error('minting not configured');
  signer = new ethers.Wallet(k, provider); return signer; }
function contract(write) { if (write && !signer) throw new Error('signer not loaded'); return new ethers.Contract(CONTRACT, ABI, write ? signer : provider); }
async function tokenRow(id) { const r = await fetch(`${SB_URL}/rest/v1/meowteor_nft_tokens?token_id=eq.${id | 0}&select=token_id,status,tx_hash,minted_to`, {headers: {apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY}});
  const j = await r.json(); return Array.isArray(j) ? j[0] : null; }
// returns minted | pending | failed | none, and writes the final state
async function settle(t, waitMs = 0) {
  if (t.status === 'minted') return 'minted';
  if (!t.tx_hash) return 'none';
  let rc = await provider.getTransactionReceipt(t.tx_hash);
  if (!rc && waitMs) rc = await provider.waitForTransaction(t.tx_hash, 1, waitMs).catch(() => null);
  if (!rc) return (await provider.getTransaction(t.tx_hash)) ? 'pending' : 'failed';
  const st = rc.status === 1 ? 'minted' : 'failed';
  await rpc('meowteor_nft_claim_finish', {p_token_id: t.token_id, p_status: st, p_tx: t.tx_hash, p_error: st === 'failed' ? 'tx reverted' : null});
  return st; }
const PASSPORT_CLIENT_ID = Deno.env.get('IMX_PASSPORT_CLIENT_ID') || 'aMHK4OCXyqUgcZAL5ttvahYq6so0J8zL';
const PASSPORT_JWKS = createRemoteJWKSet(new URL('https://auth.immutable.com/.well-known/jwks.json'));
const CORS = {'Access-Control-Allow-Origin':'https://lostauragames.com','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info'};
const J = (s, o) => new Response(JSON.stringify(o), {status: s, headers: {...CORS, 'Content-Type': 'application/json'}});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, ADDR = /^0x[0-9a-fA-F]{40}$/;
async function rpc(fn, body) { const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {method:'POST', headers:{apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Content-Type':'application/json'}, body: JSON.stringify(body)});
  const t = await r.text(); let v = null; try { v = t ? JSON.parse(t) : null; } catch (e) {} if (!r.ok) throw new Error((v && v.message) || ('rpc ' + fn + ' ' + r.status)); return v; }
const linkMessage = (pid, nonce) => `Link this wallet to MeowTeor (Lost Aura Games).\nPlayer: ${pid}\nNonce: ${nonce}\nThis does not cost anything or allow any transaction.`;
export async function handle(req) {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS});
  if (req.method !== 'POST') return J(405, {message: 'POST only'});
  let b; try { b = JSON.parse(await req.text()); } catch (e) { return J(400, {message: 'bad json'}); }
  // identity: the server-issued key -> player id. Legacy (raw player id) only while LEGACY_PID is on AND that id has no key yet.
  let pid = '';
  try {
    if (b.p_key) pid = await rpc('meowteor_me', {p_key: String(b.p_key)});
    else if (LEGACY_PID && UUID.test(String(b.p_player_id || '')) && !(await rpc('meowteor_has_key', {p_player_id: String(b.p_player_id)}))) pid = String(b.p_player_id);
  } catch (e) { return J(401, {message: 'auth: ' + String(e && e.message || e).replace(/^auth: /, '')}); }
  if (!UUID.test(pid)) return J(401, {message: 'auth: key required'});
  try {
    if (b.action === 'nonce') { const n = await rpc('meowteor_wallet_nonce', {p_player_id: pid}); return J(200, {message: linkMessage(pid, n), nonce: n}); }
    if (b.action === 'link') {
      if (b.id_token) {                                              // Passport
        const {payload} = await jwtVerify(String(b.id_token), PASSPORT_JWKS, {audience: PASSPORT_CLIENT_ID, issuer: 'https://auth.immutable.com/'});
        const addr = String((payload.passport && payload.passport.zkevm_eth_address) || b.address || '');
        if (!ADDR.test(addr)) return J(400, {message: 'bad link: no Passport wallet'});
        await rpc('meowteor_wallet_link', {p_player_id: pid, p_address: addr, p_method: 'passport', p_nonce: null}); return J(200, {ok: true, address: addr.toLowerCase()});
      }
      const addr = String(b.address || ''), sig = String(b.signature || ''), nonce = String(b.nonce || '');
      if (!ADDR.test(addr) || !/^0x[0-9a-f]+$/i.test(sig)) return J(400, {message: 'bad link'});
      const ok = await verifyMessage({address: addr, message: linkMessage(pid, nonce), signature: sig});
      if (!ok) return J(400, {message: 'bad link: signature does not match'});
      await rpc('meowteor_wallet_link', {p_player_id: pid, p_address: addr, p_method: 'metamask', p_nonce: nonce}); return J(200, {ok: true, address: addr.toLowerCase()});
    }
    if (b.action === 'minter') { await getSigner(); return J(200, {address: signer.address}); }
    if (b.action === 'claim_edition') {                              // open edition (Halloween token 12): one per earner, one per wallet
      const tokenId = b.token_id | 0;
      const row = await rpc('meowteor_nft_edition_begin', {p_player_id: pid, p_token_id: tokenId});
      const fin = (st, tx, err) => rpc('meowteor_nft_edition_finish', {p_token_id: tokenId, p_player_id: pid, p_status: st, p_tx: tx, p_error: err});
      await getSigner();
      if (row.tx_hash) {                                             // earlier attempt: settle it before anything else
        let rc = await provider.getTransactionReceipt(row.tx_hash);
        if (!rc && await provider.getTransaction(row.tx_hash)) rc = await provider.waitForTransaction(row.tx_hash, 1, 20000).catch(() => null);
        if (rc && rc.status === 1) { const f = await fin('minted', row.tx_hash, null); return J(200, {ok: true, token_id: tokenId, status: 'minted', edition_no: f.edition_no, tx: row.tx_hash}); }
        if (!rc && await provider.getTransaction(row.tx_hash)) return J(200, {ok: true, token_id: tokenId, status: 'pending', tx: row.tx_hash});
      }
      const c = contract(true);
      if ((await c.balanceOf(row.owner_address, tokenId)) > 0n) {      // never a second one into the same wallet
        await fin('failed', null, 'wallet already holds this token');
        return J(400, {message: 'bad claim: this wallet already holds one'});
      }
      let tx;
      try {
        const fd = await provider.getFeeData();
        const prio = (fd.maxPriorityFeePerGas && fd.maxPriorityFeePerGas > MIN_PRIO) ? fd.maxPriorityFeePerGas : MIN_PRIO;
        const base = (await provider.getBlock('latest'))?.baseFeePerGas ?? 0n;
        tx = await c.safeMint(row.owner_address, tokenId, 1, '0x', {maxPriorityFeePerGas: prio, maxFeePerGas: base * 2n + prio});
      } catch (e) { const m = String(e && (e.shortMessage || e.message) || e).slice(0, 300); await fin('failed', null, 'send: ' + m); return J(502, {message: 'mint failed to send', detail: m}); }
      await fin('pending', tx.hash, null);
      const rc = (await provider.getTransactionReceipt(tx.hash).catch(() => null)) || await provider.waitForTransaction(tx.hash, 1, 20000).catch(() => null);
      if (rc) { const st = rc.status === 1 ? 'minted' : 'failed'; const f = await fin(st, tx.hash, st === 'failed' ? 'tx reverted' : null); return J(200, {ok: st === 'minted', token_id: tokenId, status: st, edition_no: f.edition_no, tx: tx.hash}); }
      return J(200, {ok: true, token_id: tokenId, status: 'pending', tx: tx.hash});
    }
    if (b.action === 'claim' || b.action === 'status') {
      const tokenId = b.token_id | 0;
      if (b.action === 'status') {                                   // read-only: settle a pending tx if it landed
        const t = await tokenRow(tokenId); if (!t) return J(400, {message: 'bad claim: unknown token'});
        return J(200, {ok: true, token_id: tokenId, status: await settle(t), tx: t.tx_hash});
      }
      const row = (await rpc('meowteor_nft_claim_begin', {p_player_id: pid, p_token_id: tokenId}))?.[0];   // winner + enabled + wallet + lease
      if (!row) return J(400, {message: 'bad claim'});
      const t = await tokenRow(tokenId); await getSigner();
      if (t.tx_hash) { const st = await settle(t); if (st !== 'failed' && st !== 'none') return J(200, {ok: true, token_id: tokenId, status: st, tx: t.tx_hash, owner: row.owner_address}); }
      const c = contract(true);
      if ((await c.totalSupply(tokenId)) > 0n) {                     // already on chain (e.g. lost response): never mint twice
        await rpc('meowteor_nft_claim_finish', {p_token_id: tokenId, p_status: 'minted', p_tx: null, p_error: null});
        return J(200, {ok: true, token_id: tokenId, status: 'minted', owner: row.owner_address});
      }
      let tx;
      try {
        const fd = await provider.getFeeData();
        const prio = (fd.maxPriorityFeePerGas && fd.maxPriorityFeePerGas > MIN_PRIO) ? fd.maxPriorityFeePerGas : MIN_PRIO;
        const base = (await provider.getBlock('latest'))?.baseFeePerGas ?? 0n;
        tx = await c.safeMint(row.owner_address, tokenId, 1, '0x', {maxPriorityFeePerGas: prio, maxFeePerGas: base * 2n + prio});
      } catch (e) {
        const m = String(e && (e.shortMessage || e.message) || e).slice(0, 300);
        await rpc('meowteor_nft_claim_finish', {p_token_id: tokenId, p_status: 'failed', p_tx: null, p_error: 'send: ' + m});
        return J(502, {message: 'mint failed to send', detail: m});
      }
      await rpc('meowteor_nft_claim_finish', {p_token_id: tokenId, p_status: 'pending', p_tx: tx.hash, p_error: null});
      const st = await settle({token_id: tokenId, tx_hash: tx.hash}, 20000);
      return J(200, {ok: true, token_id: tokenId, status: st, tx: tx.hash, owner: row.owner_address});
    }
    return J(400, {message: 'unknown action'});
  } catch (e) { const m = String(e && e.message || e); return J(/bad claim|bad link|banned/.test(m) ? 400 : 502, {message: m}); }
}
if (typeof Deno !== 'undefined' && Deno.serve && !Deno.env.get('NO_SERVE')) Deno.serve(handle);
