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
// Last line of defence (server already filters): same slur check as public.lb_name_blocked.
function slurNorm(s){var m={'1':'i','l':'i','!':'i','|':'i','y':'i','3':'e','4':'a','@':'a','0':'o','5':'s','$':'s','9':'g','6':'g','7':'t'};return String(s||'').toLowerCase().replace(/[1l!|y34@05$967]/g,function(c){return m[c];}).replace(/[^a-z]/g,'').replace(/(.)\1+/g,'$1');}
function blockedName(s){return /nig(a|e?r|u[hr]|z|s|let)/.test(slurNorm(s));}
function fetchTop(pid){return rpc('get_top_scores',{p_limit:LIMIT,p_player_id:pid}).then(function(rows){return(rows||[]).map(function(r){return{rank:+r.rank,name:String(r.name||''),score:+r.score,me:!!r.is_me};}).filter(function(r){return !blockedName(r.name);});});}
function fetchMyRank(pid){return rpc('get_my_rank',{p_player_id:pid}).then(function(res){var r=Array.isArray(res)?res[0]:res;if(!r||r.rank==null||blockedName(r.name))return null;return{rank:+r.rank,name:String(r.name||''),score:+r.score,total:+r.total_players};});}

// UI text goes through the site translations (assets/js/i18n.js); player names are shown exactly as typed.
function T(k,v){return window.LAGI18N?window.LAGI18N.t(k,v):String(k).replace(/\{(\w+)\}/g,function(m,x){return v&&v[x]!=null?v[x]:m;});}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function rankCell(n){return n<=3?'<span class="lb-medal m'+n+'" aria-hidden="true">&#9733;</span>'+n:'#'+n;}
function row(r,pinned){return '<li class="lb-row'+(r.me?' me':'')+(r.rank<=3?' top'+r.rank:'')+'"'+(r.me?' aria-current="true"':'')+'>'+
  '<span class="lb-pos">'+rankCell(r.rank)+'</span><span class="lb-name">'+esc(r.name)+(r.me?' <em>'+esc(T('(you)'))+'</em>':'')+'</span><span class="lb-score">'+fmt(r.score)+'</span></li>';}
var stKind='loading',stKey='Connecting\u2026',last=null,lastErr=false,lastTime=null;
function setStatus(kind,key){stKind=kind;stKey=key;elStatus.className='lb-status '+kind;elStatus.textContent=T(key);root.setAttribute('data-state',kind);}
function render(){if(last){var rows=last.rows,me=last.me;
    if(!rows.length){elList.innerHTML='<li class="lb-empty">'+esc(T('No scores yet, be the first!'))+'</li>';}
    else elList.innerHTML=rows.map(function(r){return row(r);}).join('');
    var inList=rows.some(function(r){return r.me;});
    if(me&&!inList&&me.score>0){elMe.hidden=false;elMe.innerHTML='<p class="lb-me-h">'+esc(T('Your position'))+(me.total?' <span>'+esc(T('of {n} players',{n:fmt(me.total)}))+'</span>':'')+'</p><ol class="lb-rows">'+row({rank:me.rank,name:me.name,score:me.score,me:true},true)+'</ol>';}
    else{elMe.hidden=true;elMe.innerHTML='';}}
  else if(lastErr)elList.innerHTML='<li class="lb-empty lb-err">'+esc(T('The leaderboard is offline right now. We\u2019ll keep trying, and your best score is safe in the game.'))+'</li>';
  else elList.innerHTML='<li class="lb-empty">'+esc(T('Loading scores\u2026'))+'</li>';
  elList.setAttribute('aria-label',T('Top 100 scores'));
  if(elTime)elTime.textContent=lastTime?T('Updated {time}',{time:lastTime.toLocaleTimeString(window.LAGI18N?window.LAGI18N.lang:undefined)}):T('Refreshes every 15 seconds.');
  elStatus.textContent=T(stKey);}
document.addEventListener('lag:lang',render);

var busy=false,timer=0,hasData=false;
function refresh(){if(busy)return;busy=true;var pid=playerId();
  var jobs=[fetchTop(pid)];if(pid)jobs.push(fetchMyRank(pid).catch(function(){return null;}));
  Promise.all(jobs).then(function(res){var rows=res[0],me=res[1]||null;hasData=true;
    last={rows:rows,me:me};lastTime=new Date();setStatus('live','Live \u00b7 global');render();
  }).catch(function(e){
    if(!hasData){lastErr=true;render();}
    setStatus('offline',hasData?'Offline \u00b7 showing last scores':'Offline \u00b7 retrying');
    if(window.console&&console.warn)console.warn('[MEOWTEOR leaderboard] '+(e&&e.message||e));
  }).then(function(){busy=false;});}
