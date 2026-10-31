/* Lost Aura Games - Immutable zkEVM helpers (mainnet). MetaMask chain switch, wallet link (signed nonce),
   Passport login stub, and the MeowTeor NFT claim call. No secrets here: only public config. */
(function(){'use strict';
var CFG = window.LAG_IMX_CONFIG || {
  env: 'mainnet',                                  // Immutable zkEVM mainnet (chain 13371)
  passportClientId: 'aMHK4OCXyqUgcZAL5ttvahYq6so0J8zL',       // Hub > Passport > client (Web)
  publishableKey: 'pk_imapik-57X0t2rOrQ3BCTY-dbV$',        // Hub > API keys (pk_imapik-...)
  contract: '0x7dde94d0299189ff7b6b092e788d382edb54b94c',
  redirectUri: 'https://lostauragames.com/passport/callback.html',
  logoutRedirectUri: 'https://lostauragames.com/passport/logout.html'
};
var CHAINS = {
  mainnet: {chainId: '0x343b', chainName: 'Immutable zkEVM', rpcUrls: ['https://rpc.immutable.com'], nativeCurrency: {name: 'IMX', symbol: 'IMX', decimals: 18}, blockExplorerUrls: ['https://explorer.immutable.com']},
  testnet: {chainId: '0x34a1', chainName: 'Immutable zkEVM Testnet', rpcUrls: ['https://rpc.testnet.immutable.com'], nativeCurrency: {name: 'tIMX', symbol: 'tIMX', decimals: 18}, blockExplorerUrls: ['https://explorer.testnet.immutable.com']}
};
var SB_URL = 'https://fugfgorircipfntzopon.supabase.co';
var SB_KEY = 'sb_publishable_9yZM4c8UaklP2z4Vj8NrpQ_4lRRKC0O';   // public (publishable) key
function chain(){ return CHAINS[CFG.env] || CHAINS.testnet; }
function configured(){ return !/__/.test(CFG.contract + CFG.publishableKey); }
async function switchChain(){
  var eth = window.ethereum; if(!eth) throw new Error('MetaMask not found');
  var c = chain();
  try { await eth.request({method: 'wallet_switchEthereumChain', params: [{chainId: c.chainId}]}); }
  catch(e){ if(e && (e.code === 4902 || /Unrecognized chain/i.test(e.message||''))) await eth.request({method: 'wallet_addEthereumChain', params: [c]}); else throw e; }
  return c.chainId;
}
async function fn(body){
  var r = await fetch(SB_URL + '/functions/v1/meowteor-nft-claim', {method: 'POST', headers: {apikey: SB_KEY, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  var v = null; try { v = await r.json(); } catch(e){}
  if(!r.ok) throw new Error((v && v.message) || ('HTTP ' + r.status)); return v;
}
function playerId(){ try { return localStorage.getItem('meowteor.playerId') || ''; } catch(e){ return ''; } }
async function linkMetaMask(pid){
  var eth = window.ethereum; if(!eth) throw new Error('MetaMask not found');
  var accs = await eth.request({method: 'eth_requestAccounts'}); var addr = accs && accs[0]; if(!addr) throw new Error('no account');
  await switchChain();
  var n = await fn({action: 'nonce', p_player_id: pid});
  var sig = await eth.request({method: 'personal_sign', params: [n.message, addr]});
  return fn({action: 'link', p_player_id: pid, address: addr, signature: sig, nonce: n.nonce});
}
// Passport: loads the Immutable SDK only when a real client id is configured.
async function linkPassport(pid){
  if(/__/.test(CFG.passportClientId)) throw new Error('Passport is not configured yet');
  var sdk = await import('https://cdn.jsdelivr.net/npm/@imtbl/sdk/+esm');
  var passport = new sdk.passport.Passport({baseConfig: {environment: CFG.env === 'mainnet' ? sdk.config.Environment.PRODUCTION : sdk.config.Environment.SANDBOX, publishableKey: CFG.publishableKey},
    clientId: CFG.passportClientId, redirectUri: CFG.redirectUri, logoutRedirectUri: CFG.logoutRedirectUri, audience: 'platform_api', scope: 'openid offline_access email transact'});
  var provider = await passport.connectEvm(); var accs = await provider.request({method: 'eth_requestAccounts'});
  var idToken = await passport.getIdToken();
  return fn({action: 'link', p_player_id: pid, id_token: idToken, address: accs[0]});
}
async function status(pid){
  var r = await fetch(SB_URL + '/rest/v1/rpc/get_my_nft_status', {method: 'POST', headers: {apikey: SB_KEY, 'Content-Type': 'application/json'}, body: JSON.stringify({p_player_id: pid})});
  if(!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}
window.LAGImx = {config: CFG, chain: chain, configured: configured, switchChain: switchChain, linkMetaMask: linkMetaMask, linkPassport: linkPassport,
  claim: function(pid, tokenId){ return fn({action: 'claim', p_player_id: pid, token_id: tokenId}); },
  poll: function(pid, tokenId){ return fn({action: 'status', p_player_id: pid, token_id: tokenId}); },
  status: status, playerId: playerId, _fn: fn};
})();
