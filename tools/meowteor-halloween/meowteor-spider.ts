// @ts-nocheck
// GENERATED: engine + replay copied from meowteor-submit (build ENGINE_BUILD='ef9ea45e3b3-r1') + Halloween handler.
const ENGINE_BUILD='ef9ea45e3b3-r1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// ================= ENGINE (pure, deterministic; shared by game, tests and headless balance sim) =================
// World units: 180 x 320 "world pixels" (rendered at 2x). Fixed 60 Hz step.
const PHYS={W:180,H:320,GROUND:296,CATX:52,HBW:12,HBH:10,G:1150,JUMP:255,MAXFALL:300,OBW:28,DT:1/60,
 TOPM:34,BOTM:30,FIRSTX:250};
// Difficulty for the k-th obstacle (0-based). e ramps 0 -> 1 over the first ~100 obstacles, then stays maxed (infinite level).
// Cross-engine determinism: the server re-simulates every submitted run (V8) and must get bit-identical results to
// the player's browser (V8, JavaScriptCore, SpiderMonkey). Only + - * / Math.floor/min/max/round/imul are used in the
// simulation; pow and sin (implementation-defined precision) are replaced by a literal table and a fixed polynomial.
const DIFF_E=[0,0.0199526231496888,0.03596462168791318,0.05076367634561804,0.06482626386771051,0.07836542688315398,0.09150157358062944,0.1043117746308404,0.11684940060021168,0.12915348607498028,0.14125375446227545,0.15317355160842663,0.16493167103832243,0.17654354763209817,0.18802207028360313,0.1993781537965183,0.210621152693478,0.22175916781134827,0.23279927814575477,0.24374771931645306,0.2546100231092847,0.2653911281073648,0.2760954684936768,0.2867270461289272,0.2972894896449307,0.3077861033362291,0.31821990794877125,0.3285936749685389,0.33890995564828674,0.3491711057389097,0.35937930668721074,0.3695365839058538,0.3796448226012467,0.3897057815518492,0.39972110515634074,0.40969233401336785,0.41962091424865766,0.4295082057684607,0.43935548958857623,0.4491639743640834,0.4589348022251941,0.4686690540084535,0.4783677539591453,0.48803187396966347,0.49766233740936017,0.5072600225936295,0.516825765933465,0.5263603648012247,0.5358645801436628,0.5453391388693144,0.5547847360339225,0.5642020368446874,0.5735916785016119,0.5829542718920597,0.592290403152777,0.6016006351119998,0.6108855086228687,0.6201455437981329,0.629381241155055,0.6385930826784816,0.6477815328092162,0.6569470393640987,0.6660900343935533,0.6752109349817922,0.6843101439943604,0.6933880507772526,0.7024450318114385,0.7114814513262697,0.7204976618749288,0.7294940048747913,0.7384708111153171,0.7474284012358583,0.7563670861755645,0.7652871675973776,0.7741889382879458,0.7830726825351271,0.7919386764846242,0.8007871884771605,0.8096184793674984,0.8184328028265003,0.8272304056273321,0.836011527916834,0.8447764034729978,0.8535252599494243,0.862258319107567,0.8709757970375106,0.8796779043679792,0.8883648464662176,0.8970368236283459,0.9056940312607425,0.9143366600529774,0.9229648961427755,0.9315789212734639,0.9401789129443201,0.9487650445542182,0.957337485538936,0.9658964015024689,0.9744419543426706,0.9829743023715227,0.9914936004303152,1]; // = (k/100)^0.85 for k=0..100
function detSin(x){const TP=6.283185307179586,P=3.141592653589793,H=1.5707963267948966;x=x-TP*Math.floor(x/TP);if(x>P)x-=TP;
 if(x>H)x=P-x;else if(x<-H)x=-P-x;const z=x*x;return x*(1+z*(-1/6+z*(1/120+z*(-1/5040+z*(1/362880+z*(-1/39916800+z/6227020800))))));}
function difficulty(k){k=Math.max(0,Math.floor(k));const e=k>=100?1:DIFF_E[k];
 return{e,gap:Math.round(96-26*e)+Math.max(0,3-k)*5, // vertical opening: 96 -> 70 px (+15/+10/+5 warm-up on the first 3; cat hitbox is 10 px tall)
  speed:64+32*e,                               // scroll speed px/s: 64 -> 96
  spacing:Math.round(116-26*e),                // obstacle-to-obstacle distance: 116 -> 90 px
  maxDelta:Math.round(42+54*e),                // max change of gap centre between neighbours: 42 -> 96 px
  moveP:k<18?0:Math.min(.45,(k-18)*.012),       // chance the gap drifts up/down (from score ~18)
  moveAmp:7+11*e,moveHz:.35+.35*e,
  starP:.3};}
