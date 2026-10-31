// Mock test of meowteor-spider with the REAL engine/replay. Run: NO_SERVE=1 deno run -A test_spider.ts
Deno.env.set('SUPABASE_URL','https://sb.mock');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','svc');Deno.env.set('NO_SERVE','1');
const M = await import('./meowteor-spider.ts');
const src = await Deno.readTextFile('./meowteor-spider.ts');
const ENGINE_BUILD = /ENGINE_BUILD='([^']+)'/.exec(src)[1];
const World = (0, eval)(src.slice(src.indexOf('const PHYS'), src.indexOf('// MEOWTEOR server-side run verification')).replace(/^/, 'const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}\n') + '\n;World');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)Deno.exitCode=1;};
// a simple bot plays a real run
function play(seed, maxScore){const w=new World(seed);const flaps=[];let last=-99;
  while(!w.dead&&w.score<maxScore){const o=w.nextObstacle();const gy=o?w.gapY(o):150;const fl=w.cat.y>gy+6&&w.cat.vy>-50&&w.frame-last>6;if(fl){flaps.push(w.frame);last=w.frame;}w.step(fl);w.events.length=0;}
  // crash into the ground to end the run
  while(!w.dead){w.step(false);w.events.length=0;}
  return{frames:w.frame,score:w.score,flaps};}
let seed=0,run=null;for(seed=1;seed<200;seed++){run=play(seed,40);if(run.score>=12)break;}
ok(run.score>=12,'bot run reached score '+run.score+' (seed '+seed+')');
const KEY='a'.repeat(64),PID='00000000-0000-4000-8000-0000000000aa',OTHER='00000000-0000-4000-8000-0000000000bb',RID='11111111-1111-4111-8111-111111111111';
let credited=null,runOwner=PID;
globalThis.fetch=async(u,init={})=>{const fn=String(u).split('/').pop();const b=JSON.parse(init.body||'{}');const R=(s,o)=>new Response(JSON.stringify(o),{status:s});
  if(fn==='meowteor_me')return b.p_key===KEY?R(200,PID):R(400,{message:'auth: unknown key'});
  if(fn==='meowteor_run_for_verify')return R(200,[{player_id:runOwner,seed}]);
  if(fn==='meowteor_hw_credit'){credited=b;return R(200,{ok:true,credited:b.p_kills.length});}
  return R(404,{});};
const d=[];let p=0;for(const f of run.flaps){d.push(f-p);p=f;}
const call=async(o)=>{const r=await M.handle(new Request('https://x',{method:'POST',body:JSON.stringify({p_key:KEY,p_run_id:RID,p_score:run.score,frames:run.frames,flaps:d,build:ENGINE_BUILD,kills:[[5,0]],...o})}));return[r.status,await r.json()];};
const gf=M.gapFrames(seed,run.flaps,run.frames);
let [s,v]=await call({kills:[[5,gf[5]+30]]});
ok(s===200&&credited.p_verdict==='ok'&&credited.p_player_id===PID&&credited.p_gap_frames['5']===gf[5],'valid run: replay ok, player id derived from key, gap frames sent to SQL');
[s,v]=await call({p_score:run.score+5});ok(credited.p_verdict==='mismatch','edited score -> replay mismatch, nothing credited by SQL (verdict != ok)');
credited=null;[s,v]=await call({p_key:'b'.repeat(64)});ok(s===401&&!credited,'unknown key -> 401');
[s,v]=await call({p_key:undefined,p_player_id:PID});ok(s===400&&!credited,'raw player id without key -> refused');
runOwner=OTHER;[s,v]=await call({});ok(s===400&&!credited,'someone else\'s run ticket -> refused');runOwner=PID;
[s,v]=await call({p_name:'RENAMED'});ok(s===200&&credited.p_player_id===PID,'display name is ignored (rename keeps progress)');
[s,v]=await call({build:'old'});ok(s===409,'old build -> update the game');
