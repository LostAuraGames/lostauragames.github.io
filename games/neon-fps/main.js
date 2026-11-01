/* VOLTLINE — 1v1 ranked neon-line FPS. Everything is drawn with line geometry; invisible depth-only occluders hide lines behind cover. */
(function(){'use strict';
const SB_URL='https://fugfgorircipfntzopon.supabase.co',SB_KEY='sb_publishable_9yZM4c8UaklP2z4Vj8NrpQ_4lRRKC0O';
const sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false},realtime:{params:{eventsPerSecond:40}}});
const $=id=>document.getElementById(id);
const COL={a:0x22f4ff,b:0xff2bd6},CSS={a:'#3ff',b:'#f4e'};
const WIN_ROUNDS=3,ROUND_TIME=90,NET_HZ=15,INTERP=0.13;
const WEAP={rifle:{dmg:20,head:2,rate:0.1,mag:30,reload:2.0,auto:true,spread:0.012,range:120,recoil:0.025,recoilYaw:0},
            pistol:{dmg:30,head:2,rate:0.24,mag:12,reload:1.3,auto:false,spread:0.006,range:80,recoil:0.025,recoilYaw:0}};
// ---------- identity ----------
function uuid(){return crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));}
const SK=(new URLSearchParams(location.search).get('slot')||'');
let myId=localStorage.getItem('nfps.id'+SK),mySecret=localStorage.getItem('nfps.secret'+SK);
if(!myId||!mySecret){myId=uuid();mySecret=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('nfps.id'+SK,myId);localStorage.setItem('nfps.secret'+SK,mySecret);}
let me={name:localStorage.getItem('nfps.name'+SK)||'',rp:0};
$('name').value=me.name;
async function rpc(fn,args){const {data,error}=await sb.rpc(fn,args);if(error)throw new Error(error.message);return data;}
async function register(){me.name=$('name').value.trim();localStorage.setItem('nfps.name'+SK,me.name);
  const r=await rpc('nfps_register',{p_id:myId,p_secret:mySecret,p_name:me.name});me.name=r.name;me.rp=r.rp;$('name').value=r.name;await refreshMe();}
async function refreshMe(){try{const r=await rpc('nfps_me',{p_id:myId});if(r){me.rp=r.rp;$('me').innerHTML=`<b>${esc(r.name)}</b> · <span style="color:#ff4">${r.rp} RP</span> · ${r.wins}W ${r.losses}L · #${r.rank}`;}
  const lb=await rpc('nfps_leaderboard',{p_limit:15});$('lb').innerHTML='<div style="color:#f6f">LEADERBOARD</div>'+(lb||[]).map(x=>`<div class="${x.name===me.name?'me':''}"><span>#${x.rank} ${esc(x.name)}</span><span>${x.rp} RP · ${x.wins}-${x.losses}</span></div>`).join('')||'';}catch(e){console.warn(e);}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// ---------- renderer + bloom ----------
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0);
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,0.03,400);camera.rotation.order='YXZ';
scene.add(camera);
const FS=new THREE.OrthographicCamera(-1,1,1,-1,0,1),fsScene=new THREE.Scene(),fsQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));fsScene.add(fsQuad);
const rtOpt={type:THREE.HalfFloatType};let rtMain,mips=[];
const blurMat=new THREE.ShaderMaterial({uniforms:{t:{value:null},d:{value:new THREE.Vector2()}},vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:'uniform sampler2D t;uniform vec2 d;varying vec2 u;void main(){vec4 c=texture2D(t,u)*0.227;c+=(texture2D(t,u+d*1.385)+texture2D(t,u-d*1.385))*0.316;c+=(texture2D(t,u+d*3.23)+texture2D(t,u-d*3.23))*0.07;gl_FragColor=c;}'});
const compMat=new THREE.ShaderMaterial({uniforms:{t0:{value:null},m0:{value:null},m1:{value:null},m2:{value:null},m3:{value:null},m4:{value:null}},vertexShader:blurMat.vertexShader,
 fragmentShader:'uniform sampler2D t0,m0,m1,m2,m3,m4;varying vec2 u;void main(){vec3 b=texture2D(m0,u).rgb*1.2+texture2D(m1,u).rgb*1.3+texture2D(m2,u).rgb*1.4+texture2D(m3,u).rgb*1.5+texture2D(m4,u).rgb*1.6;vec3 c=texture2D(t0,u).rgb*1.2+b*1.15;c=1.-exp(-c*1.4);gl_FragColor=vec4(c,1.);}'});
function makeRT(){const w=renderer.domElement.width,h=renderer.domElement.height;rtMain&&rtMain.dispose();mips.forEach(m=>{m.a.dispose();m.b.dispose();});
 rtMain=new THREE.WebGLRenderTarget(w,h,{...rtOpt,samples:4});mips=[];let mw=w>>1,mh=h>>1;for(let i=0;i<5;i++){mips.push({a:new THREE.WebGLRenderTarget(mw,mh,rtOpt),b:new THREE.WebGLRenderTarget(mw,mh,rtOpt),w:mw,h:mh});mw=Math.max(1,mw>>1);mh=Math.max(1,mh>>1);}}
makeRT();
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();makeRT();});
function render(){renderer.setRenderTarget(rtMain);renderer.render(scene,camera);let src=rtMain.texture;fsQuad.material=blurMat;
 for(const m of mips){blurMat.uniforms.t.value=src;blurMat.uniforms.d.value.set(1/m.w,0);renderer.setRenderTarget(m.a);renderer.render(fsScene,FS);
  blurMat.uniforms.t.value=m.a.texture;blurMat.uniforms.d.value.set(0,1/m.h);renderer.setRenderTarget(m.b);renderer.render(fsScene,FS);src=m.b.texture;}
 fsQuad.material=compMat;compMat.uniforms.t0.value=rtMain.texture;mips.forEach((m,i)=>compMat.uniforms['m'+i].value=m.b.texture);renderer.setRenderTarget(null);renderer.render(fsScene,FS);}