function zoneOf(score){return Math.floor(score/25);}
class World{
 constructor(seed){this.seed=seed>>>0;this.rng=mulberry(this.seed);this.t=0;this.frame=0;
  this.cat={y:150,vy:0,rot:0};this.dead=false;this.deathBy=null;this.obs=[];this.k=0;this.score=0;this.picked=0;this.flaps=0;this.log=[];
  this.lastGy=150;this.events=[];this.spawn(PHYS.FIRSTX);}
 spawn(x){const r=this.rng,d=difficulty(this.k);const lo=PHYS.TOPM+d.gap/2,hi=PHYS.GROUND-PHYS.BOTM-d.gap/2;
  let gy=this.k===0?150+(r()*40-20):this.lastGy+(r()*2-1)*d.maxDelta;
  // occasionally force a big swing later on (variation), still bounded by maxDelta
  if(this.k>25&&r()<.15)gy=this.lastGy+(this.lastGy<(lo+hi)/2?1:-1)*d.maxDelta*(.8+r()*.2);
  const moving=r()<d.moveP;const amp=moving?d.moveAmp:0;
  gy=clamp(gy,lo+amp,hi-amp);
  const o={k:this.k,x,w:PHYS.OBW,gap:d.gap,base:gy,amp,hz:d.moveHz*(.8+r()*.4),ph:r()*6.283,passed:false,star:null,zone:zoneOf(this.k)};
  if(this.k>1&&r()<d.starP)o.star={dy:0,got:false,gold:r()<.12};
  this.obs.push(o);this.lastGy=gy;this.k++;}
 gapY(o,t=this.t){return o.amp?o.base+o.amp*detSin(o.ph+6.2832*o.hz*t):o.base;}
 speed(){return difficulty(this.score).speed;}
 // advance obstacles only (independent of the cat => usable for reachability search)
 stepWorld(){const dt=PHYS.DT,sp=this.speed();this.t+=dt;this.frame++;
  for(const o of this.obs)o.x-=sp*dt;
  while(this.obs.length&&this.obs[0].x+this.obs[0].w<-20)this.obs.shift();
  const last=this.obs[this.obs.length-1];const d=difficulty(this.k);if(last.x<=PHYS.W+40-d.spacing||!last)this.spawn(last.x+d.spacing);
  for(const o of this.obs)if(!o.passed&&o.x+o.w<PHYS.CATX-PHYS.HBW/2){o.passed=true;this.score++;this.events.push({e:'score',o});}}
 // does a cat at height y collide at the current time?
 hits(y){const hx0=PHYS.CATX-PHYS.HBW/2,hx1=PHYS.CATX+PHYS.HBW/2,hy0=y-PHYS.HBH/2,hy1=y+PHYS.HBH/2;
  if(hy1>=PHYS.GROUND)return'ground';
  for(const o of this.obs){if(o.x>hx1||o.x+o.w<hx0)continue;const g=this.gapY(o);if(hy0<g-o.gap/2||hy1>g+o.gap/2)return'pillar';}
  return null;}
 static catStep(c,flap){if(flap)c.vy=-PHYS.JUMP;c.vy=Math.min(PHYS.MAXFALL,c.vy+PHYS.G*PHYS.DT);c.y+=c.vy*PHYS.DT;if(c.y<PHYS.HBH/2){c.y=PHYS.HBH/2;if(c.vy<0)c.vy=0;}}
 step(flap){if(this.dead)return;if(flap){this.flaps++;this.log.push(this.frame);}World.catStep(this.cat,flap);this.stepWorld();
  const c=this.cat;c.rot=clamp(c.vy/300,-.45,1.1);
  for(const o of this.obs)if(o.star&&!o.star.got){const sx=o.x+o.w/2,sy=this.gapY(o);if(Math.abs(sx-PHYS.CATX)<10&&Math.abs(sy-c.y)<11){o.star.got=true;this.picked+=o.star.gold?5:1;this.events.push({e:'star',gold:o.star.gold,x:sx,y:sy});}}
  const h=this.hits(c.y);if(h){this.dead=true;this.deathBy=h;this.events.push({e:'dead',by:h});}}
 nextObstacle(){for(const o of this.obs)if(o.x+o.w>=PHYS.CATX-PHYS.HBW/2)return o;return null;}
}

