// Mocked end-to-end test (no real keys, no real chain). Run: NO_SERVE=1 deno run -A test_mock.ts
// Fake Supabase REST (fetch stub) + a local fake zkEVM JSON-RPC server that decodes and "executes" safeMint.
import { ethers } from 'npm:ethers@6';
import { privateKeyToAccount, generatePrivateKey } from 'npm:viem@2/accounts';
const MINTER = ethers.Wallet.createRandom();
const C = '0x1111111111111111111111111111111111111111';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) Deno.exitCode = 1; };
const iface = new ethers.Interface(['function safeMint(address,uint256,uint256,bytes)', 'function totalSupply(uint256) view returns (uint256)', 'function balanceOf(address,uint256) view returns (uint256)',
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)']);
const CH = {bal: {}, supply: {}, txs: {}, logs: [], sent: [], block: 100};
const srv = Deno.serve({port: 18545, onListen() {}}, async (req) => {
  const q = await req.json(); const one = async (m) => {
    const p = m.params || []; let r = null;
    switch (m.method) {
      case 'eth_chainId': r = '0x343b'; break;
      case 'eth_blockNumber': r = '0x' + CH.block.toString(16); break;
      case 'eth_getBlockByNumber': r = {number: '0x' + CH.block.toString(16), hash: '0x' + '0'.repeat(64), baseFeePerGas: '0x9502f900', timestamp: '0x1', parentHash: '0x' + '0'.repeat(64), gasLimit: '0x1c9c380', gasUsed: '0x0', miner: ethers.ZeroAddress, extraData: '0x', difficulty: '0x0', nonce: '0x0000000000000000', transactions: []}; break;
      case 'eth_maxPriorityFeePerGas': r = '0x3b9aca00'; break;   // 1 gwei -> function must bump to 10
      case 'eth_gasPrice': r = '0x3b9aca00'; break;
      case 'eth_getTransactionCount': r = '0x' + CH.sent.length.toString(16); break;
      case 'eth_estimateGas': r = '0x15f90'; break;
      case 'eth_call': { const d = iface.parseTransaction({data: p[0].data}); const id = String(d.args[d.name === 'balanceOf' ? 1 : 0]);
        r = ethers.toBeHex(d.name === 'totalSupply' ? (CH.supply[id] || 0n) : (CH.bal[d.args[0].toLowerCase() + ':' + id] || 0n), 32); break; }
      case 'eth_sendRawTransaction': { const tx = ethers.Transaction.from(p[0]); CH.sent.push(tx); const d = iface.parseTransaction({data: tx.data});
        const to = d.args[0].toLowerCase(), id = String(d.args[1]); CH.block++;
        CH.bal[to + ':' + id] = (CH.bal[to + ':' + id] || 0n) + 1n; CH.supply[id] = (CH.supply[id] || 0n) + 1n;
        const lg = iface.encodeEventLog('TransferSingle', [tx.from, ethers.ZeroAddress, to, BigInt(id), 1n]);
        CH.logs.push({address: C, topics: lg.topics, data: lg.data, blockNumber: '0x' + CH.block.toString(16), transactionHash: tx.hash, logIndex: '0x0', transactionIndex: '0x0', blockHash: '0x' + '1'.repeat(64), removed: false});
        CH.txs[tx.hash] = {tx, block: CH.block}; r = tx.hash; break; }
      case 'eth_getTransactionByHash': { const t = CH.txs[p[0]]; r = t ? {hash: p[0], from: t.tx.from, to: t.tx.to, nonce: '0x' + t.tx.nonce.toString(16), input: t.tx.data, value: '0x0', gas: '0x15f90', type: '0x2', maxFeePerGas: '0x1', maxPriorityFeePerGas: '0x1', chainId: '0x343b', blockNumber: '0x' + t.block.toString(16), blockHash: '0x' + '1'.repeat(64), transactionIndex: '0x0', v: '0x0', r: '0x1', s: '0x1'} : null; break; }
      case 'eth_getTransactionReceipt': { const t = CH.txs[p[0]]; r = t ? {transactionHash: p[0], blockNumber: '0x' + t.block.toString(16), blockHash: '0x' + '1'.repeat(64), status: '0x1', logs: [], gasUsed: '0x1d4c0', cumulativeGasUsed: '0x1d4c0', effectiveGasPrice: '0x28fa6ae00', from: t.tx.from, to: t.tx.to, contractAddress: null, transactionIndex: '0x0', logsBloom: '0x' + '0'.repeat(512), type: '0x2'} : null; break; }
      case 'eth_getLogs': r = CH.logs.filter(l => parseInt(l.blockNumber) >= parseInt(p[0].fromBlock || '0x0')); break;
      default: return {jsonrpc: '2.0', id: m.id, error: {code: -32601, message: m.method}};
    }
    return {jsonrpc: '2.0', id: m.id, result: r}; };
  return Response.json(Array.isArray(q) ? await Promise.all(q.map(one)) : await one(q));
});
Deno.env.set('SUPABASE_URL','https://sb.mock'); Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','svc-mock');
Deno.env.set('NFT_CONTRACT', C); Deno.env.set('IMX_CHAIN', 'mainnet'); Deno.env.set('IMX_RPC', 'http://127.0.0.1:18545');
const PID = '00000000-0000-4000-8000-00000000aaaa'; const acct = privateKeyToAccount(generatePrivateKey());
const DB = {nonce: null, link: null, enabled: false, lock: 0, tok: {token_id: 1, status: 'unminted', tx_hash: null, minted_to: null, holder_address: null, minted_at: null}, log: []};
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, init = {}) => { u = String(u); const b = init.body ? JSON.parse(init.body) : {}; const R = (s, o) => new Response(JSON.stringify(o), {status: s});
  if (u.startsWith('https://sb.mock/rest/v1/meowteor_nft_tokens')) return R(200, [DB.tok]);
  if (u.startsWith('https://sb.mock/rest/v1/rpc/')) { const fn = u.split('/').pop(); DB.log.push(fn);
    if (fn === 'meowteor_nft_secret') return R(200, b.p_name === 'meowteor_minter_key' ? MINTER.privateKey : 'synctok');
    if (fn === 'meowteor_wallet_nonce') { DB.nonce = 'abc123'; return R(200, 'abc123'); }
    if (fn === 'meowteor_wallet_link') { if (b.p_method === 'metamask' && b.p_nonce !== DB.nonce) return R(400, {message: 'bad link: nonce expired'}); DB.link = b.p_address.toLowerCase(); return R(200, true); }
    if (fn === 'meowteor_nft_claim_begin') { if (b.p_player_id !== PID) return R(400, {message: 'bad claim: not the winner'}); if (!DB.link) return R(400, {message: 'bad claim: link a wallet first'});
      if (DB.tok.status === 'minted') return R(400, {message: 'bad claim: already minted'}); if (!DB.enabled) return R(400, {message: 'bad claim: claiming opens soon'});
      if (DB.lock > Date.now()) return R(400, {message: 'bad claim: mint in progress'});
      DB.lock = Date.now() + 180000; DB.tok.status = 'pending'; DB.tok.minted_to ??= DB.link; return R(200, [{token_id: 1, item_id: 'skin_champion', reference_id: 'x', owner_address: DB.tok.minted_to, status: 'pending'}]); }
    if (fn === 'meowteor_nft_claim_finish') { DB.tok.status = b.p_status; if (b.p_tx) DB.tok.tx_hash = b.p_tx; if (b.p_status !== 'pending') DB.lock = 0;
      if (b.p_status === 'minted') { DB.tok.minted_at ??= Date.now(); DB.tok.holder_address ??= DB.tok.minted_to; } return R(200, null); }
    if (fn === 'meowteor_nft_set_holder') { const moved = DB.tok.holder_address !== b.p_address; DB.tok.holder_address = b.p_address; return R(200, moved); }
    return R(404, {message: 'no ' + fn}); }
  return realFetch(u, init); };