// ---------- line helpers ----------
const lineMats={};function LM(c,o){const k=c+'_'+(o||1);return lineMats[k]||(lineMats[k]=new THREE.LineBasicMaterial({color:c,transparent:o<1,opacity:o||1}));}
function segs(arr,color,op){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));return new THREE.LineSegments(g,LM(color,op));}
const occMat=new THREE.MeshBasicMaterial({colorWrite:false,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
// ---------- map ----------
// solids: {x0,x1,z0,z1,y0,y1,kind}, ramps: {x0,x1,z0,z1,h,axis:'x'|'z',dir:+1|-1}
const solids=[],ramps=[];
function box(cx,cz,sx,sz,h,kind,y0){solids.push({x0:cx-sx/2,x1:cx+sx/2,z0:cz-sz/2,z1:cz+sz/2,y0:y0||0,y1:(y0||0)+h,kind:kind||'wall'});}
function ramp(x0,x1,z0,z1,h,axis,dir){ramps.push({x0,x1,z0,z1,h,axis,dir});}
const W=34,D=22;
box(0,-D-0.25,2*W,0.5,5);box(0,D+0.25,2*W,0.5,5);box(-W-0.25,0,0.5,2*D,5);box(W+0.25,0,0.5,2*D,5);
// lane dividers
for(const s of[-1,1]){box(s*9,-7.5,10,0.5,3.2);box(s*9,7.5,10,0.5,3.2);box(s*22,-11,0.5,6,2.6);box(s*22,11,0.5,6,2.6);}
// center platform + ramps
box(0,0,6,6,1.6,'plat');ramp(3,8,-1.5,1.5,1.6,'x',-1);ramp(-8,-3,-1.5,1.5,1.6,'x',1);
// spawn cover
for(const s of[-1,1]){box(s*27,-4,0.5,4,1.15,'low');box(s*27,4,0.5,4,1.15,'low');box(s*24,0,1.4,1.4,1.4,'crate');
 // side lane catwalk + ramp
 box(s*14,s*-16,8,3,2.2,'plat');ramp(s*14-(s>0?-4:4)+ (s>0?0:-6),s*14-(s>0?-4:4)+(s>0?6:0),s*-16-1.5,s*-16+1.5,2.2,'x',s>0?-1:1);
 box(s*-14,s*-16,1.4,1.4,1.4,'crate');box(s*-12.4,s*-16,1.4,1.4,1.4,'crate');box(s*-13.2,s*-16,1.4,1.4,1.4,'crate',1.4);
 box(s*5,s*-13,1.4,1.4,1.4,'crate');box(s*18,s*4,1.4,1.4,1.4,'crate');box(s*18,s*-3,0.6,3,2.4,'wall');
 box(s*12,0,1.4,1.4,1.4,'crate');box(s*13.4,0.3,1.4,1.4,1.4,'crate');box(s*5,s*13,3,0.5,1.2,'low');box(s*-20,s*17,1.4,1.4,1.4,'crate');
 box(s*30,s*15,1.4,1.4,1.4,'crate');box(s*30,s*-15,1.4,1.4,1.4,'crate');box(s*-5,s*-18,0.5,4,1.6,'low');}
for(const p of[[-4,10.5],[4,-10.5],[-17,-1],[17,1]])box(p[0],p[1],1,1,4,'pillar');
function rampH(r,x,z){let t=r.axis==='x'?(x-r.x0)/(r.x1-r.x0):(z-r.z0)/(r.z1-r.z0);if(r.dir<0)t=1-t;return r.h*Math.max(0,Math.min(1,t));}
// build visuals
const mapG=new THREE.Group();scene.add(mapG);
(function buildMap(){const floor=[],grid=0x1460ff;
 for(let x=-W;x<=W;x+=2){floor.push(x,0,-D,x,0,D);} for(let z=-D;z<=D;z+=2){floor.push(-W,0,z,W,0,z);}
 mapG.add(segs(floor,0x0a3cff,0.55));
 const major=[];for(let x=-W;x<=W;x+=10)major.push(x,0.01,-D,x,0.01,D);major.push(-W,0.01,0,W,0.01,0);mapG.add(segs(major,0x3a7cff,0.9));
 const team=[];for(const [s,c] of[[-1,'a'],[1,'b']]){const a=[];const x0=s*W,x1=s*(W-5);for(let z=-6;z<=6;z+=1)a.push(x0,0.02,z,x1,0.02,z);a.push(x1,0.02,-6,x1,0.02,6);mapG.add(segs(a,COL[c],0.6));}
 const occ=new THREE.BoxGeometry(1,1,1);
 for(const b of solids){const sx=b.x1-b.x0,sy=b.y1-b.y0,sz=b.z1-b.z0;const m=new THREE.Mesh(occ,occMat);m.scale.set(sx,sy,sz);m.position.set((b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.z0+b.z1)/2);mapG.add(m);
  const e=[],x0=b.x0,x1=b.x1,y0=b.y0,y1=b.y1,z0=b.z0,z1=b.z1;
  const C=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
  for(const [i,j] of[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])e.push(...C[i],...C[j]);
  let col=0x2ff0ff;
  if(b.kind==='crate'){col=0xffb020;for(const [a,bb,c,d] of[[0,5,1,4],[3,6,2,7],[0,7,3,4],[1,6,2,5],[4,6,5,7]])e.push(...C[a],...C[bb],...C[c],...C[d]);}
  else if(b.kind==='pillar'){col=0xa060ff;for(let y=y0+0.5;y<y1;y+=0.5)e.push(x0,y,z0,x1,y,z0,x1,y,z0,x1,y,z1,x1,y,z1,x0,y,z1,x0,y,z1,x0,y,z0);}
  else {if(b.kind==='low')col=0x40ff90;if(b.kind==='plat')col=0x40ff90;
   const step=b.kind==='wall'&&sy>4?1:0.4;for(let y=y0+step;y<y1-0.05;y+=step)e.push(x0,y,z0,x1,y,z0,x1,y,z0,x1,y,z1,x1,y,z1,x0,y,z1,x0,y,z1,x0,y,z0);
   if(b.kind==='plat'){for(let x=x0+1;x<x1;x+=1)e.push(x,y1,z0,x,y1,z1);}}
  mapG.add(segs(e,col,b.kind==='wall'&&sy>4?0.7:1));}
 for(const r of ramps){const e=[];const hx=(x,z)=>rampH(r,x,z);const P=(x,z)=>[x,hx(x,z),z];
  const pts=[[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]];for(let i=0;i<4;i++){const a=pts[i],b=pts[(i+1)%4];e.push(...P(...a),...P(...b));e.push(a[0],0,a[1],...P(...a));e.push(a[0],0,a[1],b[0],0,b[1]);}
  for(let k=1;k<10;k++){const t=k/10;if(r.axis==='x'){const x=r.x0+(r.x1-r.x0)*t;e.push(...P(x,r.z0),...P(x,r.z1));}else{const z=r.z0+(r.z1-r.z0)*t;e.push(...P(r.x0,z),...P(r.x1,z));}}
  mapG.add(segs(e,0xffff40));
  const g=new THREE.BufferGeometry();const v=[];const T=(a,b,c)=>v.push(...a,...b,...c);
  const A=P(r.x0,r.z0),B=P(r.x1,r.z0),Cc=P(r.x1,r.z1),Dd=P(r.x0,r.z1);T(A,B,Cc);T(A,Cc,Dd);g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  const m=new THREE.Mesh(g,occMat);m.material.side=THREE.DoubleSide;mapG.add(m);}
 // sky: horizon contour ridges + wire dome rings
 const sky=[];let prev=null;for(let i=0;i<=240;i++){const a=i/240*Math.PI*2,R=220,h=14+10*Math.sin(a*5)+6*Math.sin(a*13+1)+3*Math.sin(a*31);const p=[Math.cos(a)*R,h,Math.sin(a)*R];if(prev)sky.push(...prev,...p);prev=p;}
 mapG.add(segs(sky,0xff2bd6,0.8));prev=null;const sky2=[];for(let i=0;i<=240;i++){const a=i/240*Math.PI*2,R=240,h=6+6*Math.sin(a*7+2)+4*Math.sin(a*17);const p=[Math.cos(a)*R,h,Math.sin(a)*R];if(prev)sky2.push(...prev,...p);prev=p;}
 mapG.add(segs(sky2,0x7a2cff,0.6));
 const dome=[];for(let k=1;k<6;k++){const el=k*0.25,R=300*Math.cos(el),y=300*Math.sin(el);for(let i=0;i<96;i++){const a=i/96*Math.PI*2,b=(i+1)/96*Math.PI*2;dome.push(Math.cos(a)*R,y,Math.sin(a)*R,Math.cos(b)*R,y,Math.sin(b)*R);}}
 mapG.add(segs(dome,0x102a80,0.5));})();
// ---------- collision ----------
const PR=0.35,PH=1.75,EYE=1.6,STEP=0.45;
function surfH(x,z,feet){let g=0;for(const b of solids){if(x>b.x0-PR&&x<b.x1+PR&&z>b.z0-PR&&z<b.z1+PR&&b.y1<=feet+STEP&&b.y1>g)g=b.y1;}
 for(const r of ramps){if(x>r.x0&&x<r.x1&&z>r.z0&&z<r.z1){const h=rampH(r,x,z);if(h<=feet+STEP&&h>g)g=h;}}return g;}
function blocked(x,z,feet){for(const b of solids){if(x>b.x0-PR&&x<b.x1+PR&&z>b.z0-PR&&z<b.z1+PR&&b.y1>feet+STEP&&b.y0<feet+PH)return true;}
 for(const r of ramps){if(x>r.x0-PR*0.3&&x<r.x1+PR*0.3&&z>r.z0-PR*0.3&&z<r.z1+PR*0.3){const h=rampH(r,Math.min(r.x1,Math.max(r.x0,x)),Math.min(r.z1,Math.max(r.z0,z)));if(h>feet+STEP)return true;}}return false;}
function rayBox(o,d,b){let t0=0,t1=1e9;for(const [k,a0,a1] of[[0,b.x0,b.x1],[1,b.y0,b.y1],[2,b.z0,b.z1]]){const inv=1/(d[k]||1e-9);let ta=(a0-o[k])*inv,tb=(a1-o[k])*inv;if(ta>tb)[ta,tb]=[tb,ta];t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)return Infinity;}return t0;}
function rayMap(o,d,maxT){let best=maxT;if(o[1]+d[1]*best<0&&d[1]<0)best=Math.min(best,-o[1]/d[1]);
 for(const b of solids){const t=rayBox(o,d,b);if(t<best)best=t;}
 for(const r of ramps){const t=rayBox(o,d,{x0:r.x0,x1:r.x1,z0:r.z0,z1:r.z1,y0:0,y1:r.h});if(t<best){for(let k=0;k<=16;k++){const tt=t+k*0.15;if(tt>best)break;const x=o[0]+d[0]*tt,y=o[1]+d[1]*tt,z=o[2]+d[2]*tt;if(x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1&&y<=rampH(r,x,z)){best=tt;break;}}}}
 return best;}
function rayPlayer(o,d,p){// vertical cylinder
 const fx=o[0]-p.x,fz=o[2]-p.z,a=d[0]*d[0]+d[2]*d[2],b=2*(fx*d[0]+fz*d[2]),c=fx*fx+fz*fz-0.42*0.42,disc=b*b-4*a*c;if(disc<0||a<1e-9)return null;
 const s=Math.sqrt(disc);for(const t of[(-b-s)/(2*a),(-b+s)/(2*a)]){if(t<0)continue;const y=o[1]+d[1]*t;const hm=rollLow(p.roll);if(y>=p.y&&y<=p.y+1.82*hm)return{t,head:y>p.y+1.48*hm};}return null;}
// ---------- art from Blender ----------
let ART=null;
function poseGeom(strokes,mirror){const a=[];for(const s of strokes)for(let i=0;i<s.length-1;i++)a.push(s[i][0]*mirror,s[i][1],0,s[i+1][0]*mirror,s[i+1][1],0);return a;}
function gun3D(prof,width){const a=[];for(const s of prof){for(let i=0;i<s.length-1;i++){for(const w of[-width,width])a.push(s[i][0],s[i][1],w,s[i+1][0],s[i+1][1],w);}for(const p of s)a.push(p[0],p[1],-width,p[0],p[1],width);}return a;}
// ---------- players ----------
class Figure{constructor(team,mate){this.g=new THREE.Group();this.team=team;this.objs={};this.col=COL[team];
  for(const k in ART.poses){for(const m of[1,-1]){const L=segs(poseGeom(ART.poses[k],m),this.col);L.material=this.mat||(this.mat=new THREE.LineBasicMaterial({color:this.col,transparent:true,opacity:1}));L.visible=false;this.g.add(L);this.objs[k+m]=L;}}
  this.guns={};for(const w of['rifle','pistol'])for(const m of[1,-1]){const L=segs(poseGeom(ART[w],m),0xffffff);L.material=this.gmat||(this.gmat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:1}));L.scale.setScalar(w==='rifle'?0.9:1.1);L.visible=false;this.g.add(L);this.guns[w+m]=L;}
  if(mate){const d=segs([0,2.05,0,0.12,2.2,0,0.12,2.2,0,0,2.35,0,0,2.35,0,-0.12,2.2,0,-0.12,2.2,0,0,2.05,0],this.col);d.material=this.mat;this.g.add(d);}
  scene.add(this.g);}
 set(pose,mirror,weapon){for(const k in this.objs)this.objs[k].visible=false;for(const k in this.guns)this.guns[k].visible=false;const o=this.objs[pose+mirror];o.visible=true;
  if(pose!=='dead'){const arm=ART.poses[pose][7],hand=arm[arm.length-1];const gn=this.guns[weapon+mirror];gn.visible=true;gn.position.set(hand[0]*mirror,hand[1],0.01);
   gn.rotation.z=pose==='aim'?0:-0.5*mirror;}}
 setAlpha(a){this.mat.opacity=a;this.gmat.opacity=a;this.alpha=a;}
 dispose(){scene.remove(this.g);}}