// MEOWTEOR server-side run verification: deterministic replay + bot heuristics.
// Shared by the Supabase Edge Function (edge/meowteor-submit) and the Node test tools. Needs World + PHYS in scope.
const VERIFY_RULES={
  maxFrames:60*60*90,           // 90 min of play per run
  minFlapsForStats:40,          // fewer flaps => too short to judge (and too low to matter)
  rejectP01:0.5,                // >=50% of flaps at the last (or 1 before last) survivable frame = frame-perfect look-ahead
  flagP01:0.22,                 // humans (incl. double-tappers) max 0.16 in calibration
  flagSlackStd:4,               // near-constant "how late could this flap have been" = scripted margin
  flagSlackMean:4,              // always flapping within a few frames of the last safe moment
  flagTrigStd:2.0,              // near-constant flap height relative to the gap = threshold autopilot
  infoScore:250                 // high scores are logged for information only (never a ban by themselves)
};
function meowteorReplay(seed,flaps,claim){
  const R=VERIFY_RULES,HB=PHYS.HBH/2;
  if(!Array.isArray(flaps))return{ok:false,reason:'bad flap log'};
  for(let i=0;i<flaps.length;i++){const f=flaps[i];if(!Number.isInteger(f)||f<0||(i&&f<=flaps[i-1]))return{ok:false,reason:'bad flap log'};}
  const frames=claim.frames|0;if(frames<=0||frames>R.maxFrames)return{ok:false,reason:'bad frame count'};
  if(flaps.length&&flaps[flaps.length-1]>=frames)return{ok:false,reason:'flap after death'};
  const w=new World(seed>>>0);const N=frames+2;
  const lo=new Float64Array(N),hi=new Float64Array(N);   // safe band for the cat centre after step j (obstacles do not depend on the cat)
  const pre=[];let fi=0;
  while(!w.dead&&w.frame<frames+1){const fl=fi<flaps.length&&flaps[fi]===w.frame;
    if(fl){const o=w.nextObstacle();pre.push({f:w.frame,y:w.cat.y,vy:w.cat.vy,rel:o?w.cat.y-w.gapY(o):0});fi++;}
    const j=w.frame;w.step(fl);
    let a=HB,b=PHYS.GROUND-HB-1e-9;const hx0=PHYS.CATX-PHYS.HBW/2,hx1=PHYS.CATX+PHYS.HBW/2;
    for(const o of w.obs){if(o.x>hx1||o.x+o.w<hx0)continue;const g=w.gapY(o);a=Math.max(a,g-o.gap/2+HB);b=Math.min(b,g+o.gap/2-HB);}
    lo[j]=a;hi[j]=b;}
  if(!w.dead)return{ok:false,reason:'run does not end where the client says'};
  if(w.frame!==frames)return{ok:false,reason:'death frame mismatch',replayFrames:w.frame};
  if(w.score!==(claim.score|0))return{ok:false,reason:'score mismatch',replayScore:w.score};
  if(fi!==flaps.length)return{ok:false,reason:'flap after death'};
  // heuristics: for each flap, how many frames later could it have come (all later flaps unchanged) without dying?
  const slack=[],trig=[],ifi=[];let b1=0,b2=0;for(let i=1;i<flaps.length;i++){const g=flaps[i]-flaps[i-1];if(g<=1)b1++;if(g<=2)b2++;}
  // tap groups: flaps 1-2 frames apart (double taps: two thumbs, key+click) are one decision and are delayed together
  const grp=[];for(let i=0;i<pre.length;i++){if(i&&pre[i].f-pre[i-1].f<=2)grp[grp.length-1].m.push(pre[i].f);else grp.push({p:pre[i],m:[pre[i].f]});}
  for(let g=0;g<grp.length;g++){const p=grp[g].p,m=grp[g].m,last=m[m.length-1];const nxt=g+1<grp.length?grp[g+1].p.f:frames;const lim=Math.min(nxt-last-1,40);
    if(g)ifi.push(p.f-grp[g-1].p.f);if(lim<1)continue;
    let s=0;
    for(let d=1;d<=lim;d++){const c={y:p.y,vy:p.vy};let safe=true;
      for(let j=p.f;j<nxt&&j<frames;j++){World.catStep(c,m.includes(j-d));if(!(c.y>=lo[j]&&c.y<=hi[j])){safe=false;break;}}
      if(!safe)break;s=d;}
    slack.push(s);trig.push(p.rel);}
  const mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)*(x-m))));};
  const st={flaps:flaps.length,groups:grp.length,frames,score:w.score,n:slack.length,
    p01:slack.length?slack.filter(s=>s<=1).length/slack.length:0,slackMean:mean(slack),slackStd:sd(slack),
    trigStd:sd(trig),burst1:b1,burst2:b2,burstFrac:flaps.length?b1/flaps.length:0,flapsPerSec:frames?flaps.length/(frames/60):0,ifiCv:ifi.length?sd(ifi)/Math.max(1e-9,mean(ifi)):0};
  for(const k of['p01','slackMean','slackStd','trigStd','ifiCv','burstFrac','flapsPerSec'])st[k]=Math.round(st[k]*1000)/1000;
  const why=[];let verdict='ok';
  if(st.n>=R.minFlapsForStats){
    if(st.p01>=R.rejectP01){verdict='reject';why.push('frame-perfect last-moment flaps '+Math.round(st.p01*100)+'%');}
    else{if(st.p01>=R.flagP01)why.push('many last-moment flaps '+Math.round(st.p01*100)+'%');
      if(st.slackStd<R.flagSlackStd)why.push('near-constant flap timing');
      if(st.slackMean<R.flagSlackMean)why.push('always flaps at the last moment');
      if(st.trigStd<R.flagTrigStd)why.push('near-constant flap height');}}
  // NOTE: back-to-back flaps are logged (burst1) but never ban: two-thumb / key+click players produce them (tested).
  if(verdict!=='reject'&&why.length)verdict='flag';
  const info=w.score>=R.infoScore?['high score (info only)']:[];
  return{ok:true,verdict,why,info,stats:st};
}

