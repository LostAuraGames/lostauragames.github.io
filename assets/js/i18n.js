/* Lost Aura Games - site translations (EN / ES / FR / DE / PT / IT).
   The chosen language is saved in localStorage "lag.lang" and is shared with the games on this site
   (they read the same key and listen for changes), so picking a language here also switches the games.
   First visit: the browser language if supported, otherwise English.
   Strings live in assets/js/i18n-dict.js (one row per English string). Static page text is translated
   per text block (an element's inner HTML, inline tags kept); scripts use LAGI18N.t('English text', {vars}). */
(function(){
'use strict';
var LANGS=[['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['pt','Português'],['it','Italiano']];
var KEY='lag.lang',CODES=LANGS.map(function(l){return l[0];});
var D={};(window.LAG_I18N_ROWS||[]).forEach(function(r){for(var i=1;i<r.length;i++){var c=CODES[i];(D[c]=D[c]||{})[r[0]]=r[i];}});
function detect(){var s=null;try{s=localStorage.getItem(KEY);}catch(e){}if(s&&CODES.indexOf(s)>=0)return s;
  var nl=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en']);
  for(var i=0;i<nl.length;i++){var p=String(nl[i]||'').toLowerCase().split('-')[0];if(CODES.indexOf(p)>=0)return p;}return 'en';}
var LANG=detect();var MISS=window.LAG_I18N_MISS=[];
function miss(k){if(LANG!=='en'&&MISS.indexOf(LANG+'|'+k)<0){MISS.push(LANG+'|'+k);if(window.console)console.info('[i18n] missing '+LANG+': '+k);}}
function sub(s,v){return v?s.replace(/\{(\w+)\}/g,function(m,k){return v[k]!=null?v[k]:m;}):s;}
function t(k,v){if(LANG==='en')return sub(k,v);var d=D[LANG]||{};if(Object.prototype.hasOwnProperty.call(d,k))return sub(d[k],v);miss(k);return sub(k,v);}
var norm=function(s){return String(s).replace(/\s+/g,' ').trim();};
// ---- DOM translation (static page text) ----
var ORIG=new WeakMap(),SIMPLE=/^(B|I|EM|STRONG|KBD|SPAN|A|BR|CODE|SMALL|SUP|SUB|ABBR|MARK|Q|S|U|TIME)$/,ATTRS=['aria-label','alt','title','placeholder'];
function skip(el){return el.closest('script,style,noscript,template,[data-i18n-skip],.lang-picker');}
function hasText(el){for(var n=el.firstChild;n;n=n.nextSibling)if(n.nodeType===3&&/[A-Za-z\u00c0-\u024f]/.test(n.nodeValue))return true;return false;}
function simple(el){var all=el.getElementsByTagName('*');for(var i=0;i<all.length;i++){var c=all[i];if(!SIMPLE.test(c.tagName)||c.id)return false;}return true;}
function trText(el){for(var n=el.firstChild;n;n=n.nextSibling){if(n.nodeType===3){var o=ORIG.get(n);if(o==null){if(!/[A-Za-z]/.test(n.nodeValue))continue;o=n.nodeValue;ORIG.set(n,o);}
   var k=norm(o);if(!k)continue;var lead=o.match(/^\s*/)[0],trail=o.match(/\s*$/)[0];n.nodeValue=LANG==='en'?o:lead+t(k)+trail;}
  else if(n.nodeType===1&&!skip(n))walk(n);}}
function walk(root){if(root.nodeType!==1||skip(root))return;
  if(hasText(root)){if(simple(root)){var o=ORIG.get(root);if(o==null){o=root.innerHTML;ORIG.set(root,o);}var k=norm(o);
      if(LANG==='en'){if(root.innerHTML!==o)root.innerHTML=o;}else{var tr=t(k);if(root.innerHTML!==tr)root.innerHTML=tr;}}
    else trText(root);}
  else for(var c=root.firstElementChild;c;c=c.nextElementSibling)walk(c);}
function attrs(root){var els=root.querySelectorAll('['+ATTRS.join('],[')+']');for(var i=0;i<els.length;i++){var e=els[i];if(e.closest('[data-i18n-skip],.lang-picker'))continue;
  var o=ORIG.get(e);if(!o){o={};ATTRS.forEach(function(a){if(e.hasAttribute(a)&&/[A-Za-z]/.test(e.getAttribute(a)))o[a]=e.getAttribute(a);});ORIG.set(e,o);}
  for(var a in o)e.setAttribute(a,LANG==='en'?o[a]:t(norm(o[a])));}}
var META='meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[property="og:image:alt"],meta[name="twitter:title"],meta[name="twitter:description"]';
var TITLE=null;
function head(){if(TITLE==null)TITLE=document.title;document.title=LANG==='en'?TITLE:t(norm(TITLE));
  [].forEach.call(document.querySelectorAll(META),function(m){if(m._en==null)m._en=m.getAttribute('content');m.setAttribute('content',LANG==='en'?m._en:t(norm(m._en)));});
  document.documentElement.lang=LANG;var og=document.querySelector('meta[property="og:locale"]');}
function apply(){head();walk(document.body);attrs(document.body);updPicker();
  try{document.dispatchEvent(new CustomEvent('lag:lang',{detail:LANG}));}catch(e){}}
function setLang(l,save){if(CODES.indexOf(l)<0)l='en';var ch=l!==LANG;LANG=l;if(save!==false){try{localStorage.setItem(KEY,l);}catch(e){}}if(ch||save===false)apply();}
// ---- picker (pixel globe + dropdown) ----
var pk=null;
function globe(c,col){var G=['..#####..','.#..#..#.','#..#.#..#','#########','#.#...#.#','#########','#..#.#..#','.#..#..#.','..#####..'];var s=2;c.width=c.height=G.length*s;var x=c.getContext('2d');x.fillStyle=col;
  G.forEach(function(r,y){for(var i=0;i<r.length;i++)if(r[i]==='#')x.fillRect(i*s,y*s,s,s);});}
function buildPicker(){var hw=document.querySelector('.site-header .wrap');if(!hw||hw.querySelector('.lang-picker'))return;
  pk=document.createElement('div');pk.className='lang-picker';
  pk.innerHTML='<button type="button" class="lang-btn" aria-haspopup="listbox" aria-expanded="false"><canvas class="globe" aria-hidden="true"></canvas><span class="lang-cur"></span><span class="lang-caret" aria-hidden="true">&#9662;</span></button>'+
   '<ul class="lang-menu" role="listbox" hidden>'+LANGS.map(function(l){return '<li role="option" data-lang="'+l[0]+'" tabindex="-1" lang="'+l[0]+'"><span class="lang-code">'+l[0].toUpperCase()+'</span>'+l[1]+'</li>';}).join('')+'</ul>';
  hw.appendChild(pk);globe(pk.querySelector('canvas'),'#e2c2ff');
  var btn=pk.querySelector('.lang-btn'),menu=pk.querySelector('.lang-menu');
  function open(o){menu.hidden=!o;btn.setAttribute('aria-expanded',o?'true':'false');if(o){var cur=menu.querySelector('[aria-selected="true"]')||menu.firstChild;cur.focus();}}
  btn.addEventListener('click',function(e){e.stopPropagation();open(menu.hidden);});
  menu.addEventListener('click',function(e){var li=e.target.closest('li[data-lang]');if(!li)return;setLang(li.getAttribute('data-lang'));open(false);btn.focus();});
  menu.addEventListener('keydown',function(e){var items=[].slice.call(menu.children),i=items.indexOf(document.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length].focus();}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(i>=0)items[i].click();}else if(e.key==='Escape'||e.key==='Tab'){open(false);btn.focus();}});
  document.addEventListener('click',function(e){if(!pk.contains(e.target))open(false);});}
function updPicker(){if(!pk)return;var n=LANGS.filter(function(l){return l[0]===LANG;})[0];pk.querySelector('.lang-cur').textContent=LANG.toUpperCase();
  pk.querySelector('.lang-btn').setAttribute('aria-label',t('Language')+': '+n[1]);pk.querySelector('.lang-btn').title=t('Language');
  [].forEach.call(pk.querySelectorAll('li[data-lang]'),function(li){li.setAttribute('aria-selected',li.getAttribute('data-lang')===LANG?'true':'false');});}
// another tab or one of the games changed the language
window.addEventListener('storage',function(e){if(e.key===KEY&&e.newValue&&e.newValue!==LANG&&CODES.indexOf(e.newValue)>=0){LANG=e.newValue;apply();}});
window.LAGI18N={t:t,get lang(){return LANG;},set:setLang,langs:LANGS,apply:apply};
document.documentElement.lang=LANG;
function init(){buildPicker();apply();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