// ---------- viewmodel ----------
const vm={};function buildVM(){for(const w of['rifle','pistol']){const g=new THREE.Group();const L=segs(gun3D(ART[w],w==='rifle'?0.035:0.022),0xffffff);L.material=new THREE.LineBasicMaterial({color:0xffffff,depthTest:false,transparent:true});L.renderOrder=10;
  L.scale.setScalar(0.7);g.add(L);L.rotation.y=Math.PI/2;g.visible=false;camera.add(g);vm[w]=g;
  const fl=segs([0,0,0,0.1,0.05,0,0,0,0,0.1,-0.05,0,0,0,0,0.12,0,0.05,0,0,0,0.12,0,-0.05,0,0,0,0.08,0.08,0],0xffee88);fl.material=new THREE.LineBasicMaterial({color:0xffee88,depthTest:false,transparent:true});fl.renderOrder=11;fl.rotation.y=Math.PI/2;
  fl.position.set(0,0,-(w==='rifle'?0.42:0.12));fl.visible=false;g.add(fl);g.userData.flash=fl;}}
// ---------- effects ----------
const fx=[];function tracer(o,e,color){const L=segs([...o,...e],color);L.material=new THREE.LineBasicMaterial({color,transparent:true,opacity:1});scene.add(L);fx.push({o:L,life:0.12,max:0.12});}
function spark(p,color){const a=[];for(let i=0;i<10;i++){const d=[Math.random()-0.5,Math.random()-0.5,Math.random()-0.5];const l=0.15+Math.random()*0.25;a.push(...p,p[0]+d[0]*l,p[1]+d[1]*l,p[2]+d[2]*l);}
 const L=segs(a,color);L.material=new THREE.LineBasicMaterial({color,transparent:true});scene.add(L);fx.push({o:L,life:0.25,max:0.25});}
function tickFx(dt){for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;f.o.material.opacity=Math.max(0,f.life/f.max);if(f.life<=0){scene.remove(f.o);f.o.geometry.dispose();f.o.material.dispose();fx.splice(i,1);}}}
// ---------- mouse sensitivity (1-100 %, multiplier = value*0.1) ----------
const SENS={val:10,mult:1};
function setSens(v){v=Math.max(1,Math.min(100,Math.round(+v)||10));SENS.val=v;SENS.mult=v*0.1;localStorage.setItem('nfps.sens',v);
 document.querySelectorAll('.msens input').forEach(i=>{if(+i.value!==v)i.value=v;});document.querySelectorAll('.msens .sensOut').forEach(o=>o.textContent=`${v}% – ${SENS.mult.toFixed(1)}x mouse sensitivity`);}
document.querySelectorAll('.msens input').forEach(i=>i.addEventListener('input',()=>setSens(i.value)));
setSens(localStorage.getItem('nfps.sens')||10);
// ---------- input ----------
const keys={};let mouseDown=false,locked=false;const TEST=window.__NFPS_TEST||false;
addEventListener('keydown',e=>{keys[e.code]=true;if(!G)return;if(e.code==='KeyC'&&!e.repeat)startRoll();if(e.code==='Space'&&!e.repeat){if(G.me.roll)cancelRoll();else if(G.me.wj)cancelWallJump();else tryWallJump();}if(e.code==='KeyR')startReload();if(e.code==='Digit1')swap('rifle');if(e.code==='Digit2')swap('pistol');if(e.code==='KeyQ')swap(G.me.w==='rifle'?'pistol':'rifle');});
addEventListener('keydown',e=>{if(e.code==='KeyP'&&G&&G.practice)leavePractice();});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Space'&&G)G.me.noJumpUntilRelease=false;});
addEventListener('mousedown',e=>{if(!G||(e.target.closest&&e.target.closest('.panel')))return;if(!locked&&!TEST){renderer.domElement.requestPointerLock();return;}if(e.button===0){mouseDown=true;G.me.trig=true;}});
addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;$('hint').style.display=locked?'none':'block';$('leave').style.display=(G&&G.practice)?'inline-block':'none';});
addEventListener('mousemove',e=>{if(!G||(!locked&&!TEST))return;const k=0.0022*SENS.mult;G.me.yaw-=e.movementX*k;G.me.pitch=Math.max(-1.5,Math.min(1.5,G.me.pitch-e.movementY*k));});
// ---------- match state ----------
let G=null;
function spawnPos(team,idx){const s=team==='a'?-1:1;const solo=!G||G.order.filter(p=>p.team===team).length<2;return{x:s*30,z:solo?0:(idx?3.5:-3.5),yaw:team==='a'?-Math.PI/2:Math.PI/2};}
function startMatch(m){
 const order=[...m.team_a.map((p,i)=>({...p,team:'a',idx:i})),...m.team_b.map((p,i)=>({...p,team:'b',idx:i}))];
 const mine=order.find(p=>p.id===myId);
 G={mid:m.match_id,order,team:mine.team,idx:mine.idx,players:{},score:{a:0,b:0},round:0,phase:'warmup',phaseT:0,present:new Set([myId]),lastSend:0,ended:false,startAt:performance.now(),shotLog:{},
  me:{id:myId,x:0,y:0,z:0,vy:0,yaw:0,pitch:0,hp:100,dead:false,w:'rifle',ammo:{rifle:30,pistol:12},reloadT:0,lastShot:0,trig:false,ground:true,moveD:0,aimT:0,kick:0,bob:0}};
 for(const p of order)if(p.id!==myId)G.players[p.id]={...p,fig:new Figure(p.team,p.team===G.team),snaps:[],x:0,y:0,z:0,yaw:0,hp:100,dead:false,w:'rifle',anim:'idle',lastShot:{rifle:0,pistol:0},seenAt:0,alive:true};
 respawn();
 const LAG=window.__NFPS_LAG||0;const H=f=>({payload})=>{if(LAG)setTimeout(()=>f(payload),LAG*(0.85+Math.random()*0.3));else f(payload);};   // LAG = test-only simulated one-way latency
 const ch=sb.channel('nfps:'+G.mid,{config:{broadcast:{self:false},presence:{key:myId}}});G.ch=ch;
 ch.on('broadcast',{event:'st'},H(onState)).on('broadcast',{event:'shot'},H(onShot)).on('broadcast',{event:'hp'},H(onHp)).on('broadcast',{event:'ctl'},H(onCtl)).on('broadcast',{event:'roll'},H(onRoll))
   .on('broadcast',{event:'ping'},H(onPing)).on('broadcast',{event:'pong'},H(onPong)).on('broadcast',{event:'ack'},H(onAck))
   .on('presence',{event:'sync'},()=>{const st=ch.presenceState();G.presSynced=true;G.present=new Set(Object.keys(st));G.present.add(myId);})
   .subscribe(s=>{if(s==='SUBSCRIBED'){G.subOK=true;ch.track({t:Date.now()});send('ping',{id:myId,t:nowMs()});}});
 $('menu').style.display='none';$('queue').style.display='none';$('hud').style.display='block';
 if(!TEST)renderer.domElement.requestPointerLock();msg('<span style="font-size:22px">CONNECTING…</span>',30000);
 swap('rifle',true);feed(`Match found — ${order.filter(p=>p.team==='a').map(p=>esc(p.name)).join(' & ')} <span class="ta">vs</span> ${order.filter(p=>p.team==='b').map(p=>esc(p.name)).join(' & ')}`);}
function send(ev,payload){if(G&&G.ch&&G.subOK)G.ch.send({type:'broadcast',event:ev,payload});}
function respawn(){const s=spawnPos(G.team,G.idx);Object.assign(G.me,{x:s.x,z:s.z,y:0,vy:0,yaw:s.yaw,pitch:0,hp:100,dead:false,reloadT:0,ammo:{rifle:30,pistol:12},roll:null,wj:null});
 for(const id in G.players){const p=G.players[id];p.hp=100;p.dead=false;p.snaps=[];p.roll=null;const sp=spawnPos(p.team,p.idx);Object.assign(p,{x:sp.x,y:0,z:sp.z});}}
// ---- match control: one fixed leader (first player of team A) owns the round clock. Phase end times are in the
// leader's clock; every client estimates (leader clock - local clock) with ping/pong, so countdowns line up despite
// latency and clock skew, and each client advances freeze->live on its own when the countdown hits 0 (no message needed).
function nowMs(){return Date.now()+(window.__NFPS_SKEW||0);}           // __NFPS_SKEW: test-only simulated clock skew
function leaderNow(){return nowMs()+(G.off||0);}
function isLeader(){const L0=G.order[0].id;if(G.present.has(L0)||!G.presSynced||performance.now()-G.startAt<8000||(G.players[L0]&&performance.now()-G.players[L0].seenAt<3000))return L0===myId;
 for(const p of G.order)if(G.present.has(p.id))return p.id===myId;return false;}
function onPing(p){if(isLeader())send('pong',{id:p.id,t:p.t,lt:nowMs()});}
function onPong(p){if(p.id!==myId)return;const n=nowMs(),rtt=n-p.t;if(rtt<0||rtt>5000)return;const off=p.lt+rtt/2-n;
 (G.offS=G.offS||[]).push({rtt,off});G.offS.sort((x,y)=>x.rtt-y.rtt);G.offS.length=Math.min(G.offS.length,8);G.off=G.offS[0].off;G.rtt=G.offS[0].rtt;G.offOK=true;}
