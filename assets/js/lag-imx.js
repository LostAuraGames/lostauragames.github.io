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
// Server-issued player key (same one the game uses). The server derives the player id from it; the raw id is only
// used once to obtain the key for this browser.
async function playerKey(){
  var k = ''; try { k = localStorage.getItem('meowteor.key.v1') || ''; } catch(e){}
  var pid = playerId(); if(!pid) return '';
  var r = await fetch(SB_URL + '/rest/v1/rpc/meowteor_session', {method: 'POST', headers: {apikey: SB_KEY, 'Content-Type': 'application/json'}, body: JSON.stringify({p_player_id: pid, p_key: /^[0-9a-f]{64}$/.test(k) ? k : null})});
  var v = null; try { v = await r.json(); } catch(e){}
  if(!r.ok) throw new Error((v && v.message) || ('HTTP ' + r.status));
  if(v && v.key){ k = v.key; try { localStorage.setItem('meowteor.key.v1', k); } catch(e){} }
  return k;
}
async function who(){ var k = await playerKey(); if(!k) throw new Error('Play MeowTeor in this browser first'); return {p_key: k}; }
async function linkMetaMask(pid){
  var eth = window.ethereum; if(!eth) throw new Error('MetaMask not found');
  var accs = await eth.request({method: 'eth_requestAccounts'}); var addr = accs && accs[0]; if(!addr) throw new Error('no account');
  await switchChain();
  var id = await who(); var n = await fn(Object.assign({action: 'nonce'}, id));
  var sig = await eth.request({method: 'personal_sign', params: [n.message, addr]});
  return fn(Object.assign({action: 'link', address: addr, signature: sig, nonce: n.nonce}, id));
}
// Passport: loads the Immutable SDK only when a real client id is configured.
async function linkPassport(pid){
  if(/__/.test(CFG.passportClientId)) throw new Error('Passport is not configured yet');
  var sdk = await import('https://cdn.jsdelivr.net/npm/@imtbl/sdk/+esm');
  var passport = new sdk.passport.Passport({baseConfig: {environment: CFG.env === 'mainnet' ? sdk.config.Environment.PRODUCTION : sdk.config.Environment.SANDBOX, publishableKey: CFG.publishableKey},
    clientId: CFG.passportClientId, redirectUri: CFG.redirectUri, logoutRedirectUri: CFG.logoutRedirectUri, audience: 'platform_api', scope: 'openid offline_access email transact'});
  var provider = await passport.connectEvm(); var accs = await provider.request({method: 'eth_requestAccounts'});
  var idToken = await passport.getIdToken();
  return fn(Object.assign({action: 'link', id_token: idToken, address: accs[0]}, await who()));
}
// OFAC compliance: region check (server sees the IP) and sanctioned-wallet screening. IP data by DB-IP (db-ip.com).
async function geoFn(body){
  var r = await fetch(SB_URL + '/functions/v1/meowteor-geo', {method: 'POST', headers: {apikey: SB_KEY, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  var v = null; try { v = await r.json(); } catch(e){}
  if(!r.ok) throw new Error((v && v.message) || ('HTTP ' + r.status)); return v;
}
async function geoCheck(){ return geoFn({action: 'check'}); }
async function screen(address){ return geoFn({action: 'screen', address: address}); }
async function status(pid){
  var r = await fetch(SB_URL + '/rest/v1/rpc/get_my_nft_status_v2', {method: 'POST', headers: {apikey: SB_KEY, 'Content-Type': 'application/json'}, body: JSON.stringify(await who())});
  if(!r.ok) throw new Error('HTTP ' + r.status); return r.json();
}
window.LAGImx = {geoCheck: geoCheck, screen: screen, config: CFG, chain: chain, configured: configured, switchChain: switchChain, linkMetaMask: linkMetaMask, linkPassport: linkPassport,
  claim: async function(pid, tokenId){ return fn(Object.assign({action: 'claim', token_id: tokenId}, await who())); },
  claimEdition: async function(pid, tokenId){ return fn(Object.assign({action: 'claim_edition', token_id: tokenId}, await who())); },
  poll: async function(pid, tokenId){ return fn(Object.assign({action: 'status', token_id: tokenId}, await who())); },
  status: status, playerId: playerId, _fn: fn};
})();