// ---- Supabase Edge Function: meowteor-spider (Halloween 2026). Credits spider kills only after a full server replay. ----
// Identity: p_key (server-issued secret) -> player id via meowteor_me. A client-supplied player id is never used.
const SB_URL=Deno.env.get('SUPABASE_URL'),SB_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info','Access-Control-Max-Age':'86400'};
const J=(status,obj)=>new Response(JSON.stringify(obj),{status,headers:{...CORS,'Content-Type':'application/json'}});
async function rpc(fn,body){const r=await fetch(`${SB_URL}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const t=await r.text();let v=null;try{v=t?JSON.parse(t):null;}catch(e){}if(!r.ok){const e=new Error((v&&v.message)||('rpc '+fn+' '+r.status));e.status=r.status;throw e;}return v;}
const OK_BUILDS=new Set([ENGINE_BUILD]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// frame at which each gap (score value) was passed, from a clean deterministic replay
export function gapFrames(seed,flaps,frames){const w=new World(seed>>>0);const out={};let fi=0,s=0;
  while(!w.dead&&w.frame<frames+1){const fl=fi<flaps.length&&flaps[fi]===w.frame;if(fl)fi++;w.step(fl);w.events.length=0;if(w.score!==s){s=w.score;out[s]=w.frame;}}
  return out;}
export async function handle(req){
  if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
  if(req.method!=='POST')return J(405,{message:'POST only'});
  let b;try{const raw=await req.text();if(raw.length>400000)return J(413,{message:'run log too large'});b=JSON.parse(raw);}catch(e){return J(400,{message:'bad json'});}
  const key=String(b.p_key||''),rid=String(b.p_run_id||''),score=b.p_score|0,frames=b.frames|0;
  if(!/^[0-9a-f]{64}$/.test(key)||!UUID.test(rid))return J(400,{message:'key and run ticket are required'});
  if(!Array.isArray(b.flaps)||b.flaps.length>200000)return J(400,{message:'bad flap log'});
  if(!Array.isArray(b.kills)||b.kills.length>50)return J(400,{message:'bad kills'});
  const kills=b.kills.filter(k=>Array.isArray(k)&&k.length===2&&Number.isInteger(k[0])&&Number.isInteger(k[1])).map(k=>[k[0],k[1]]);
  const build=typeof b.build==='string'?b.build.slice(0,40):'';
  if(!OK_BUILDS.has(build))return J(409,{message:'update the game',outdated:true});
  const flaps=[];let acc=0;for(const d of b.flaps){if(!Number.isInteger(d)||d<0||d>1e6)return J(400,{message:'bad flap log'});acc+=d;flaps.push(acc);}
  try{
    const pid=await rpc('meowteor_me',{p_key:key});
    const info=(await rpc('meowteor_run_for_verify',{p_run_id:rid}))?.[0];
    if(!info||info.player_id!==pid)return J(400,{message:'unknown run ticket'});
    const v=meowteorReplay(Number(info.seed),flaps,{frames,score});
    const verdict=v.ok?(v.verdict==='ok'?'ok':'flag'):'mismatch';
    const gf=v.ok?gapFrames(Number(info.seed),flaps,frames):{};
    const res=await rpc('meowteor_hw_credit',{p_player_id:pid,p_run_id:rid,p_score:score,p_frames:frames,p_kills:kills,p_gap_frames:gf,p_verdict:verdict,p_why:v.ok?v.why:[v.reason]});
    return J(200,res);
  }catch(e){const m=String(e&&e.message||e);return J(/auth:/.test(m)?401:(/banned/.test(m)?403:(/ticket|bad run|not in event|redeemed|expired|too fast/.test(m)?400:502)),{message:m});}
}
if(typeof Deno!=='undefined'&&Deno.serve&&!Deno.env.get('NO_SERVE'))Deno.serve(handle);