function onAck(a){if(G.acks&&a.round===G.round)G.acks.add(a.id);}
// endL is always kept in the leader's clock; until ping/pong has measured the offset, take a rough one from the message itself (ignores one-way latency)
function adoptEnd(c){if(c.endL==null)return;if(!G.offOK&&!isLeader())G.off=c.endL-c.rem*1000-nowMs();G.endL=c.endL;}
function alive(team){let n=0;for(const p of G.order){if(p.team!==team)continue;if(p.id===myId){if(!G.me.dead)n++;continue;}const r=G.players[p.id];if(G.present.has(p.id)&&!r.dead)n++;}return n;}
function onCtl(c){if(!G||G.ended)return;if(c.score)G.score=c.score;
 if(c.ev==='round'){send('ack',{id:myId,round:c.round});if(c.round!==G.round){G.round=c.round;G.phase='freeze';adoptEnd(c);respawn();msg(`ROUND ${c.round}`,1500);}}
 else if(c.ev==='rend'&&G.phase!=='post'){G.phase='post';adoptEnd(c);msg(c.winner?`<span class="t${c.winner}">${c.winner===G.team?'ROUND WON':'ROUND LOST'}</span>`:'ROUND DRAW',2500);}
 else if(c.ev==='mend')endMatch(c.winner);
 else if(c.ev==='sync'&&!isLeader()){if(c.round!==G.round&&c.phase!=='post'){G.round=c.round;respawn();if(c.phase==='freeze')msg(`ROUND ${c.round}`,1500);}
  if(!(G.phase==='live'&&c.phase==='freeze'&&c.round===G.round))G.phase=c.phase;adoptEnd(c);}}
function phaseLeft(){return G.endL?(G.endL-leaderNow())/1000:0;}
function clientTick(){G.phaseT=phaseLeft();if(G.phase==='freeze'&&G.phaseT<=0){G.phase='live';G.endL+=ROUND_TIME*1000;G.phaseT=phaseLeft();}  // local fallback, no message needed
 G.pingT=(G.pingT||0)-1;if(G.subOK&&performance.now()-(G.lastPing||0)>((G.offS&&G.offS.length>=3)?3000:500)){G.lastPing=performance.now();send('ping',{id:myId,t:nowMs()});}}
function setEnd(sec){G.endL=leaderNow()+sec*1000;G.phaseT=sec;}
function leaderTick(dt){G.phaseT=phaseLeft();G.off=0;
 if(G.phase==='warmup'){const others=G.order.filter(p=>p.id!==myId);const ready=others.every(p=>G.present.has(p.id)||(G.players[p.id]&&performance.now()-G.players[p.id].seenAt<1500));
  if((G.subOK&&ready&&performance.now()-G.startAt>600)||performance.now()-G.startAt>10000)nextRound();}
 else if(G.phase==='freeze'&&G.phaseT<=0){G.phase='live';setEnd(ROUND_TIME);ctl({ev:'sync'});}
 else if(G.phase==='live'){const a=alive('a'),b=alive('b');let w=null,done=false;
  if(a===0||b===0){done=true;w=a>b?'a':b>a?'b':null;}else if(G.phaseT<=0){done=true;const hp=t=>G.order.filter(p=>p.team===t).reduce((s,p)=>s+(p.id===myId?G.me.hp:G.players[p.id].hp),0);const ha=hp('a'),hb=hp('b');w=ha>hb?'a':hb>ha?'b':null;}
  if(done){if(w)G.score[w]++;setEnd(3);const c={ev:'rend',winner:w};onCtl({...c,endL:G.endL,rem:3});ctl(c);}}
 else if(G.phase==='post'&&G.phaseT<=0){if(G.score.a>=WIN_ROUNDS||G.score.b>=WIN_ROUNDS){const w=G.score.a>=WIN_ROUNDS?'a':'b';ctl({ev:'mend',winner:w});setTimeout(()=>G&&ctl({ev:'mend',winner:w}),400);endMatch(w);}else nextRound();}
 // resend round start until every other player acks it (lost/late packets, sends before subscribe)
 if(G.phase==='freeze'&&G.acks&&performance.now()-G.roundSentAt>350&&G.order.some(p=>p.id!==myId&&!G.acks.has(p.id))&&G.resends<12){G.resends++;G.roundSentAt=performance.now();ctl({ev:'round',round:G.round});}
 G.syncT=(G.syncT||0)-dt;if(G.syncT<=0){G.syncT=0.5;ctl({ev:'sync'});}}
function ctl(c){c.score=G.score;c.round=c.round||G.round;c.phase=c.phase||G.phase;c.endL=G.endL;c.rem=phaseLeft();send('ctl',c);}
function nextRound(){G.round++;G.phase='freeze';setEnd(3);respawn();G.acks=new Set();G.resends=0;G.roundSentAt=performance.now();ctl({ev:'round',round:G.round});msg(`ROUND ${G.round}`,1500);}
// ---------- networking handlers ----------
function onState(s){const p=G&&G.players[s.id];if(!p)return;p.snaps.push({t:performance.now()/1000,x:s.x,y:s.y,z:s.z,yaw:s.yaw,pitch:s.p});if(p.snaps.length>30)p.snaps.shift();
 p.anim=s.a;p.w=s.w;if(!s.rl&&p.roll&&rollT(p.roll)>0.4)p.roll=null;else if(s.rl&&!p.roll&&performance.now()-(p.rollEvAt||0)>1500)p.roll={t0:performance.now()/1000-ROLL.dur};p.seenAt=performance.now();if(s.r===G.round){p.hp=s.hp;p.dead=s.d;}}
function onShot(s){const p=G&&G.players[s.id];if(!p)return;const col=COL[p.team];tracer(s.o,s.e,col);spark(s.e,col);shotSound(s.w,Math.hypot(s.o[0]-G.me.x,s.o[1]-G.me.y-1.6,s.o[2]-G.me.z));p.anim='aim';p.aimT=0.4;
 if(s.hit===myId)validateHit(p,s);else if(s.hit&&G.players[s.hit])spark(s.e,0xffffff);}
function validateHit(p,s){const m=G.me;if(m.dead||G.phase!=='live'||p.dead)return;const W_=WEAP[s.w];if(!W_)return;
 const now=performance.now()/1000;const last=p.lastShot[s.w]||0;if(now-last<W_.rate*0.7)return;p.lastShot[s.w]=now;   // fire-rate limit
 const dx=s.o[0]-p.x,dz=s.o[2]-p.z;if(dx*dx+dz*dz>16)return;                                                   // shot origin must be near shooter's known position
 const tx=m.x-s.o[0],ty=m.y+rollLow(m.roll)-s.o[1],tz=m.z-s.o[2],dist=Math.hypot(tx,ty,tz);if(dist>W_.range)return;
 const d=[tx/dist,ty/dist,tz/dist];if(rayMap(s.o,d,dist)<dist-0.8)return;                                         // line of sight from origin to me
 const dmg=W_.dmg*(s.head?W_.head:1);m.hp=Math.max(0,m.hp-dmg);flashDamage();
 if(m.hp<=0){m.dead=true;feed(`<span class="t${p.team}">${esc(p.name)}</span> ⟶ <span class="t${G.team}">${esc(me.name)}</span>${s.head?' ◎':''}`);}
 send('hp',{id:myId,hp:m.hp,d:m.dead,by:p.id,r:G.round,head:s.head});}
function onHp(h){const p=G&&G.players[h.id];if(!p||h.r!==G.round)return;const was=p.dead;p.hp=h.hp;p.dead=h.d;
 if(h.by===myId)hitMarker(h.d);if(h.d&&!was){const k=h.by===myId?{name:me.name,team:G.team}:G.players[h.by];if(k)feed(`<span class="t${k.team}">${esc(k.name)}</span> ⟶ <span class="t${p.team}">${esc(p.name)}</span>${h.head?' ◎':''}`);}}
// ---------- weapons ----------
function swap(w,force){const m=G.me;if(!force&&m.w===w)return;m.w=w;m.reloadT=0;m.lastShot=performance.now()/1000-0.2;for(const k in vm)vm[k].visible=k===w;}
function startReload(){const m=G.me;if(m.reloadT>0||m.dead)return;if(m.ammo[m.w]>=WEAP[m.w].mag)return;m.reloadT=WEAP[m.w].reload;}
function fire(){const m=G.me,W_=WEAP[m.w];const now=performance.now()/1000;if(m.dead||G.phase!=='live'||m.reloadT>0||now-m.lastShot<W_.rate)return;
 if(m.ammo[m.w]<=0){startReload();return;}m.ammo[m.w]--;m.lastShot=now;m.kick=1;m.aimT=0.4;
 const sp=W_.spread*(keys.ShiftLeft?3:1)*(m.ground?1:2.5);const yaw=m.yaw+(Math.random()-0.5)*sp,pit=m.pitch+(Math.random()-0.5)*sp;
 const d=[-Math.sin(yaw)*Math.cos(pit),Math.sin(pit),-Math.cos(yaw)*Math.cos(pit)],o=[m.x,m.y+EYE*rollLow(m.roll),m.z];
 let t=rayMap(o,d,W_.range),hit=null,head=false;
 for(const id in G.players){const p=G.players[id];if(p.dead||p.team===G.team)continue;const r=rayPlayer(o,d,p);if(r&&r.t<t){t=r.t;hit=id;head=r.head;}}
 const e=[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t];
 const mz=new THREE.Vector3(0.18,-0.16,-0.7).applyMatrix4(camera.matrixWorld);tracer([mz.x,mz.y,mz.z],e,COL[G.team]);spark(e,hit?0xffffff:COL[G.team]);
 const fl=vm[m.w].userData.flash;fl.visible=true;setTimeout(()=>fl.visible=false,45);
 if(G.practice){shotSound(m.w,null);if(hit)practiceHit(G.players[hit],W_.dmg*(head?W_.head:1),head,e);}else shotSound(m.w,null);send('shot',{id:myId,o,e,w:m.w,hit,head});
 // permanent recoil: same rise the old camera kick peaked at, applied to the real aim, never recovered
 const pBefore=m.pitch;m.pitch=Math.max(-1.5,Math.min(1.5,m.pitch+W_.recoil));crossKick(m.pitch-pBefore,W_.rate*0.7);m.yaw+=W_.recoilYaw;if(m.ammo[m.w]===0)startReload();}