const {handle} = await import('./meowteor-nft-claim.ts'); const S = await import('./meowteor-nft-holder-sync.ts');
const call = async (o) => { const r = await handle(new Request('https://x', {method: 'POST', body: JSON.stringify({p_player_id: PID, ...o})})); return [r.status, await r.json()]; };
let [s, v] = await call({action: 'minter'}); ok(v.address === MINTER.address, 'minter action returns public address only');
[s, v] = await call({action: 'claim', token_id: 1}); ok(s === 400 && /link a wallet/.test(v.message), 'claim before wallet link is refused');
[s, v] = await call({action: 'nonce'}); const msg = v.message;
const bad = await acct.signMessage({message: msg.replace('abc123', 'zzz')}); [s, v] = await call({action: 'link', address: acct.address, signature: bad, nonce: 'abc123'}); ok(s === 400, 'wrong signature refused');
const sig = await acct.signMessage({message: msg}); [s, v] = await call({action: 'link', address: acct.address, signature: sig, nonce: 'abc123'}); ok(s === 200 && v.address === acct.address.toLowerCase(), 'MetaMask signature link accepted');
[s, v] = await call({action: 'claim', token_id: 1}); ok(s === 400 && /opens soon/.test(v.message) && CH.sent.length === 0, 'claim refused while disabled (no tx sent)');
[s, v] = await call({action: 'claim', token_id: 1, p_player_id: '00000000-0000-4000-8000-00000000bbbb'}); ok(s === 400 && /not the winner/.test(v.message), 'non-winner refused');
DB.enabled = true;
[s, v] = await call({action: 'claim', token_id: 1}); ok(s === 200 && v.status === 'minted' && CH.sent.length === 1, 'claim sends exactly one safeMint and settles to minted');
const tx = CH.sent[0]; const d = iface.parseTransaction({data: tx.data});
ok(d.name === 'safeMint' && d.args[0].toLowerCase() === acct.address.toLowerCase() && d.args[1] === 1n && d.args[2] === 1n && d.args[3] === '0x', 'safeMint(winner, 1, 1, 0x)');
ok(tx.from === MINTER.address && tx.chainId === 13371n && tx.to.toLowerCase() === C, 'signed by minter, chain 13371, to contract');
ok(tx.maxPriorityFeePerGas >= 10_000_000_000n, 'priority fee >= 10 gwei (' + tx.maxPriorityFeePerGas + ')');
ok(DB.tok.minted_at && DB.tok.tx_hash === tx.hash, 'mint date + tx hash recorded');
[s, v] = await call({action: 'claim', token_id: 1}); ok(s === 400 && /already minted/.test(v.message) && CH.sent.length === 1, 'second claim refused, no second tx');
// lost-response case: DB says pending w/o tx but chain already has supply -> no new mint
DB.tok.status = 'unminted'; DB.tok.tx_hash = null; DB.lock = 0;
[s, v] = await call({action: 'claim', token_id: 1}); ok(v.status === 'minted' && CH.sent.length === 1, 'chain totalSupply>0 blocks a re-mint even if DB lost state');
// transfer on chain -> holder sync
const NEW = '0x2222222222222222222222222222222222222222', from = acct.address.toLowerCase();
CH.bal[from + ':1'] = 0n; CH.bal[NEW + ':1'] = 1n; CH.block++;
const lg = iface.encodeEventLog('TransferSingle', [from, from, NEW, 1n, 1n]);
CH.logs.push({address: C, topics: lg.topics, data: lg.data, blockNumber: '0x' + CH.block.toString(16), transactionHash: '0x' + 'ab'.repeat(32), logIndex: '0x0', transactionIndex: '0x0', blockHash: '0x' + '1'.repeat(64), removed: false});
const res = await S.syncOnce([{token_id: 1, tx_hash: tx.hash, holder_address: DB.tok.holder_address, minted_to: DB.tok.minted_to}]);
ok(res[0].moved === true && DB.tok.holder_address === NEW, 'holder sync follows on-chain transfer (logs + balanceOf)');
const r403 = await S.handle(new Request('https://x', {method: 'POST', headers: {'x-sync-token': 'nope'}})); ok(r403.status === 403, 'holder sync refuses bad token');
await srv.shutdown();
