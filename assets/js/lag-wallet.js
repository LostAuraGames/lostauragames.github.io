/* Lost Aura Games - MetaMask wallet connect (optional, non-destructive).
   Connects MetaMask, treats the address as an identity, and can associate
   existing local progress (e.g. meowteor.save.v1) without deleting it.
   Stored locally under lag.wallet.v1. Works even when COMMERCE_ENABLED is false. */
(function(){
'use strict';
var KEY = 'lag.wallet.v1';

function load(){
  try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){ return null; }
}
function save(w){
  try{ if(w) localStorage.setItem(KEY, JSON.stringify(w)); else localStorage.removeItem(KEY); }catch(e){}
  emit();
}
function emit(){
  var w = current();
  (window.LAGWallet && window.LAGWallet._listeners || []).slice().forEach(function(f){
    try{ f(w); }catch(e){ console.error(e); }
  });
  render();
}

function isMetaMask(){
  return !!(window.ethereum && window.ethereum.isMetaMask);
}
function short(addr){
  if(!addr) return '';
  return addr.slice(0,6) + '…' + addr.slice(-4);
}
function current(){ return load(); }

async function connect(){
  if(!isMetaMask()){
    alert('MetaMask is not installed. Please install the MetaMask extension and try again.');
    return null;
  }
  try{
    var accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if(!accounts || !accounts.length) return null;
    var address = accounts[0];
    var msg = 'Lost Aura Games wallet link\nAddress: ' + address + '\nTime: ' + Date.now();
    var sig = await window.ethereum.request({
      method: 'personal_sign',
      params: [msg, address]
    });
    var w = { address: address, sig: sig, linkedAt: Date.now() };
    try{
      var localSave = localStorage.getItem('meowteor.save.v1');
      if(localSave) w.localSnapshot = localSave;
    }catch(e){}
    save(w);
    return w;
  }catch(e){
    console.warn('Wallet connect failed', e);
    if(e && e.code === 4001) return null;
    alert('Could not connect MetaMask. Please try again.');
    return null;
  }
}

function disconnect(){
  save(null);
}

function onChange(fn){
  if(!window.LAGWallet) window.LAGWallet = {};
  window.LAGWallet._listeners = window.LAGWallet._listeners || [];
  window.LAGWallet._listeners.push(fn);
  return function(){
    window.LAGWallet._listeners = window.LAGWallet._listeners.filter(function(x){ return x !== fn; });
  };
}

function render(){
  var btn = document.getElementById('lag-wallet-btn');
  if(!btn) return;
  var w = current();
  if(w && w.address){
    btn.textContent = short(w.address);
    btn.title = 'Connected: ' + w.address + '\nClick to disconnect';
    btn.onclick = function(){ if(confirm('Disconnect wallet?')) disconnect(); };
  }else{
    btn.textContent = 'Connect MetaMask';
    btn.title = 'Connect your MetaMask wallet (optional)';
    btn.onclick = function(){ connect(); };
  }
}

function mount(){
  var nav = document.querySelector('.site-header .nav') || document.querySelector('header nav');
  if(nav && !document.getElementById('lag-wallet-btn')){
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.id = 'lag-wallet-btn';
    b.className = 'btn';
    b.style.fontSize = '12px';
    b.style.padding = '6px 10px';
    b.style.margin = '0 0 0 8px';
    li.appendChild(b);
    nav.appendChild(li);
  }
  render();
  if(window.ethereum && window.ethereum.on){
    window.ethereum.on('accountsChanged', function(accs){
      var w = current();
      if(w && accs && accs[0] && accs[0].toLowerCase() !== w.address.toLowerCase()){
        disconnect();
      }
    });
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', mount);
}else{
  mount();
}

window.LAGWallet = {
  connect: connect,
  disconnect: disconnect,
  current: current,
  onChange: onChange,
  short: short,
  isMetaMask: isMetaMask,
  _listeners: []
};
})();