// ---------- crosshair recoil lag (display only; aim/camera snap instantly) ----------
// offset (rad, + = below centre) starts at the pitch delta and eases to 0 over 70% of the fire interval (quadratic ease-out)
const XH={start:0,t0:0,dur:0.07};const easeOut=t=>1-(1-t)*(1-t);
function crossOff(){const t=(performance.now()/1000-XH.t0)/XH.dur;return t>=1?0:XH.start*(1-easeOut(Math.max(0,t)));}
function crossKick(d,dur){XH.start=crossOff()+d;XH.t0=performance.now()/1000;XH.dur=dur;}
function crossPx(off){return Math.tan(off)/Math.tan(camera.fov*Math.PI/360)*(innerHeight/2);}
function drawCross(){const off=crossOff();$('cross').style.transform=off?`translateY(${crossPx(off).toFixed(2)}px)`:'';return off;}
// ---------- somersault roll (C) ----------
// 1.3 s: A 0-0.5 s pitch 0 -> -90deg; B 0.5-1.0 s -90 -> -270deg (screen black, invisible to others); C 1.0-1.15 s -270 -> -360deg; then locked slide. 30% lower from phase C until the slide ends. Visual offset only.
const ROLL={dur:1.15,a:0.5,b:1.0,speedMul:3.5,heightMul:0.7,fade:0.05,remoteFade:0.2};
function rollOff(t){if(t<ROLL.a)return -Math.PI/2*(t/ROLL.a);if(t<ROLL.b)return -Math.PI/2-Math.PI*((t-ROLL.a)/(ROLL.b-ROLL.a));return -1.5*Math.PI-Math.PI/2*Math.min(1,(t-ROLL.b)/(ROLL.dur-ROLL.b));}
function rollBlack(t){if(t<ROLL.a||t>=ROLL.b)return 0;return Math.min(1,(t-ROLL.a)/ROLL.fade,(ROLL.b-t)/ROLL.fade);}
function remoteAlpha(t){if(t==null||t<ROLL.a)return 1;if(t<ROLL.b)return 0;return Math.min(1,(t-ROLL.b)/ROLL.remoteFade);}
function easeEye(c,t,dt){if(c==null||t<c)return t;return Math.min(t,c+(1-ROLL.heightMul)*dt/0.1);}
function rollT(r){return r?performance.now()/1000-r.t0:null;}
function rollLow(r){return r&&rollT(r)>=ROLL.b?ROLL.heightMul:1;}
function startRoll(){const m=G.me;if(m.roll||m.wj||!m.ground||m.dead||G.phase==='freeze'||G.phase==='warmup')return;
 m.roll={t0:performance.now()/1000,dx:-Math.sin(m.yaw),dz:-Math.cos(m.yaw)};send('roll',{id:myId,ev:'start',ts:Date.now(),r:G.round});}
function cancelRoll(){const m=G.me;if(!m.roll)return;m.roll=null;m.noJumpUntilRelease=true;m.vy=0;$('black').style.opacity=0;send('roll',{id:myId,ev:'cancel',ts:Date.now(),r:G.round});}
function onRoll(r){const p=G&&G.players[r.id];if(!p)return;p.rollEvAt=performance.now();p.roll=r.ev==='start'?{t0:performance.now()/1000}:null;}
// ---------- audio: synth 'camera shutter' gunfire ----------
const SND={ctx:null,master:null,noise:null,voices:0,maxVoices:8,muted:localStorage.getItem('nfps.mute')==='1',shots:0,nodes:0};
function audioInit(){if(SND.ctx)return SND.ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;const c=new AC();SND.ctx=c;
 const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=8;comp.attack.value=0.002;comp.release.value=0.08;
 SND.master=c.createGain();SND.master.gain.value=SND.muted?0:0.55;SND.master.connect(comp);comp.connect(c.destination);
 const n=c.createBuffer(1,Math.floor(c.sampleRate*0.15),c.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SND.noise=n;
 const crush=new Float32Array(256);for(let i=0;i<256;i++){const x=i/127.5-1;crush[i]=Math.round(x*6)/6;}SND.crush=crush;return c;}
function setMute(m){SND.muted=m;localStorage.setItem('nfps.mute',m?'1':'0');if(SND.master)SND.master.gain.value=m?0:0.55;const b=$('mute');if(b)b.textContent=m?'SOUND: OFF (M)':'SOUND: ON (M)';}
function shotSound(weapon,dist){const c=audioInit();if(!c||SND.muted)return;if(c.state==='suspended')c.resume();
 const vol=dist==null?1:Math.max(0,1/(1+dist/9)-0.02);if(vol<=0.01)return;if(SND.voices>=SND.maxVoices)return;   // voice limit
 SND.voices++;SND.shots++;const t=c.currentTime+0.001,pv=1+(Math.random()-0.5)*0.12,heavy=weapon==='pistol',base=(heavy?0.78:1)*pv;
 const out=c.createGain();out.gain.value=vol*(heavy?1.1:0.8);out.connect(SND.master);let nodes=1;
 const click=(at,freq,q,len,amp,type)=>{const src=c.createBufferSource();src.buffer=SND.noise;const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
  const g=c.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(amp,at+0.0015);g.gain.exponentialRampToValueAtTime(0.001,at+len);src.connect(f);f.connect(g);g.connect(out);src.start(at);src.stop(at+len+0.01);nodes+=3;};
 click(t,3400*base,3.5,0.028,0.9,'bandpass');            // shutter open (mirror slap)
 click(t+0.042*(heavy?1.15:1),5200*base,5,0.018,0.55,'highpass');  // shutter close / second clack
 // FM techno body, bit-crushed
 const car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),ws=c.createWaveShaper(),lp=c.createBiquadFilter(),g=c.createGain();
 car.type='square';car.frequency.setValueAtTime(660*base,t);car.frequency.exponentialRampToValueAtTime(220*base,t+0.07);mod.frequency.value=1320*base;mg.gain.setValueAtTime(900*base,t);mg.gain.exponentialRampToValueAtTime(20,t+0.06);
 ws.curve=SND.crush;lp.type='lowpass';lp.frequency.value=heavy?2600:3600;lp.Q.value=8;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.35,t+0.003);g.gain.exponentialRampToValueAtTime(0.001,t+(heavy?0.1:0.075));
 mod.connect(mg);mg.connect(car.frequency);car.connect(ws);ws.connect(lp);lp.connect(g);g.connect(out);car.start(t);mod.start(t);const end=t+0.11;car.stop(end);mod.stop(end);nodes+=6;SND.nodes+=nodes;
 car.onended=()=>{SND.voices=Math.max(0,SND.voices-1);try{out.disconnect();}catch(e){}};}
addEventListener('keydown',e=>{if(e.code==='KeyM')setMute(!SND.muted);});
addEventListener('pointerdown',()=>{const c=audioInit();if(c&&c.state==='suspended')c.resume();},{capture:true});
// ---------- wall jump ----------
// airborne + within WJ.contact of a blocker + facing it (forward within WJ.maxAngle of the wall's inward normal) + fresh Space press
const WJ={contact:0.12,maxAngle:70,mult:1.4,minBase:5.4,dur:1.0,upV:3.5};
function wallContact(m){let best=null;for(const [nx,nz] of[[1,0],[-1,0],[0,1],[0,-1]]){if(blocked(m.x+nx*WJ.contact,m.z+nz*WJ.contact,m.y)){const fx=-Math.sin(m.yaw),fz=-Math.cos(m.yaw);const dot=fx*nx+fz*nz;if(!best||dot>best.dot)best={nx,nz,dot};}}return best;}
function tryWallJump(){const m=G.me;if(!G||m.dead||m.ground||m.roll||m.wj||G.phase==='freeze'||G.phase==='warmup')return false;const c=wallContact(m);
 if(!c||c.dot<Math.cos(WJ.maxAngle*Math.PI/180))return false;const sp=Math.max(WJ.minBase,m.hv||0)*WJ.mult;
 m.wj={t0:performance.now()/1000,vx:Math.sin(m.yaw)*sp,vz:Math.cos(m.yaw)*sp,sp};m.vy=Math.max(m.vy,WJ.upV);m.noJumpUntilRelease=true;return true;}
