/* Lost Aura Games - shared page script. Renders background, logos and the game grid. */
(function(){
'use strict';
var P=window.LAGPixel;
// root path prefix (pages in subfolders set data-root="../" on <body>)
var ROOT=document.body.getAttribute('data-root')||'';
function url(u){if(!u)return '';if(/^(https?:)?\/\//.test(u)||u.charAt(0)==='/')return u;return ROOT+u;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

// background
var bg=document.getElementById('bg');if(bg&&P)P.background(bg);

// logos (canvas.pixel-logo[data-size])
var logos=[].slice.call(document.querySelectorAll('canvas.pixel-logo'));
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function sizeFor(c){var base=+c.getAttribute('data-size')||6;if(c.hasAttribute('data-fluid')){var w=c.parentNode.clientWidth||window.innerWidth;var need=P.logo(document.createElement('canvas'),base).width;while(base>2&&need>w){base--;need=P.logo(document.createElement('canvas'),base).width;}}return base;}
function drawLogos(t){logos.forEach(function(c){c._s=c._s||sizeFor(c);P.logo(c,c._s,t);});}
if(P&&logos.length){drawLogos(0);window.addEventListener('resize',function(){logos.forEach(function(c){c._s=0;});drawLogos(0);});
  if(!reduce){var last=0;(function loop(ms){requestAnimationFrame(loop);if(document.hidden||ms-last<90)return;last=ms;drawLogos(ms/1000);})(0);}}

// small emblems (canvas.pixel-emblem)
[].slice.call(document.querySelectorAll('canvas.pixel-emblem')).forEach(function(c){var s=+c.getAttribute('data-size')||2;c.width=c.height=32*s;var x=c.getContext('2d');P.emblem(x,0,0,s,1);});

// game grid + featured
var games=window.LAG_GAMES||[];
function artCanvas(g){return '<canvas class="keyart" data-art="'+esc(g.art)+'" width="320" height="180" role="img" aria-label="'+esc(g.artAlt||g.title)+'"></canvas><span class="ka-hint" aria-hidden="true">'+(window.matchMedia&&matchMedia('(hover: none)').matches?'Tap to wake':'Hover to wake')+'</span>';}
function card(g){var play=url(g.play),info=url(g.info);var main=info||play;
  var h='<article class="game-card"'+(g.art?' data-keyart-trigger':'')+'>'+
   (main?'<a class="thumb" href="'+esc(main)+'" tabindex="-1" aria-hidden="true">':'<div class="thumb">')+
   (g.art?artCanvas(g):g.image?'<img src="'+esc(url(g.image))+'" alt="" loading="lazy" width="640" height="360">':'<div class="thumb-empty">?</div>')+
   (main?'</a>':'</div>')+
   '<div class="body"><span class="badge'+(g.badge?' '+esc(g.badge):'')+'">'+esc(g.status||'')+'</span>'+
   '<h3>'+(main?'<a href="'+esc(main)+'">'+esc(g.title)+'</a>':esc(g.title))+'</h3>'+
   (g.subtitle?'<p class="sub">'+esc(g.subtitle)+'</p>':'')+
   '<p>'+esc(g.blurb||'')+'</p>'+
   (g.genre?'<p class="genre">'+esc(g.genre)+'</p>':'')+
   '<div class="actions">'+(play?'<a class="btn gold" href="'+esc(play)+'">&#9654; Play</a>':'')+(info?'<a class="btn" href="'+esc(info)+'">Details</a>':'')+'</div></div></article>';
  return h;}
var grid=document.getElementById('games-grid');
if(grid){grid.innerHTML=games.map(card).join('')+'<article class="game-card soon" aria-label="More games coming soon"><div class="thumb"><div class="thumb-empty"><canvas class="pixel-emblem" data-size="3" aria-hidden="true"></canvas></div></div><div class="body"><span class="badge dim">Coming soon</span><h3>Next game</h3><p>The next game is still being made. Check back soon.</p></div></article>';
  [].slice.call(grid.querySelectorAll('canvas.pixel-emblem')).forEach(function(c){var s=3;c.width=c.height=96;P.emblem(c.getContext('2d'),0,0,s,1);});}
var feat=document.getElementById('featured');
if(feat){var f=games.filter(function(g){return g.featured;})[0]||games[0];
  if(f){if(f.art)feat.setAttribute('data-keyart-trigger','');feat.innerHTML='<div class="feat-img'+(f.art?' ka-frame':'')+'">'+(f.art?artCanvas(f):f.image?'<img src="'+esc(url(f.image))+'" alt="'+esc(f.title)+'" width="640" height="360">':'')+'</div>'+
   '<div class="feat-body"><p class="kicker">Featured game</p><h2 id="featured-title">'+esc(f.title)+'</h2>'+(f.subtitle?'<p class="sub">'+esc(f.subtitle)+'</p>':'')+
   '<p>'+esc(f.blurb)+'</p>'+(f.tags&&f.tags.length?'<ul class="tags">'+f.tags.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>':'')+
   '<div class="actions">'+(f.play?'<a class="btn gold big" href="'+esc(url(f.play))+'">&#9654; Play '+esc(f.title)+'</a>':'')+(f.info?'<a class="btn" href="'+esc(url(f.info))+'">Game details</a>':'')+'</div></div>';}}
if(window.LAGKeyArt)window.LAGKeyArt.mountAll();
})();