function start(){clearInterval(timer);timer=setInterval(function(){if(!document.hidden)refresh();},LB_REFRESH_MS);}
document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh();});
window.addEventListener('online',refresh);
setStatus('loading','Connecting\u2026');render();refresh();start();

// ---- Leaderboard Champion event (server-authoritative; see the game's supabase_champion.sql) ----
// Countdown to the deadline using the SERVER clock (offset from get_champion_status), then the winner's name
// above the board for 24 h. Never shows anything about the skin's look (only the winner's game receives it).
var CH_EVENT=(/[?&]champ=([a-z0-9-]{3,48})\b/.exec(location.search)||[])[1]||'meowteor-2026-10-29';
var elChamp=document.getElementById('lb-champ'),ch={st:null,off:0,busy:false,poll:0,last:0,state:null};
function chNow(){return Date.now()+ch.off;}
function chState(){var st=ch.st;if(!st||!st.event)return'none';var n=chNow(),d=Date.parse(st.deadline),b=Date.parse(st.banner_until);
  if(st.decided)return(st.has_winner&&n<b)?'banner':'over';if(n<d)return'pending';return n<b?'deciding':'over';}
function p2(n){return(n<10?'0':'')+n;}
function chCountdown(){var ms=Math.max(0,Date.parse(ch.st.deadline)-chNow()),s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60;
  var hms=p2(h)+':'+p2(m)+':'+p2(x);return d>0?T('{d}d {hms}',{d:d,hms:hms}):hms;}
function chDate(){try{return new Date(ch.st.deadline).toLocaleString(window.LAGI18N?window.LAGI18N.lang:undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});}catch(e){return new Date(ch.st.deadline).toString();}}
function chRender(){if(!elChamp)return;var s=chState();ch.state=s;var h='';
  if(s==='pending')h='<p class="lb-champ-t">&#9733; '+esc(T('Champion event'))+' &#9733;</p><p class="lb-champ-s">'+esc(T('#1 on the leaderboard when the timer ends wins the 1 of 1 space cat skin: an exclusive full-body skin nobody else can ever get.'))+'</p>'+
    '<p class="lb-champ-cd"><span>'+esc(T('Time left until the winner gets the skin'))+'</span><b class="lb-champ-time">'+esc(chCountdown())+'</b></p><p class="lb-champ-s muted">'+esc(T('Ends {date}',{date:chDate()}))+'</p>';
  else if(s==='deciding')h='<p class="lb-champ-t">&#9733; '+esc(T('Champion event'))+' &#9733;</p><p class="lb-champ-s">'+esc(T("Time's up! Crowning the Leaderboard Champion\u2026"))+'</p>';
  else if(s==='banner')h='<p class="lb-champ-t">&#9819; '+esc(T('Leaderboard Champion'))+' &#9819;</p><p class="lb-champ-n">'+esc(ch.st.winner_name||'')+(ch.st.is_me?' <em>'+esc(T('(you)'))+'</em>':'')+'</p><p class="lb-champ-s">'+esc(T('Winner of the 1 of 1 space cat skin'))+'</p>';
  elChamp.hidden=!h;elChamp.className='lb-champ'+(h?' '+s:'');if(elChamp.getAttribute('data-h')!==h){elChamp.innerHTML=h;elChamp.setAttribute('data-h',h);}}
function chRefresh(){if(ch.busy)return;ch.busy=true;ch.last=Date.now();var t0=Date.now();
  rpc('get_champion_status',{p_event:CH_EVENT,p_player_id:playerId()}).then(function(st){var t1=Date.now();if(st&&st.server_now)ch.off=Date.parse(st.server_now)+(t1-t0)/2-t1;ch.st=st;chRender();})
   .catch(function(e){if(window.console&&console.warn)console.warn('[MEOWTEOR champion] '+(e&&e.message||e));}).then(function(){ch.busy=false;});}
function chTick(){if(!ch.st)return;var s=chState();
  if(s==='deciding'&&Date.now()-ch.poll>4000){ch.poll=Date.now();chRefresh();}
  else if(s==='pending'&&Date.parse(ch.st.deadline)-chNow()<1500&&Date.now()-ch.poll>1500){ch.poll=Date.now();setTimeout(chRefresh,1600);}
  else if(Date.now()-ch.last>60000&&!document.hidden)chRefresh();
  if(s!==ch.state)chRender();else if(s==='pending'){var b=elChamp&&elChamp.querySelector('.lb-champ-time');if(b)b.textContent=chCountdown();}}
if(elChamp){document.addEventListener('lag:lang',function(){elChamp.removeAttribute('data-h');chRender();});chRefresh();setInterval(chTick,1000);}
window.LAGLeaderboardMeowteor={refresh:refresh,playerId:playerId,champion:function(){return{state:chState(),st:ch.st,offset:ch.off};}};
})();