function cancelWallJump(){const m=G.me;if(!m.wj)return;m.wj=null;}
// ---------- HUD ----------
let msgTO;function msg(h,ms){$('msg').innerHTML=h;clearTimeout(msgTO);msgTO=setTimeout(()=>$('msg').innerHTML='',ms);}
function feed(h){const d=document.createElement('div');d.innerHTML=h;$('feed').prepend(d);setTimeout(()=>d.remove(),6000);}
function hitMarker(kill){const e=$('hitm');e.style.borderColor=kill?'#f44':'#fff';e.style.opacity=1;setTimeout(()=>e.style.opacity=0,120);}
let dmgFlash=0;function flashDamage(){dmgFlash=1;}
function hud(){const m=G.me;const tc=`t${G.team}`;$('hp').className='glow '+tc;$('ammo').className='glow '+tc;
 $('hp').innerHTML=m.dead?'✕ DOWN':`✚ ${m.hp}`;$('ammo').innerHTML=(m.reloadT>0?'RELOADING ':'')+`${m.ammo[m.w]}<span style="font-size:18px">/${WEAP[m.w].mag} ${m.w.toUpperCase()}</span>`;
 const tm=G.phase==='live'?Math.ceil(G.phaseT):G.phase==='freeze'?Math.ceil(G.phaseT):'';
 if(G.practice){$('score').innerHTML=`<span class="tb">PRACTICE</span> · bot kills ${G.kills} · bot HP ${G.players.bot.hp}<div style="font-size:12px;color:#699">offline · no RP · Esc then LEAVE (or P) to exit</div>`;}else $('score').innerHTML=`<span class="ta">CYAN ${G.score.a}</span> &nbsp;<span style="color:#ff4">${G.phase==='freeze'?'⟳ '+tm:tm}</span>&nbsp; <span class="tb">${G.score.b} MAGENTA</span><div style="font-size:12px;color:#699">ROUND ${G.round||'-'} · first to ${WIN_ROUNDS} · you are ${G.team==='a'?'CYAN':'MAGENTA'}</div>`;
 drawCross();{const pv=(!G.ended&&(PAD.paused||(!locked&&!TEST&&!PAD.active)))?'flex':'none';if($('pause').style.display!==pv)$('pause').style.display=pv;const lv=G.practice?'inline-block':'none';if($('leave').style.display!==lv)$('leave').style.display=lv;}{const rt=rollT(G.me.roll);$('black').style.opacity=rt==null?0:rollBlack(rt).toFixed(3);}document.body.style.boxShadow=dmgFlash>0?`inset 0 0 ${80*dmgFlash}px rgba(255,0,60,${dmgFlash})`:'none';}
// ---------- simulation ----------
function stepMe(dt){const m=G.me;if(keys.ArrowLeft)m.yaw+=dt*2;if(keys.ArrowRight)m.yaw-=dt*2;
 m.reloadT>0&&(m.reloadT-=dt)<=0&&(m.reloadT=0,m.ammo[m.w]=WEAP[m.w].mag);
 const canMove=!m.dead&&G.phase!=='freeze'&&G.phase!=='warmup'&&!PAD.paused;let fx_=0,fz=0,padMag=1;if(canMove){if(keys.KeyW)fz-=1;if(keys.KeyS)fz+=1;if(keys.KeyA)fx_-=1;if(keys.KeyD)fx_+=1;
  if(PAD.active&&!fx_&&!fz&&(PAD.ls[0]||PAD.ls[1])){fx_=PAD.ls[0];fz=PAD.ls[1];padMag=Math.min(1,Math.hypot(fx_,fz));}}
 const sprint=keys.ShiftLeft||keys.ShiftRight||(PAD.active&&PAD.sprint);const sp=(sprint&&fz<0?10.92:5.4)*(m.ground?1:0.9);const l=Math.hypot(fx_,fz)||1;
 let vx=(fx_*Math.cos(m.yaw)+fz*Math.sin(m.yaw))/l*sp*padMag,vz=(-fx_*Math.sin(m.yaw)+fz*Math.cos(m.yaw))/l*sp*padMag;
 let rt=rollT(m.roll);if(m.roll&&m.dead){m.roll=null;rt=null;}
 // after phase C the roll becomes a locked 1.5x slide until a horizontal collision or Space
 if(m.roll){const rs=5.4*(rt>=ROLL.b?ROLL.speedMul:1);vx=m.roll.dx*rs;vz=m.roll.dz*rs;}
 if(m.wj&&(performance.now()/1000-m.wj.t0>=WJ.dur||m.dead))m.wj=null;
 if(m.wj){vx=m.wj.vx;vz=m.wj.vz;}
 m.hv=Math.hypot(vx,vz);
 let hitWall=false;const nSub=Math.max(1,Math.ceil(Math.hypot(vx,vz)*dt/0.15));// substep (<=0.15 m) so fast slides can't tunnel
 for(let i=0;i<nSub;i++){const sdt=dt/nSub;const nx=m.x+vx*sdt;if(!blocked(nx,m.z,m.y))m.x=nx;else if(Math.abs(vx)>1e-6)hitWall=true;const nz=m.z+vz*sdt;if(!blocked(m.x,nz,m.y))m.z=nz;else if(Math.abs(vz)>1e-6)hitWall=true;if(hitWall&&m.roll&&rollT(m.roll)>=ROLL.dur)break;}
 if(m.roll&&hitWall&&rt>=ROLL.dur){m.roll=null;rt=null;send('roll',{id:myId,ev:'end',ts:Date.now(),r:G.round});}
 if(canMove&&keys.Space&&m.ground&&!m.roll&&!m.noJumpUntilRelease){m.vy=7.2;m.ground=false;}
 m.vy-=21*dt;let ny=m.y+m.vy*dt;const g=surfH(m.x,m.z,m.y);
 for(const b of solids){if(m.vy>0&&m.x>b.x0-PR&&m.x<b.x1+PR&&m.z>b.z0-PR&&m.z<b.z1+PR&&m.y+PH<=b.y0+0.01&&ny+PH>b.y0){ny=b.y0-PH;m.vy=0;}}
 if(ny<=g){ny=g;m.vy=0;m.ground=true;}else if(m.ground&&m.vy<=0&&m.y-g<0.5){ny=g;m.vy=0;}else m.ground=false;
 m.y=ny;const mv=Math.hypot(vx,vz)*dt;m.moveD+=mv;m.bob+=mv*1.6;
 if(m.trig||((mouseDown||(PAD.active&&PAD.rt>0.5&&!PAD.paused))&&WEAP[m.w].auto)){fire();}m.trig=false;
 m.aimT=Math.max(0,m.aimT-dt);m.kick=Math.max(0,m.kick-dt*9);
 camera.position.set(m.x,m.y+(m.dead?0.35:EYE*(m.eyeMul=easeEye(m.eyeMul,rollLow(m.roll),dt)))+(m.ground&&!m.roll?Math.sin(m.bob*2.2)*0.03:0),m.z);camera.rotation.set(m.pitch+(m.roll&&rt<ROLL.dur?rollOff(rt):0),m.yaw,m.dead?0.5:0);
 const st_=performance.now()/1000,swX=Math.sin(st_*2*Math.PI*0.23)*0.002,swY=Math.sin(st_*2*Math.PI*0.31+1.1)*0.0015,swR=Math.sin(st_*2*Math.PI*0.27)*0.003;G.sway={x:swX,y:swY,r:swR};
 for(const k in vm){const g_=vm[k];const rel=m.reloadT>0?Math.sin(Math.min(1,1-m.reloadT/WEAP[k].reload)*Math.PI):0;
  g_.position.set(0.17+swX+Math.sin(m.bob)*0.012,-0.2+swY-rel*0.18+Math.abs(Math.cos(m.bob))*0.01,(k==='rifle'?-0.38:-0.42)+m.kick*0.05);g_.rotation.set(m.kick*0.08-rel*0.6+swR*0.5,0.04+swR,rel*0.3+swR*0.6);g_.visible=k===m.w&&!m.dead;}
 const now=performance.now();if(now-G.lastSend>1000/NET_HZ){G.lastSend=now;
  send('st',{id:myId,x:+m.x.toFixed(3),y:+m.y.toFixed(3),z:+m.z.toFixed(3),yaw:+m.yaw.toFixed(3),p:+m.pitch.toFixed(3),a:m.dead?'dead':m.aimT>0?'aim':mv>0.001?(Math.floor(m.moveD/0.9)%2?'run1':'run2'):'idle',w:m.w,hp:m.hp,d:m.dead,r:G.round,rl:m.roll?1:0});}}
function stepRemote(dt){const rt=performance.now()/1000-INTERP;
 for(const id in G.players){const p=G.players[id],S=p.snaps;if(S.length){let a=S[0],b=S[S.length-1];for(let i=0;i<S.length-1;i++){if(S[i].t<=rt&&S[i+1].t>=rt){a=S[i];b=S[i+1];break;}}
   if(rt>=b.t){p.x=b.x;p.y=b.y;p.z=b.z;p.yaw=b.yaw;}else{const k=b.t>a.t?(rt-a.t)/(b.t-a.t):1;p.x=a.x+(b.x-a.x)*k;p.y=a.y+(b.y-a.y)*k;p.z=a.z+(b.z-a.z)*k;p.yaw=a.yaw+(b.yaw-a.yaw)*k;}}
  p.aimT=Math.max(0,(p.aimT||0)-dt);const pose=p.dead?'dead':(p.aimT>0?'aim':p.anim==='dead'?'idle':p.anim||'idle');
  const f=p.fig;f.g.position.set(p.x,p.y,p.z);const cx=camera.position.x-p.x,cz=camera.position.z-p.z;f.g.rotation.y=Math.atan2(cx,cz);
  // facing: is the player's forward to the camera's right or left?
  const fwx=-Math.sin(p.yaw),fwz=-Math.cos(p.yaw);const rx=cz,rz=-cx;const side=(fwx*rx+fwz*rz)>=0?-1:1;
  const prt=rollT(p.roll);f.g.scale.setScalar(rollLow(p.roll));f.setAlpha(p.roll?remoteAlpha(prt):1);
  f.set(pose,side,p.w||'rifle');f.g.visible=G.present.has(id)||performance.now()-p.seenAt<3000;}}
