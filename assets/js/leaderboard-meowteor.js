/* MEOWTEOR live leaderboard for the info page (games/meowteor.html).
   Reads the global top 100 from the game's Supabase project with the same public RPCs the game uses
   (read-only: this script never submits scores) and refreshes every ~15 s while the tab is visible.
   The visitor's row is found with the game's own player id (localStorage "meowteor.playerId", the same
   key and format as src/05_leaderboard.js in the game). Same origin as /games/meowteor/, so it is shared.
   Markup: <div id="lb-meowteor"> with #lb-status, #lb-list, #lb-me inside (see the info page). */
(function(){
'use strict';
// --- same constants as the game (src/05_leaderboard.js) ---
var SUPABASE_URL='https://fugfgorircipfntzopon.supabase.co';
var SUPABASE_ANON_KEY='sb_publishable_9yZM4c8UaklP2z4Vj8NrpQ_4lRRKC0O'; // public publishable key (safe in the browser)
var LB_REFRESH_MS=15000,LB_PID_KEY='meowteor.playerId',LIMIT=100;

var root=document.getElementById('lb-meowteor');if(!root)return;
var elStatus=document.getElementById('lb-status'),elList=document.getElementById('lb-list'),elMe=document.getElementById('lb-me'),elTime=document.getElementById('lb-time');

// The game's player id, read the same way the game does. Unlike the game we never create one here:
// a visitor who has not played yet simply has no row to highlight.
function playerId(){var id=null;try{id=localStorage.getItem(LB_PID_KEY);}catch(e){}return(id&&/^[0-9a-f-]{36}$/i.test(id))?id:null;}

var base=SUPABASE_URL.replace(/\/+$/,'')+'/rest/v1/rpc/';
var headers={'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json','Accept':'application/json'};
if(/^eyJ/.test(SUPABASE_ANON_KEY))headers.Authorization='Bearer '+SUPABASE_ANON_KEY;
function rpc(fn,body){var ctl=typeof AbortController!=='undefined'?new AbortController():null;var tm=setTimeout(function(){if(ctl)ctl.abort();},7000);
  return fetch(base+fn,{method:'POST',headers:headers,body:JSON.stringify(body),signal:ctl&&ctl.signal,cache:'no-store'})
   .then(function(r){return r.text().then(function(t){if(!r.ok)throw new Error(fn+' HTTP '+r.status);return t?JSON.parse(t):null;});})
   .then(function(v){clearTimeout(tm);return v;},function(e){clearTimeout(tm);throw e;});}
function fetchTop(pid){return rpc('get_top_scores',{p_limit:LIMIT,p_player_id:pid}).then(function(rows){return(rows||[]).map(function(r){return{rank:+r.rank,name:String(r.name||''),score:+r.score,me:!!r.is_me};});});}
function fetchMyRank(pid){return rpc('get_my_rank',{p_player_id:pid}).then(function(res){var r=Array.isArray(res)?res[0]:res;if(!r||r.rank==null)return null;return{rank:+r.rank,name:String(r.name||''),score:+r.score,total:+r.total_players};});}

function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function rankCell(n){return n<=3?'<span class="lb-medal m'+n+'" aria-hidden="true">&#9733;</span>'+n:'#'+n;}
function row(r,pinned){return '<li class="lb-row'+(r.me?' me':'')+(r.rank<=3?' top'+r.rank:'')+'"'+(r.me?' aria-current="true"':'')+'>'+
  '<span class="lb-pos">'+rankCell(r.rank)+'</span><span class="lb-name">'+esc(r.name)+(r.me?' <em>(you)</em>':'')+'</span><span class="lb-score">'+fmt(r.score)+'</span></li>';}
function setStatus(kind,text){elStatus.className='lb-status '+kind;elStatus.textContent=text;root.setAttribute('data-state',kind);}

var busy=false,timer=0,hasData=false;
function refresh(){if(busy)return;busy=true;var pid=playerId();
  var jobs=[fetchTop(pid)];if(pid)jobs.push(fetchMyRank(pid).catch(function(){return null;}));
  Promise.all(jobs).then(function(res){var rows=res[0],me=res[1]||null;hasData=true;
    if(!rows.length){elList.innerHTML='<li class="lb-empty">No scores yet, be the first!</li>';}
    else elList.innerHTML=rows.map(function(r){return row(r);}).join('');
    var inList=rows.some(function(r){return r.me;});
    if(me&&!inList&&me.score>0){elMe.hidden=false;elMe.innerHTML='<p class="lb-me-h">Your position'+(me.total?' <span>of '+fmt(me.total)+' players</span>':'')+'</p><ol class="lb-rows">'+row({rank:me.rank,name:me.name,score:me.score,me:true},true)+'</ol>';}
    else{elMe.hidden=true;elMe.innerHTML='';}
    setStatus('live','Live \u00b7 global');
    if(elTime)elTime.textContent='Updated '+new Date().toLocaleTimeString();
  }).catch(function(e){
    if(!hasData)elList.innerHTML='<li class="lb-empty lb-err">The leaderboard is offline right now. We\u2019ll keep trying, and your best score is safe in the game.</li>';
    setStatus('offline',hasData?'Offline \u00b7 showing last scores':'Offline \u00b7 retrying');
    if(window.console&&console.warn)console.warn('[MEOWTEOR leaderboard] '+(e&&e.message||e));
  }).then(function(){busy=false;});}
function start(){clearInterval(timer);timer=setInterval(function(){if(!document.hidden)refresh();},LB_REFRESH_MS);}
document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh();});
window.addEventListener('online',refresh);
setStatus('loading','Connecting\u2026');refresh();start();
window.LAGLeaderboardMeowteor={refresh:refresh,playerId:playerId};
})();
