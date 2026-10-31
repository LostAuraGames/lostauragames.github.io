const pc=require('puppeteer-core'),fs=require('fs'),http=require('http'),path=require('path');
const root='/workspace/site';const OUT='/workspace/halloween/shots/';
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f+='/index.html';
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}const ext=path.extname(f);r.writeHead(200,{'Content-Type':ext==='.html'?'text/html':ext==='.js'?'text/javascript':ext==='.css'?'text/css':'application/octet-stream'});if(ext==='.html'&&/meowteor\/index/.test(f))return r.end(fs.readFileSync(f,'utf8').replace('window.MEOWTEOR_UI=Object.freeze(','window.__E=s=>eval(s);window.MEOWTEOR_UI=Object.freeze('));fs.createReadStream(f).pipe(r);}).listen(8766);
const art=fs.readFileSync('/workspace/halloween/skin/skin_halloween_widow.js','utf8');const legacy=fs.readFileSync('/workspace/meowteor/current_pro_skin.js','utf8');
const KEY='e'.repeat(64);const S={v2:[],v2fail:false,spider:[],calls:[],kills:7};
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1;};
const E=(p,f)=>p.evaluate(s=>window.__E(s),'('+f.toString()+')()');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await pc.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});const p=await b.newPage();await p.setViewport({width:420,height:760});
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
 await p.setRequestInterception(true);
 p.on('request',q=>{const u=q.url();if(!/supabase\.co/.test(u))return q.continue();const H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,OPTIONS'};
  if(q.method()==='OPTIONS')return q.respond({status:204,headers:H,body:''});const fn=u.split('/').pop();let bd={};try{bd=JSON.parse(q.postData()||'{}');}catch(e){}S.calls.push({fn,bd});let st=200,body='null';
  if(fn==='meowteor_session')body=JSON.stringify(bd.p_key===KEY?{ok:true}:{ok:true,key:KEY,new:true});
  else if(fn==='get_halloween_status')body=JSON.stringify({live:true,enabled:true,ends_at:'2026-11-14T05:00:00Z',threshold:25,kills:S.kills,earned:S.kills>=25});
  else if(fn==='meowteor_spider_plan')body=JSON.stringify({live:true,gaps:[2,4,6,8,10,12,14,16,18,20]});
  else if(fn==='get_my_champion_skins_v2'){if(S.v2fail){st=503;body='{"message":"down"}';}else body=JSON.stringify(S.v2);}
  else if(fn==='get_champion_current')body=JSON.stringify({server_now:new Date().toISOString(),active:null,last:null,next:null});
  else if(fn==='start_run')body=JSON.stringify([{run_id:'22222222-2222-4222-8222-222222222222',seed:12345,server_now:new Date().toISOString()}]);
  else if(fn==='meowteor-spider'){S.spider.push(bd);S.kills+=bd.kills.length;body=JSON.stringify({ok:true,credited:bd.kills.length,kills:S.kills,threshold:25,earned:S.kills>=25});}
  else if(fn==='get_top_scores'||fn==='get_live_players')body='[]';
  q.respond({status:st,headers:{...H,'Content-Type':'application/json'},body});});
 const url='http://localhost:8766/games/meowteor/index.html';
 await p.goto(url);
 // stale save: special_skinfler + skin_champion from the old client-side grant, renamed player
 await p.evaluate(()=>{localStorage.setItem('meowteor.save.v1',JSON.stringify({v:1,name:'SKUFLER',seenHelp:true,owned:{skin_champion:1,special_skinfler:1,skin_pro_05_neon_cyber:1,hat_witch:1},eq:{skin:'skin_champion'}}));});
 S.v2fail=true;await p.reload();await sleep(3000);
 let o=await E(p,()=>({sp:!!SAVE.owned.special_skinfler,ch:!!SAVE.owned.skin_champion}));ok(o.sp&&o.ch,'server down -> pro items NOT wiped (fail safe)');
 S.v2fail=false;await E(p,()=>CHAMP.inventory(true));await sleep(1500);
 o=await E(p,()=>({sp:!!SAVE.owned.special_skinfler,ch:!!SAVE.owned.skin_champion,np:!!SAVE.owned.skin_pro_05_neon_cyber,eq:SAVE.eq.skin}));
 ok(!o.sp&&!o.ch&&!o.np&&o.eq==='skin_none','server says not owned -> stale special_skinfler/skin_champion/skin_pro removed and unequipped');
 const v2call=S.calls.filter(c=>c.fn==='get_my_champion_skins_v2').pop();ok(v2call&&v2call.bd.p_key===KEY&&!('p_player_id' in v2call.bd),'ownership read sends the server key, not a player id');
 // owner keeps items after renaming (server keys on id/key only)
 S.v2=[{event:'meowteor-2026-10-29',item:'skin_champion',name:'SKUFLER',score:145,art:{id:'c',v:1,code:legacy},grants:['special_skinfler']}];
 await E(p,()=>{SAVE.name='NEWNAME';persist();CHAMP.invAt=0;return CHAMP.inventory(true);});await sleep(1500);
 o=await E(p,()=>({sp:!!SAVE.owned.special_skinfler,ch:!!SAVE.owned.skin_champion}));ok(o.sp&&o.ch,'renamed owner keeps server-confirmed skin_champion + special_skinfler');
 await E(p,()=>{try{closeModal()}catch(e){};SAVE.eq.skin='skin_none';persist();show('title');});await sleep(1200);
 await p.screenshot({path:OUT+'1_home_lanterns.png'});
 o=await E(p,()=>(document.querySelector('.hwchip')||{}).textContent||'');ok(/7\/25/.test(o),'home shows progress chip: '+o);
 // play with a bot
 await E(p,()=>{startGame();});await sleep(600);
 await E(p,()=>{window.__bot=setInterval(()=>{const W=G.world;if(!W||G.mode==='dead')return;if(G.mode==='ready'){flap();return;}const o=W.nextObstacle();const gy=o?W.gapY(o):150;if(W.cat.y>gy+6&&W.cat.vy>-50)flap();},16);});
 let shot=false;for(let i=0;i<200&&!shot;i++){await sleep(100);const n=await E(p,()=>HW.spiders.length&&HW.spiders[0].t>0.75&&HW.spiders[0].x<150?1:0);if(n){await p.screenshot({path:OUT+'3_spider_dangling.png'});shot=true;}}
 ok(shot,'spider spawned at a server-planned gap and dangles from its web');
 await p.screenshot({path:OUT+'2_decor_webs_lanterns.png'});
 // kill: tap on the spider
 const pos=await E(p,()=>{const s=HW.spiders[0];const r=GC.getBoundingClientRect();return{x:r.left+s.x/PHYS.W*r.width,y:r.top+(s.y+10)/PHYS.H*r.height};});
 const flapsBefore=await E(p,()=>G.world.flaps);await p.mouse.move(pos.x,pos.y);await p.mouse.down();await p.mouse.up();await sleep(90);
 await p.screenshot({path:OUT+'4_kill_effect.png'});
 o=await E(p,()=>({k:G.world.hw.kills.length,sp:HW.spiders.length}));ok(o.k===1,'tap on spider records a kill (gap+frame), spider removed');
 // die and check the submission
 await E(p,()=>clearInterval(window.__bot));for(let i=0;i<60;i++){await sleep(100);if(await E(p,()=>G.mode==='dead'))break;}await sleep(2500);
 const sub=S.spider[0];ok(sub&&sub.p_key===KEY&&!('p_player_id' in sub)&&sub.kills.length===1&&Array.isArray(sub.flaps)&&sub.p_run_id,'run end: replay data + kills sent to meowteor-spider with the key only');
 ok(!S.calls.some(c=>/kills/.test(JSON.stringify(Object.keys(c.bd)))&&c.fn!=='meowteor-spider'),'client never sends a kill count anywhere else');
 // reveal
 S.v2=[{event:'meowteor-halloween-2026',item:'skin_halloween_widow',name:'BLACK WIDOW',score:0,art:{id:'hw-2026-widow',v:1,code:art},grants:[],nft:{token_id:12,status:'unminted'}}];
 await E(p,()=>{try{closeModal()}catch(e){};show('title');CHAMP.invAt=0;CHAMP.inventory(true);});await sleep(2200);
 await p.screenshot({path:OUT+'5_reveal_popup.png'});
 o=await E(p,()=>({own:!!SAVE.owned.skin_halloween_widow,modal:(document.getElementById('modal')||{}).textContent||''}));ok(o.own&&/25 spiders/.test(o.modal),'reveal popup for the Black Widow skin');
 ok(!/chance|odds|%|luck/i.test(o.modal),'no odds/chance wording in the reveal');
 await E(p,()=>{try{closeModal()}catch(e){};SAVE.eq.skin='skin_halloween_widow';persist();startGame();});await sleep(500);
 await E(p,()=>{window.__bot=setInterval(()=>{const W=G.world;if(!W||G.mode==='dead')return;if(G.mode==='ready'){flap();return;}const o=W.nextObstacle();const gy=o?W.gapY(o):150;if(W.cat.y>gy+6&&W.cat.vy>-50)flap();},16);});await sleep(2500);
 await p.screenshot({path:OUT+'6_skin_ingame.png'});
 console.log(errs.join('\n')||'no page errors');await b.close();srv.close();})();