// ---------- gamepad support ----------
// Classification by vendor id (Chrome "Vendor: 054c Product: 0ce6", Firefox "054c-0ce6-...") + name strings.
const PS_PRODUCTS={'0ce6':'PS5 DualSense','0df2':'PS5 DualSense Edge','05c4':'PS4 DualShock 4','09cc':'PS4 DualShock 4','0ba0':'PS4 DualShock 4 adapter','0268':'PS3 DualShock 3'};
const THIRD={'2e95':'Scuf','1532':'Razer','20d6':'PowerA','0e6f':'PDP','0f0d':'Hori','146b':'Nacon','3285':'Nacon','10f5':'Turtle Beach','2c22':'Turtle Beach','0738':'Mad Catz','2dc8':'8BitDo','044f':'Thrustmaster'};
const PS_NAME=/dualsense|dualshock|playstation|wireless controller|\bps[345]\b|raiju|kishi.*ps|sony/i, XB_NAME=/xbox|xinput|x-box|wolverine|elite|microsoft/i;
function classifyPad(id){id=String(id||'');let ven=null,prod=null;let mm=id.match(/vendor:\s*([0-9a-f]{4})\s*product:\s*([0-9a-f]{4})/i)||id.match(/^([0-9a-f]{4})-([0-9a-f]{4})-/i);if(mm){ven=mm[1].toLowerCase();prod=mm[2].toLowerCase();}
 const brand=ven&&THIRD[ven]||(/scuf/i.test(id)?'Scuf':/razer/i.test(id)?'Razer':null);
 let style,label;
 if(ven==='054c'||(!XB_NAME.test(id)&&PS_NAME.test(id))){style='ps';const model=(ven==='054c'&&PS_PRODUCTS[prod])||(/edge/i.test(id)?'PS5 DualSense Edge':/dualsense/i.test(id)?'PS5 DualSense':/dualshock\s*4|ps4/i.test(id)?'PS4 DualShock 4':'PlayStation');
  label=(brand?brand+' ':'')+(model.startsWith('PS5')?'PS5':model.startsWith('PS4')?'PS4':model.startsWith('PS3')?'PS3':'PlayStation')+' controller'+(model.includes('Edge')?' (DualSense Edge)':'');}
 else if(ven==='045e'||XB_NAME.test(id)){style='xbox';label=(brand?brand+' ':'')+'Xbox controller'+(/elite/i.test(id)?' (Elite)':'');}
 else if(brand){style='xbox';label=brand+' controller (Xbox layout)';}
 else{style='xbox';label='Controller (Xbox layout)';}
 return{style,label,ven,prod};}
const PROMPTS={xbox:{A:'A',B:'B',X:'X',Y:'Y',LT:'LT',RT:'RT',LB:'LB',RB:'RB',L3:'L3',start:'Menu',back:'View'},ps:{A:'Cross',B:'Circle',X:'Square',Y:'Triangle',LT:'L2',RT:'R2',LB:'L1',RB:'R1',L3:'L3',start:'Options',back:'Create'}};
const PAD={active:false,index:-1,info:null,ls:[0,0],rs:[0,0],rt:0,prev:[],sprint:false,paused:false,aa:0,aaTarget:0,lookMul:1,navT:0,focus:0};
const CSENS={val:10,mult:1};
function setCSens(v){v=Math.max(1,Math.min(100,Math.round(+v)||10));CSENS.val=v;CSENS.mult=v*0.1;localStorage.setItem('nfps.csens',v);
 document.querySelectorAll('.csens input').forEach(i=>{if(+i.value!==v)i.value=v;});document.querySelectorAll('.csens .sensOut').forEach(o=>o.textContent=`${v}% – ${CSENS.mult.toFixed(1)}x controller sensitivity`);}
document.querySelectorAll('.csens input').forEach(i=>i.addEventListener('input',()=>setCSens(i.value)));setCSens(localStorage.getItem('nfps.csens')||10);
const PAD_LOOK=3.0;   // rad/s at full deflection, 1.0x
function dz2(x,y,d){const m=Math.hypot(x,y);if(m<d)return[0,0];const k=Math.min(1,(m-d)/(1-d))/m;return[x*k,y*k];}   // radial deadzone, rescaled
let toastTO;function padToast(t){const e=$('padToast');e.textContent=t;e.style.opacity=1;clearTimeout(toastTO);toastTO=setTimeout(()=>e.style.opacity=0,3500);}
function padHelp(){const P=PROMPTS[PAD.info?PAD.info.style:'xbox'];$('padHelp').innerHTML=PAD.active?`<b style="color:#ff4">${esc(PAD.info.label)}</b> · L-stick move · R-stick look · ${P.L3} sprint · ${P.A} jump (again at a wall = wall jump) · ${P.RT} shoot · ${P.X} reload · ${P.B} roll · ${P.Y} swap · ${P.start} pause · ${P.back} mute`:'🎮 Press any button on your controller';}
addEventListener('gamepadconnected',e=>{PAD.hint=true;});addEventListener('gamepaddisconnected',e=>{if(e.gamepad&&e.gamepad.index===PAD.index){PAD.active=false;PAD.index=-1;padToast((PAD.info?PAD.info.label:'Controller')+' disconnected');padHelp();}});
// Map to the W3C standard layout. Non-standard (e.g. Firefox/Linux DualSense) gets a best-effort Sony remap.
function readPad(gp){const B=i=>{const b=gp.buttons[i];return b?(typeof b==='object'?(b.value||(b.pressed?1:0)):b):0;};const ax=gp.axes||[];
 if(gp.mapping==='standard'||!PAD.info||PAD.info.style!=='ps')return{b:[...Array(17)].map((_,i)=>B(i)),ax:[ax[0]||0,ax[1]||0,ax[2]||0,ax[3]||0]};
 const b=new Array(17).fill(0);b[0]=B(1);b[1]=B(2);b[2]=B(0);b[3]=B(3);b[4]=B(4);b[5]=B(5);b[6]=Math.max(B(6),((ax[3]||-1)+1)/2);b[7]=Math.max(B(7),((ax[4]||-1)+1)/2);b[8]=B(8);b[9]=B(9);b[10]=B(10);b[11]=B(11);
 const hy=ax[7]||0,hx=ax[6]||0;b[12]=hy<-0.5?1:0;b[13]=hy>0.5?1:0;b[14]=hx<-0.5?1:0;b[15]=hx>0.5?1:0;return{b,ax:[ax[0]||0,ax[1]||0,ax[2]||0,ax[5]||0]};}
function key(code,down){window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code}));}
function pollPad(dt){const list=navigator.getGamepads?Array.from(navigator.getGamepads()||[]):[];let gp=PAD.index>=0?list[PAD.index]:null;
 if(!gp||!gp.connected){gp=null;for(const g of list){if(g&&g.connected&&(g.buttons.some(b=>b&&(b.pressed||b.value>0.5))||Math.max(...g.axes.map(Math.abs))>0.5)){gp=g;break;}}   // pad appears/activates on first input
  if(gp){PAD.index=gp.index;PAD.active=true;PAD.info=classifyPad(gp.id);PAD.prev=readPad(gp).b;PAD.swallow=true;padToast(PAD.info.label+' connected');padHelp();}else{if(PAD.active){PAD.active=false;padHelp();}return;}}
 const r=readPad(gp),b=r.b,pr=PAD.swallow?b:PAD.prev;PAD.swallow=false;const edge=i=>b[i]>0.5&&!(pr[i]>0.5),rel=i=>b[i]<=0.5&&pr[i]>0.5;PAD.prev=b;
 PAD.ls=dz2(r.ax[0],r.ax[1],0.15);PAD.rs=dz2(r.ax[2],r.ax[3],0.15);PAD.rt=b[7];
 const inMenu=!G||G.ended||PAD.paused;
 if(inMenu){menuNav(b,edge,dt);if(G&&PAD.paused&&edge(9)){PAD.paused=false;}return;}
 if(edge(9)){PAD.paused=true;PAD.focus=0;return;}
 const map={0:'Space',2:'KeyR',1:'KeyC',3:'KeyQ',8:'KeyM'};for(const i in map){if(edge(+i))key(map[i],true);else if(rel(+i))key(map[i],false);}
 if(edge(10))PAD.sprint=!PAD.sprint;if(Math.hypot(...PAD.ls)<0.2)PAD.sprint=false;
 if(edge(7)&&G)G.me.trig=true;}
function menuNav(b,edge,dt){const panel=[...document.querySelectorAll('.ov')].find(o=>o.style.display!=='none'&&getComputedStyle(o).display!=='none');if(!panel)return;
 const items=[...panel.querySelectorAll('button,input[type=range]')].filter(e=>e.offsetParent!==null);if(!items.length)return;PAD.focus=Math.max(0,Math.min(items.length-1,PAD.focus));
 PAD.navT-=dt;const up=b[12]>0.5||PAD.ls[1]<-0.6,down=b[13]>0.5||PAD.ls[1]>0.6,left=b[14]>0.5||PAD.ls[0]<-0.6,right=b[15]>0.5||PAD.ls[0]>0.6;
 if((up||down||left||right)&&PAD.navT<=0){PAD.navT=PAD.navHeld?0.12:0.4;PAD.navHeld=true;const el=items[PAD.focus];if((left||right)&&el.type==='range'){el.value=+el.value+(right?1:-1);el.dispatchEvent(new Event('input'));}else if(up||down)PAD.focus=(PAD.focus+(down?1:items.length-1))%items.length;}
 if(!(up||down||left||right)){PAD.navT=0;PAD.navHeld=false;}
 items.forEach((e,i)=>e.classList.toggle('padfocus',i===PAD.focus));if(edge(0)&&items[PAD.focus].tagName==='BUTTON')items[PAD.focus].click();if(edge(1)&&G&&PAD.paused)PAD.paused=false;}
// Aim assist: crosshair ray vs the existing hitbox (vertical box/cylinder r=0.42, h=1.82, 70% while rolling low).
// inside: slowdown = 15% + 15%*(1-d), d=|x offset from box centre line|/half-width; outside 0. Controller look only.
function aimAssistTarget(){if(!G)return 0;const m=G.me;const eye=[m.x,m.y+EYE*rollLow(m.roll),m.z];const cy=Math.cos(m.yaw),sy=Math.sin(m.yaw),cp=Math.cos(m.pitch),spp=Math.sin(m.pitch);let best=0;
 for(const id in G.players){const p=G.players[id];if(p.dead||p.team===G.team)continue;if(p.fig&&p.fig.alpha!=null&&p.fig.alpha<0.05)continue;   // invisible (roll phase B)
  const h=1.82*rollLow(p.roll),cx=p.x-eye[0],cz=p.z-eye[2];
  const xr=cx*cy-cz*sy,zr=cx*sy+cz*cy;                 // rotate into yaw frame (forward = -z)
  const depth=-zr;if(depth<=0.1)continue;
  const yb=p.y-eye[1],yt=yb+h;const ybr=yb*cp-depth*spp,ytr=yt*cp-depth*spp;           // vertical extent relative to crosshair ray (approx. at that depth)
  if(!(ybr<=0&&ytr>=0))continue;const d=Math.abs(xr)/0.42;if(d>1)continue;
  const dist=Math.hypot(cx,(yb+yt)/2,cz);const dir=[cx/dist,(yb+yt)/2/dist,cz/dist];if(N_rayMap(eye,dir,dist)<dist-0.5)continue;   // line of sight
  best=Math.max(best,0.15+0.15*(1-Math.min(1,Math.max(0,d))));}
 return best;}
function N_rayMap(o,d,t){return rayMap(o,d,t);}
function padLook(dt){if(!PAD.active||!G||G.ended||PAD.paused)return;PAD.aaTarget=aimAssistTarget();PAD.aa+=(PAD.aaTarget-PAD.aa)*(1-Math.exp(-dt/0.05));
 const curve=v=>Math.sign(v)*Math.pow(Math.abs(v),1.8);PAD.lookMul=CSENS.mult*(1-PAD.aa);const k=PAD_LOOK*PAD.lookMul*dt;const m=G.me;
 m.yaw-=curve(PAD.rs[0])*k;m.pitch=Math.max(-1.5,Math.min(1.5,m.pitch-curve(PAD.rs[1])*k));
 if(DEBUG)$('aadbg').textContent=`AA target ${(PAD.aaTarget*100).toFixed(1)}% · applied ${(PAD.aa*100).toFixed(1)}% · look x${PAD.lookMul.toFixed(2)}`;}
const DEBUG=/[?&]debug\b/.test(location.search);
padHelp();
let last=performance.now();
function loop(){requestAnimationFrame(loop);const now=performance.now();const rdt=Math.min(1,(now-last)/1000),dt=Math.min(0.05,rdt);last=now;
 pollPad(rdt);padLook(dt);
 if(G&&!G.ended){if(G.practice){}else if(isLeader())leaderTick(rdt);else clientTick();stepMe(dt);stepRemote(dt);hud();dmgFlash=Math.max(0,dmgFlash-dt*2);}
 else{const t=now/1000;camera.position.set(Math.cos(t*0.08)*26,9,Math.sin(t*0.08)*18);camera.lookAt(0,1,0);}
 tickFx(dt);render();}
// ---------- match end + reporting ----------
async function endMatch(w){if(!G||G.ended)return;G.ended=true;$('pause').style.display='none';$('black').style.opacity=0;const win=w===G.team;document.exitPointerLock&&document.exitPointerLock();
 $('hud').style.display='none';$('result').style.display='flex';$('rtitle').innerHTML=`<span class="t${w}">${win?'VICTORY':'DEFEAT'}</span>`;$('rtxt').innerHTML=`${G.score.a} – ${G.score.b}<br>Reporting result…`;
 const before=me.rp;let st=null;
 for(let i=0;i<40;i++){try{st=await rpc('nfps_report',{p_id:myId,p_secret:mySecret,p_match:G.mid,p_winner:w});if(st.status!=='pending')break;}catch(e){if(!/too early/.test(e.message)){console.warn(e.message);}}await new Promise(r=>setTimeout(r,1500));}
 await refreshMe();const delta=me.rp-before;window.__nfpsResult={winner:w,team:G.team,status:st&&st.status,before,after:me.rp};
 $('rtxt').innerHTML=`${G.score.a} – ${G.score.b}<br>${st&&st.status==='done'?`<span style="color:#ff4">${delta>=0?'+':''}${delta} RP → ${me.rp} RP</span>`:'Result could not be confirmed by both teams (no RP change).'}`;
 try{G.ch.unsubscribe();}catch(e){}for(const id in G.players)G.players[id].fig.dispose();}
$('back').onclick=()=>{$('result').style.display='none';$('menu').style.display='flex';G=null;refreshMe();};
// ---------- practice (offline, no network, no RP) ----------
function startPractice(){
 G={practice:true,mid:null,order:[{id:myId,name:me.name||'You',team:'a',idx:0},{id:'bot',name:'Practice Bot',team:'b',idx:0}],team:'a',idx:0,players:{},score:{a:0,b:0},round:1,phase:'live',phaseT:0,present:new Set([myId,'bot']),lastSend:0,ended:false,startAt:performance.now(),kills:0,
  me:{id:myId,x:-24,y:0,z:-5.8,vy:0,yaw:-Math.PI/2,pitch:0,hp:100,dead:false,w:'rifle',ammo:{rifle:30,pistol:12},reloadT:0,lastShot:0,trig:false,ground:true,moveD:0,aimT:0,kick:0,bob:0}};
 G.players.bot={id:'bot',name:'Practice Bot',team:'b',idx:0,fig:new Figure('b',false),snaps:[],x:-15,y:0,z:-5.8,yaw:Math.PI/2,hp:100,dead:false,w:'rifle',anim:'idle',lastShot:{},seenAt:performance.now(),alive:true};
 $('menu').style.display='none';$('hud').style.display='block';if(!TEST)renderer.domElement.requestPointerLock();swap('rifle',true);msg('PRACTICE',1500);}
function practiceHit(p,dmg,head,pt){p.hp=Math.max(0,p.hp-dmg);dmgNum(pt,dmg,head);hitMarker(p.hp<=0);
 if(p.hp<=0&&!p.dead){p.dead=true;G.kills++;feed(`<span class="ta">${esc(me.name||'You')}</span> ⟶ <span class="tb">Practice Bot</span>${head?' ◎':''}`);setTimeout(()=>{if(G&&G.practice){p.hp=100;p.dead=false;}},2000);}}
function dmgNum(pt,dmg,head){const v=new THREE.Vector3(...pt).project(camera);if(v.z>1)return;const d=document.createElement('div');
 d.textContent=(head?'◎ ':'')+dmg;d.className='glow';d.style.cssText=`position:absolute;left:${(v.x+1)/2*innerWidth}px;top:${(1-v.y)/2*innerHeight}px;color:${head?'#ff4':'#fff'};font:bold ${head?26:20}px Courier New;transition:all .7s ease-out;pointer-events:none`;
 $('hud').appendChild(d);requestAnimationFrame(()=>{d.style.transform='translateY(-40px)';d.style.opacity=0;});setTimeout(()=>d.remove(),750);}
function leavePractice(){if(!G||!G.practice)return;$('black').style.opacity=0;for(const id in G.players)G.players[id].fig.dispose();G=null;document.exitPointerLock&&document.exitPointerLock();for(const k in vm)vm[k].visible=false;
 $('hud').style.display='none';$('pause').style.display='none';$('menu').style.display='flex';refreshMe();}
$('resume').onclick=()=>{PAD.paused=false;if(!PAD.active&&!TEST)renderer.domElement.requestPointerLock();};
$('mute').onclick=()=>setMute(!SND.muted);setMute(SND.muted);
$('practice').onclick=()=>{if(!G)startPractice();};$('leave').onclick=leavePractice;
// ---------- queue ----------
let qTimer=null;
$('play').onclick=async()=>{try{await register();}catch(e){$('me').textContent='Server error: '+e.message;return;}$('menu').style.display='none';$('queue').style.display='flex';$('qtxt').textContent='Joining queue…';poll();};
$('cancel').onclick=async()=>{clearTimeout(qTimer);qTimer=null;$('queue').style.display='none';$('menu').style.display='flex';try{await rpc('nfps_queue_poll',{p_id:myId,p_secret:mySecret,p_leave:true});}catch(e){}};
async function poll(){try{const r=await rpc('nfps_queue_poll',{p_id:myId,p_secret:mySecret,p_leave:false});
  if(r.status==='matched'){qTimer=null;startMatch(r);return;}$('qtxt').innerHTML=`Waiting for players… <b style="color:#ff4">${r.queued}/${r.need||2}</b><br><span style="font-size:12px;color:#699">first come, first served · 1 v 1</span>`;}
 catch(e){$('qtxt').textContent='Queue error, retrying…';console.warn(e.message);}
 qTimer=setTimeout(poll,1500);}
addEventListener('beforeunload',()=>{if(qTimer)navigator.sendBeacon&&0;});
// ---------- boot ----------
fetch('assets/art.json').then(r=>r.json()).then(a=>{ART=a;buildVM();loop();register().catch(e=>{$('me').textContent='offline: '+e.message;});});
window.NFPS={get G(){return G;},PAD,CSENS,setCSens,classifyPad,aimAssistTarget,WJ,SENS,setSens,SND,ROLL,roll:()=>{const m=G.me,t=rollT(m.roll);return{rolling:!!m.roll,t,off:m.roll?rollOff(t):0,camX:camera.rotation.x,pitch:m.pitch,black:+getComputedStyle($('black')).opacity,eyeY:camera.position.y-m.y,x:m.x,z:m.z,y:m.y,vy:m.vy};},cross:()=>{const o=crossOff();return{off:o,px:crossPx(o),dur:XH.dur,t:performance.now()/1000-XH.t0};},camera,swap:w=>swap(w),fire:()=>G&&(G.me.trig=true),keys,rayMap,solids,WEAP};
})();
