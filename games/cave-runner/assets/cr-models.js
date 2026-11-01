/* Cave Runner - procedural hero, wardrobe items, black widow and GPU trails (Lost Aura Games).
   Everything is generated at load from code (no external model files): lathe/extrude/tube geometry
   merged per bone + material to keep draw calls low, PBR (MeshStandard/Physical) materials lit by
   torches plus a tiny procedural environment map. */
(function(){
'use strict';
const T=THREE,PI=Math.PI;
const CRM={};
// ---------------- helpers ----------------
const _q=new T.Quaternion(),_e=new T.Euler(),_v=new T.Vector3(),_s=new T.Vector3();
function M(x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy,sz){if(sy===undefined)sy=sx;if(sz===undefined)sz=sx;return new T.Matrix4().compose(_v.set(x,y,z),_q.setFromEuler(_e.set(rx,ry,rz)),_s.set(sx,sy,sz));}
function mergeGeos(items){let n=0;const parts=[];
 for(const it of items){let g=it.g.index?it.g.toNonIndexed():it.g.clone();if(it.m)g.applyMatrix4(it.m);if(!g.attributes.normal)g.computeVertexNormals();parts.push(g);n+=g.attributes.position.count;}
 const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
 for(const g of parts){const c=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,o*2);o+=c;g.dispose();}
 const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(pos,3));out.setAttribute('normal',new T.BufferAttribute(nor,3));out.setAttribute('uv',new T.BufferAttribute(uv,2));out.computeBoundingSphere();return out;}
CRM.mergeGeos=mergeGeos;CRM.M=M;
class Builder{constructor(){this.b=new Map();}
 add(bone,mk,g,m){const k=bone.uuid+'|'+mk;if(!this.b.has(k))this.b.set(k,{bone,mk,items:[]});this.b.get(k).items.push({g,m:m||null});return this;}
 build(mats){const out=[];for(const {bone,mk,items} of this.b.values()){const mesh=new T.Mesh(mergeGeos(items),mats[mk]);mesh.frustumCulled=false;bone.add(mesh);out.push(mesh);}return out;}}
const V2=(a)=>a.map(p=>new T.Vector2(p[0],p[1]));
const lathe=(pts,seg=16)=>new T.LatheGeometry(V2(pts),seg);
const sph=(r,w=16,h=12,ps=0,pl=PI*2,ts=0,tl=PI)=>new T.SphereGeometry(r,w,h,ps,pl,ts,tl);
const cyl=(a,b,h,s=12,open=false,ts=0,tl=PI*2)=>new T.CylinderGeometry(a,b,h,s,1,open,ts,tl);
const cone=(r,h,s=8)=>new T.ConeGeometry(r,h,s);
const torus=(r,t,rs=8,ts=24,arc=PI*2)=>new T.TorusGeometry(r,t,rs,ts,arc);
const box=(w,h,d)=>new T.BoxGeometry(w,h,d);
const tube=(pts,r,seg=20,rs=8)=>new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(p[0],p[1],p[2]))),seg,r,rs,false);
function taperTube(pts,r0,r1,seg=24,rs=8){const g=tube(pts,1,seg,rs);const p=g.attributes.position,c=new T.CatmullRomCurve3(pts.map(q=>new T.Vector3(q[0],q[1],q[2])));
 // shrink radius along the curve
 const pts2=c.getSpacedPoints(seg);for(let i=0;i<=seg;i++){const r=r0+(r1-r0)*(i/seg);const cen=pts2[i];for(let j=0;j<=rs;j++){const k=i*(rs+1)+j;_v.set(p.getX(k),p.getY(k),p.getZ(k)).sub(cen).multiplyScalar(r).add(cen);p.setXYZ(k,_v.x,_v.y,_v.z);}}
 g.computeVertexNormals();return g;}
function extrude(pts,depth=.012,bevel=.006,holes){const sh=new T.Shape(V2(pts));const g=new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel*.8,bevelSegments:2,curveSegments:8});g.translate(0,0,-depth/2);g.computeVertexNormals();return g;}
function std(o){const m=new T.MeshStandardMaterial(Object.assign({roughness:.7,metalness:0,envMapIntensity:1},o));return m;}
function phys(o){return new T.MeshPhysicalMaterial(Object.assign({roughness:.3,metalness:0,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:1.2},o));}
CRM.std=std;
// ---------------- environment map (procedural, tiny) ----------------
CRM.makeEnv=function(renderer){const s=new T.Scene();s.background=new T.Color(0x050102);
 const em=(c,i)=>new T.MeshBasicMaterial({color:new T.Color(c).multiplyScalar(i)});
 const add=(g,m,x,y,z)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.lookAt(0,0,0);s.add(o);};
 add(new T.PlaneGeometry(2,3),em(0xff2030,6),-4,1.5,0);add(new T.PlaneGeometry(2,3),em(0xff2030,6),4,1.5,-2);add(new T.PlaneGeometry(1.5,2),em(0xff4020,4),0,1,-5);
 add(new T.PlaneGeometry(6,6),em(0x40507a,.6),0,6,0);add(new T.PlaneGeometry(3,2),em(0xffd0b0,2.2),1,2,5);add(new T.PlaneGeometry(10,10),em(0x200406,1),0,-5,0);
 const pm=new T.PMREMGenerator(renderer);const tex=pm.fromScene(s,.03).texture;pm.dispose();return tex;};


// ---------------- GLB MODELS (Blender-built, Draco + WebP; lazy-loaded, code-built fallback) ----------------
const GL={};CRM.GL=GL;
GL.disabled=/[?&]noglb\b/.test(location.search)||typeof T.GLTFLoader!=='function';
GL.lo=/[?&]lo\b/.test(location.search)||(!/[?&]hi\b/.test(location.search)&&((window.matchMedia&&matchMedia('(pointer:coarse)').matches)||Math.min(screen.width,screen.height)<720));
GL.base='assets/models/';GL.cache={};GL.ok={};GL.fail={};let _ldr=null;
function ldr(){if(_ldr)return _ldr;const d=new T.DRACOLoader();d.setDecoderPath('assets/draco/');d.setDecoderConfig({type:'wasm'});_ldr=new T.GLTFLoader();_ldr.setDRACOLoader(d);return _ldr;}
GL.load=function(name){if(GL.disabled)return Promise.resolve(null);const f=name+(GL.lo?'_lo':'')+'.glb';
 if(!GL.cache[f])GL.cache[f]=ldr().loadAsync(GL.base+f).then(g=>{GL.ok[name]=1;return g;}).catch(e=>{GL.fail[name]=String(e&&e.message||e);console.warn('[CR] model fallback:',f);return null;});return GL.cache[f];};
function prepGLB(root){root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;const m=o.material;if(m){m.envMapIntensity=1.15;if(m.map)m.map.anisotropy=4;}}});return root;}

// ---------------- HERO RIG ----------------
function rig(root){const G=(p,x,y,z)=>{const o=new T.Group();o.position.set(x,y,z);p.add(o);return o;};const R={root};
 R.hips=G(root,0,.98,0);R.spine=G(R.hips,0,.1,0);R.chest=G(R.spine,0,.2,0);R.neck=G(R.chest,0,.3,0);R.head=G(R.neck,0,.08,0);
 for(const [k,s] of [['L',-1],['R',1]]){R['sh'+k]=G(R.chest,s*.205,.22,0);R['el'+k]=G(R['sh'+k],0,-.29,0);R['wr'+k]=G(R['el'+k],0,-.265,0);
  R['th'+k]=G(R.hips,s*.095,-.05,0);R['kn'+k]=G(R['th'+k],0,-.45,0);R['an'+k]=G(R['kn'+k],0,-.42,0);}
 R.grip=G(R.wrR,0,-.075,-.01);
 R.cape0=G(R.chest,0,.27,.12);R.cape1=G(R.cape0,0,-.3,0);R.cape2=G(R.cape1,0,-.3,0);
 R.tail0=G(R.spine,0,-.06,.13);R.tail1=G(R.tail0,0,-.25,0);R.tail2=G(R.tail1,0,-.25,0);
 return R;}
const SIDES=[['L',-1],['R',1]];
// base anatomy; o: {skin, suit, glove, boot, eye, face:true}
function baseBody(B,R,o){
 const sk=o.skin||'skin',su=o.suit||'suit';
 // head + face
 B.add(R.head,sk,sph(.108,20,16),M(0,.1,0,0,0,0,.93,1.1,1.02));
 B.add(R.head,sk,sph(.06,12,8),M(0,.035,-.045,0,0,0,1.15,.8,1.1)); // jaw
 B.add(R.head,sk,cone(.017,.05,6),M(0,.095,-.112,-PI/2.3));
 for(const [,s] of SIDES){B.add(R.head,o.eye||'eye',sph(.015,10,8),M(s*.038,.115,-.093));B.add(R.head,sk,box(.04,.008,.02),M(s*.04,.138,-.098,0,0,-s*.15));
  B.add(R.head,sk,sph(.022,8,6),M(s*.103,.1,0,0,0,0,.5,1,.8));}
 B.add(R.neck,sk,cyl(.048,.056,.12,12),M(0,0,0));
 // torso
 B.add(R.chest,su,lathe([[0,-.24],[.14,-.24],[.15,-.14],[.165,-.02],[.19,.1],[.2,.2],[.17,.27],[.08,.31],[0,.31]],20),M(0,0,0,0,0,0,1,1,.66));
 B.add(R.spine,su,lathe([[0,-.1],[.142,-.1],[.137,0],[.143,.1],[0,.1]],18),M(0,0,0,0,0,0,1,1,.7));
 B.add(R.hips,su,lathe([[0,-.13],[.12,-.14],[.158,-.06],[.155,.05],[.14,.1],[0,.1]],18),M(0,0,0,0,0,0,1,1,.72));
 for(const [k,s] of SIDES){
  B.add(R['sh'+k],su,sph(.066,14,10),M(0,0,0));
  B.add(R['sh'+k],su,lathe([[0,.03],[.052,0],[.057,-.08],[.049,-.2],[.041,-.29],[0,-.3]],14));
  B.add(R['el'+k],su,lathe([[0,.02],[.043,0],[.048,-.06],[.04,-.18],[.032,-.26],[0,-.27]],14));
  const gl=o.glove||sk;B.add(R['wr'+k],gl,sph(.042,12,10),M(0,-.045,0,0,0,0,1,1.25,.62));
  B.add(R['wr'+k],gl,torus(.026,.015,6,10,PI*1.1),M(0,-.085,-.01,0,PI/2,PI/2));B.add(R['wr'+k],gl,cyl(.012,.011,.05,6),M(-s*.035,-.05,-.02,.3,0,s*.6));
  B.add(R['th'+k],su,lathe([[0,.04],[.08,0],[.086,-.12],[.072,-.32],[.056,-.45],[0,-.46]],14));
  B.add(R['kn'+k],su,sph(.056,12,8));B.add(R['kn'+k],su,lathe([[0,.02],[.055,0],[.063,-.1],[.05,-.25],[.038,-.42],[0,-.43]],14));
  const bt=o.boot||su;B.add(R['an'+k],bt,sph(.06,14,10),M(0,-.035,-.05,0,0,0,.95,.68,2.0));B.add(R['an'+k],bt,box(.105,.022,.26),M(0,-.072,-.05));}
}
// clothing helpers
function boots(B,R,mk,h=.24,cuffMk){for(const [k] of SIDES){B.add(R['kn'+k],mk,lathe([[0,-.44],[.064,-.44],[.066,-.32],[.07,-.44+h],[.062,-.44+h],[0,-.44+h]],16));
 B.add(R['an'+k],mk,sph(.066,16,10),M(0,-.03,-.055,0,0,0,1,.75,2.05));B.add(R['an'+k],mk,box(.115,.03,.28),M(0,-.075,-.055));
 if(cuffMk)B.add(R['kn'+k],cuffMk,torus(.071,.012,6,20),M(0,-.44+h,0,PI/2));}}
function gloves(B,R,mk,cuff=.06){for(const [k] of SIDES){B.add(R['el'+k],mk,lathe([[0,-.27+cuff],[.047,-.27+cuff],[.045,-.27],[0,-.27]],14));B.add(R['wr'+k],mk,sph(.046,12,10),M(0,-.045,0,0,0,0,1,1.25,.68));}}
function belt(B,R,mk,bmk,y=-.07,r=.158){B.add(R.spine,mk,torus(r,.024,8,28),M(0,y,0,PI/2,0,0,1,.72,1));if(bmk)B.add(R.spine,bmk,box(.07,.055,.02),M(0,y,-.118));}
function hood(B,R,mk,r=.15){B.add(R.head,mk,sph(r,22,14,PI*1.5+.75,PI*2-1.5,0,PI*.72),M(0,.11,.012,0,0,0,1,1.12,1.08));
 B.add(R.head,mk,cone(.1,.16,10),M(0,.17,.11,-.9,0,0));B.add(R.chest,mk,lathe([[.12,.33],[.2,.27],[.24,.2],[.2,.18],[0,.2]],18),M(0,0,0,0,0,0,1,1,.8));}
function capeChain(B,R,mk,w=[.36,.42,.48],bones=['cape0','cape1','cape2'],len=.31,tatter){bones.forEach((b,i)=>{const g=cyl(.32,.32,len,10,true,-w[i]*1.2,w[i]*2.4);
 B.add(R[b],mk,g,M(0,-len/2,-.3));
 if(tatter&&i===bones.length-1)for(let t=-2;t<=2;t++)B.add(R[b],mk,cone(.05,.14,4),M(t*.1,-len-.06,.015,PI,0,0,1,1,.25));});}
function pauldron(B,R,mk,sc=1,layers=2,trimMk){for(const [k,s] of SIDES){for(let l=0;l<layers;l++){B.add(R['sh'+k],mk,sph(.105*sc-l*.012,18,10,0,PI*2,0,PI*.55),M(s*.02,.035-l*.055,0,0,0,-s*(.35+l*.15),1.05,.85,1));
 if(trimMk)B.add(R['sh'+k],trimMk,torus(.088*sc-l*.012,.008,5,20),M(s*.02+s*.03*l,.0-l*.055,0,PI/2,-s*(.35+l*.15),0));}}}

// ---------------- OUTFITS ----------------
const OUT={};
OUT.wanderer=(B,R)=>{baseBody(B,R,{suit:'leather',glove:'dark',boot:'dark'});boots(B,R,'dark',.26,'brass');gloves(B,R,'dark');
 for(const [k] of SIDES)for(let i=0;i<3;i++)B.add(R['el'+k],'cloth',torus(.046-i*.002,.009,5,16),M(0,-.08-i*.05,0,PI/2,0,i*.3));
 belt(B,R,'dark','brass');for(const x of[-.12,.12,.06])B.add(R.spine,'leather',box(.06,.07,.04),M(x,-.11,x>0?-.09:-.08,0,0,0));
 B.add(R.chest,'dark',torus(.2,.016,6,30),M(0,.05,0,PI/2,.0,-.75,1,.62,1));hood(B,R,'cloth');
 B.add(R.head,'cloth',lathe([[.0,.0],[.105,.0],[.112,.07],[.1,.105],[0,.105]],18),M(0,.0,-.008,0,0,0,1,1,1.02)); // scarf over mouth
 capeChain(B,R,'cloth',[.36,.42,.48],undefined,.31,true);B.add(R.shL,'leather',sph(.09,14,8,0,PI*2,0,PI*.5),M(-.02,.03,0,0,0,.4,1,.8,1));};
OUT.crimson=(B,R)=>{baseBody(B,R,{suit:'black',glove:'black',boot:'black',eye:'glow'});boots(B,R,'black',.3,'silver');gloves(B,R,'black',.09);
 B.add(R.chest,'red',lathe([[0,-.25],[.155,-.25],[.16,-.14],[.175,-.02],[.2,.1],[.21,.2],[.18,.27],[.09,.315],[0,.315]],22),M(0,0,0,0,0,0,1,1,.7));
 B.add(R.hips,'red',lathe([[.16,.06],[.18,-.1],[.22,-.35],[.26,-.6],[.24,-.62],[.2,-.36],[.16,-.1],[.15,.06]],22),M(0,0,0,0,0,0,1,1,.78));
 B.add(R.chest,'red',lathe([[.07,.42],[.11,.4],[.13,.32],[.1,.3],[.07,.38]],18),M(0,0,0,0,0,0,1,1,.9)); // high collar
 for(let i=0;i<4;i++)B.add(R.chest,'silver',sph(.012,8,6),M(.04,-.17+i*.1,-.135));belt(B,R,'black','silver',-.06,.162);
 pauldron(B,R,'black',1,2,'silver');
 B.add(R.head,'black',sph(.112,18,12,PI*1.5-1.2,2.4,PI*.45,PI*.4),M(0,.1,-.004,0,0,0,.95,1.1,1.04)); // mask over lower face
 B.add(R.head,'red',lathe([[0,.27],[.08,.26],[.1,.18],[.105,.16],[.24,.155],[.25,.14],[.1,.145],[0,.14]],24),M(0,0,0,-.08)); // wide-brim hat
 B.add(R.head,'black',cyl(.104,.106,.025,20),M(0,.17,0,-.08));
 capeChain(B,R,'red',[.18,.2,.22],['tail0','tail1','tail2'],.25);};
OUT.bone=(B,R)=>{baseBody(B,R,{suit:'dark',glove:'bone',boot:'bone',eye:'iceglow'});boots(B,R,'bone',.2);
 for(let i=0;i<6;i++)B.add(R.chest,'bone',torus(.165+i*.006,.016,6,20,PI*.95),M(0,.18-i*.065,-.015,0,PI/2+PI*.025,PI/2,1,1,.75));
 B.add(R.chest,'bone',box(.035,.4,.03),M(0,-.0,-.145));for(let i=0;i<5;i++)B.add(R.chest,'bone',cone(.03,.12,5),M(0,.22-i*.1,.13,PI/2.6));
 B.add(R.head,'bone',sph(.13,22,16),M(0,.11,0,0,0,0,.98,1.05,1.08));for(const [,s] of SIDES){B.add(R.head,'socket',sph(.033,10,8),M(s*.045,.115,-.11,0,0,0,1,.85,.6));B.add(R.head,'iceglow',sph(.012,8,6),M(s*.045,.115,-.125));
  B.add(R.head,'bone',taperTube([[s*.1,.17,0],[s*.2,.25,.04],[s*.26,.38,.08],[s*.22,.5,.14]],.035,.006,20,8));}
 for(let i=-3;i<=3;i++)B.add(R.head,'bone',box(.014,.03,.012),M(i*.016,.03,-.11));
 B.add(R.head,'bone',sph(.07,12,8),M(0,.02,-.04,0,0,0,1.25,.7,1.2));
 for(const [k,s] of SIDES){for(let i=0;i<3;i++)B.add(R['sh'+k],'bone',cone(.045,.2,6),M(s*(.05+i*.02),.06-i*.03,-.04+i*.05,0,0,-s*(.6+i*.25)));B.add(R['sh'+k],'bone',sph(.09,14,8,0,PI*2,0,PI*.5),M(s*.02,.02,0,0,0,-s*.4));
  B.add(R['kn'+k],'bone',sph(.06,12,8,0,PI*2,0,PI*.6),M(0,.01,-.02,-PI/2.3));for(let i=0;i<3;i++)B.add(R['wr'+k],'bone',cone(.01,.07,4),M((i-1)*.02,-.12,-.01,PI));}
 B.add(R.spine,'bone',torus(.15,.03,6,22),M(0,-.08,0,PI/2,0,0,1,.72,1));};
OUT.ninja=(B,R)=>{baseBody(B,R,{suit:'black',glove:'black',boot:'black',eye:'glow'});
 for(const [k] of SIDES){for(let i=0;i<5;i++){B.add(R['el'+k],'wrap',torus(.045-i*.002,.008,5,16),M(0,-.04-i*.045,0,PI/2+.15*(i%2?1:-1)));B.add(R['kn'+k],'wrap',torus(.058-i*.003,.009,5,16),M(0,-.18-i*.045,0,PI/2+.15*(i%2?1:-1)));}
  B.add(R['an'+k],'black',box(.02,.05,.06),M(0,-.04,-.15));}
 B.add(R.head,'black',sph(.118,20,14),M(0,.1,0,0,0,0,.95,1.1,1.04));B.add(R.head,'slit',box(.15,.03,.02),M(0,.118,-.108));
 for(const [,s] of SIDES)B.add(R.head,'glow',sph(.014,8,6),M(s*.038,.118,-.116));
 B.add(R.spine,'silk',torus(.155,.03,6,26),M(0,-.08,0,PI/2,0,0,1,.72,1));B.add(R.spine,'silk',sph(.04,10,8),M(.06,-.08,-.11));
 B.add(R.chest,'silk',lathe([[.07,.37],[.12,.33],[.14,.28],[.1,.27],[.06,.33]],18),M(0,0,0,0,0,0,1,1,.95));
 capeChain(B,R,'silk',[.08,.07,.06],['cape0','cape1','cape2'],.34); // scarf tails
 B.add(R.chest,'lacquer',cyl(.025,.025,.75,10),M(0,.05,.15,0,0,.75));B.add(R.chest,'silk',cyl(.03,.03,.05,10),M(-.12,.18,.15,0,0,.75));
 B.add(R.chest,'steel',cyl(.008,.03,.14,8),M(-.2,.27,.15,0,0,.75));};
OUT.neon=(B,R)=>{baseBody(B,R,{suit:'carbon',glove:'armor',boot:'armor',eye:'cyan'});boots(B,R,'armor',.3,'cyan');gloves(B,R,'armor',.1);
 B.add(R.chest,'armor',lathe([[0,-.2],[.16,-.2],[.175,-.05],[.2,.1],[.212,.2],[.18,.27],[.09,.31],[0,.31]],8),M(0,0,0,0,PI/8,0,1,1,.72));
 for(const y of[-.12,.05,.2])B.add(R.chest,'cyan',torus(.19+(y>.1?.02:0),.006,4,32),M(0,y,0,PI/2,0,0,1,.7,1));
 B.add(R.chest,'cyan',box(.02,.4,.02),M(0,.05,.15));B.add(R.chest,'cyan',box(.14,.02,.02),M(0,.12,-.155));
 B.add(R.head,'armor',sph(.135,8,10),M(0,.11,.0,0,PI/8,0,.98,1.08,1.1));B.add(R.head,'visor',sph(.137,20,10,PI*1.5-.9,1.8,PI*.36,PI*.2),M(0,.11,0,0,0,0,.99,1.08,1.11));
 for(const [,s] of SIDES)B.add(R.head,'armor',extrude([[0,0],[.12,.02],[.02,.12]],.01,.004),M(s*.12,.16,.04,0,s*PI/2,s*.3));
 for(const [k,s] of SIDES){B.add(R['sh'+k],'armor',extrude([[0,0],[.16,.02],[.02,.18]],.02,.006),M(s*.06,.06,0,0,s>0?0:PI,0));pauldron(B,R,'armor',.9,1,'cyan');
  for(const y of[-.1,-.2])B.add(R['sh'+k],'cyan',torus(.052,.005,4,18),M(0,y,0,PI/2));B.add(R['kn'+k],'cyan',sph(.02,8,6),M(0,0,-.06));B.add(R['th'+k],'cyan',torus(.08,.005,4,20),M(0,-.2,0,PI/2));}
 belt(B,R,'armor','cyan');};
OUT.plague=(B,R)=>{baseBody(B,R,{suit:'coat',glove:'leatherT',boot:'coat'});boots(B,R,'coat',.3,'brass');gloves(B,R,'leatherT',.1);
 B.add(R.chest,'coat',lathe([[0,-.25],[.16,-.25],[.165,-.12],[.18,0],[.205,.12],[.21,.22],[.18,.28],[.09,.32],[0,.32]],20),M(0,0,0,0,0,0,1,1,.7));
 B.add(R.hips,'coat',lathe([[.16,.06],[.18,-.15],[.23,-.45],[.27,-.78],[.25,-.8],[.21,-.46],[.16,-.12],[.15,.06]],22),M(0,0,0,0,0,0,1,1,.8));
 B.add(R.chest,'coat',lathe([[.06,.36],[.2,.3],[.3,.15],[.28,.12],[.18,.24],[.06,.3]],22),M(0,0,0,0,0,0,1,1,.85)); // mantle
 B.add(R.head,'leatherT',sph(.115,18,14),M(0,.1,0,0,0,0,.95,1.1,1.04));
 B.add(R.head,'leatherT',taperTube([[0,.09,-.09],[0,.07,-.17],[0,.03,-.26],[0,-.04,-.33]],.055,.008,24,10));for(let i=0;i<3;i++)B.add(R.head,'brass',torus(.05-i*.012,.004,4,16),M(0,.08-i*.025,-.13-i*.055,PI/2.5));
 for(const [,s] of SIDES){B.add(R.head,'glass',sph(.03,14,10,0,PI*2,0,PI*.5),M(s*.048,.125,-.1,-PI/2));B.add(R.head,'brass',torus(.031,.006,5,18),M(s*.048,.125,-.1));}
 B.add(R.head,'coat',lathe([[0,.36],[.1,.35],[.11,.22],[.13,.19],[.3,.17],[.31,.155],[.12,.16],[0,.16]],26),M(0,0,0,-.05));B.add(R.head,'brass',cyl(.112,.112,.02,20),M(0,.205,0,-.05));
 belt(B,R,'leatherT','brass',-.05,.165);for(let i=0;i<5;i++){const a=-1+i*.5;B.add(R.spine,'vial',cyl(.014,.014,.06,8),M(Math.sin(a)*.17,-.11,-Math.cos(a)*.13));}};
OUT.gilded=(B,R)=>{baseBody(B,R,{suit:'mail',glove:'gold',boot:'gold',eye:'eye'});boots(B,R,'gold',.3,'goldD');gloves(B,R,'gold',.11);
 B.add(R.chest,'gold',lathe([[0,-.2],[.165,-.2],[.172,-.08],[.2,.05],[.22,.18],[.2,.26],[.1,.32],[0,.32]],24),M(0,0,0,0,0,0,1,1,.74));
 B.add(R.chest,'goldD',extrude([[0,-.07],[.05,0],[0,.07],[-.05,0]],.01,.004),M(0,.12,-.165));B.add(R.chest,'gem',sph(.02,10,8),M(0,.12,-.175));
 for(let i=0;i<3;i++)B.add(R.hips,'gold',lathe([[.16+i*.02,.02-i*.08],[.18+i*.02,-.06-i*.08],[.17+i*.02,-.065-i*.08],[.15+i*.02,.01-i*.08]],22),M(0,0,0,0,0,0,1,1,.78));
 B.add(R.hips,'tabard',box(.18,.42,.012),M(0,-.25,-.13,.08));B.add(R.hips,'tabard',box(.18,.42,.012),M(0,-.25,.13,-.08));
 pauldron(B,R,'gold',1.3,3,'goldD');
 B.add(R.head,'gold',lathe([[0,.27],[.07,.26],[.12,.22],[.135,.12],[.13,.02],[.12,-.03],[0,-.03]],24),M(0,0,0));B.add(R.head,'tglow',box(.13,.016,.02),M(0,.13,-.128));B.add(R.head,'tglow',box(.018,.08,.02),M(0,.09,-.13));
 B.add(R.head,'tabard',extrude([[-.12,0],[.12,0],[.1,.08],[0,.13],[-.1,.08]],.02,.006),M(0,.25,.0,0,PI/2,0));
 for(const [k] of SIDES){B.add(R['kn'+k],'gold',sph(.07,14,10,0,PI*2,0,PI*.6),M(0,.01,-.02,-PI/2.3));B.add(R['kn'+k],'gold',lathe([[.066,-.05],[.07,-.15],[.06,-.3],[.0,-.3]],16));B.add(R['el'+k],'gold',sph(.05,12,8,0,PI*2,0,PI*.6),M(0,0,.02,PI/2.3));}
 capeChain(B,R,'white',[.38,.44,.5]);};
function outfitMats(id){const S=std;const glow=(c,i=2.5)=>new T.MeshStandardMaterial({color:0x000000,emissive:c,emissiveIntensity:i});
 const skin=S({color:0xc08a6a,roughness:.55}),eye=S({color:0x101010,roughness:.15});
 const base={skin,eye,glow:glow(0xff1830,3),iceglow:glow(0x9feaff,3),cyan:glow(0x00e5ff,2.6),tglow:glow(0xffc040,2.4)};
 const ds=T.DoubleSide;
 const m={
  wanderer:{leather:S({color:0x4a2c18,roughness:.6}),dark:S({color:0x1e140e,roughness:.75}),cloth:S({color:0x2c3a22,roughness:.95,side:ds}),brass:S({color:0xb08a40,metalness:1,roughness:.35})},
  crimson:{black:S({color:0x121014,roughness:.5}),red:S({color:0x8a0c18,roughness:.55,side:ds}),silver:S({color:0xd8d8e0,metalness:1,roughness:.2})},
  bone:{dark:S({color:0x1a1816,roughness:.8}),bone:S({color:0xe4dcc2,roughness:.5}),socket:S({color:0x000000,roughness:1})},
  ninja:{black:S({color:0x0c0c10,roughness:.9}),wrap:S({color:0x3a3a40,roughness:.95}),silk:S({color:0xa00818,roughness:.35,side:ds}),slit:S({color:0x000000}),lacquer:phys({color:0x120404}),steel:S({color:0xc0c4cc,metalness:1,roughness:.15})},
  neon:{carbon:S({color:0x0e1418,roughness:.4,metalness:.5}),armor:S({color:0x1a242c,roughness:.25,metalness:.85}),visor:phys({color:0x02161a,emissive:0x00a8c0,emissiveIntensity:1.2,roughness:.05})},
  plague:{coat:S({color:0x15110f,roughness:.45,side:ds}),leatherT:S({color:0x9a7a52,roughness:.65}),brass:S({color:0xb8903a,metalness:1,roughness:.3}),glass:phys({color:0x203018,emissive:0x40ff70,emissiveIntensity:.5,roughness:.05}),vial:glow(0x50ff40,1.6)},
  gilded:{mail:S({color:0x6a6a70,metalness:.9,roughness:.45}),gold:S({color:0xe0a830,metalness:1,roughness:.22}),goldD:S({color:0x8a5a10,metalness:1,roughness:.35}),gem:phys({color:0x600010,emissive:0xff1030,emissiveIntensity:1.4}),tabard:S({color:0x7a0a14,roughness:.8,side:ds}),white:S({color:0xe8e4da,roughness:.85,side:ds})}};
 return Object.assign({},base,m[id]);}

// ---------------- BLADES (each a unique silhouette) ----------------
function bladeDef(id){const S=std,B=[];const add=(g,mk,m)=>B.push({g,mk,m});let glow=null,len=1;
 const mats={wrap:S({color:0x2a1810,roughness:.9}),guard:S({color:0x3a3a40,metalness:1,roughness:.35})};
 const hilt=(gm='guard',w=.24,pom=true)=>{add(cyl(.02,.022,.2,10),'wrap',M(0,-.02,0));for(let i=0;i<5;i++)add(torus(.023,.004,4,12),'wrap',M(0,-.1+i*.04,0,PI/2));
  add(box(w,.035,.05),gm,M(0,.09,0));if(pom)add(sph(.032,10,8),gm,M(0,-.135,0));};
 if(id==='rusty'){mats.b=S({color:0x7a4a2a,metalness:.7,roughness:.85});hilt('guard',.2);
  add(extrude([[-.045,.1],[.045,.1],[.042,.5],[.05,.55],[.04,.6],[.04,.8],[0,.95],[-.04,.82],[-.045,.62],[-.035,.58],[-.046,.52]],.012,.005),'b');len=.95;}
 else if(id==='steel'){mats.b=S({color:0xd8dde3,metalness:1,roughness:.18});mats.f=S({color:0x8a9098,metalness:1,roughness:.3});hilt('guard',.3);
  add(extrude([[-.04,.1],[.04,.1],[.036,.9],[0,1.05],[-.036,.9]],.01,.006),'b');add(box(.012,.75,.024),'f',M(0,.5,0));add(extrude([[-.15,0],[.15,0],[.17,.03],[0,.02],[-.17,.03]],.03,.006),'guard',M(0,.09,0));len=1.05;}
 else if(id==='obsidian'){mats.b=phys({color:0x07060a,roughness:.05,metalness:.2});mats.e=new T.MeshStandardMaterial({color:0,emissive:0x8a30ff,emissiveIntensity:2.2});glow=0x8a30ff;hilt('b',.16);
  const P=[[-.03,.1],[.05,.1],[.08,.3],[.06,.5],[.09,.65],[.05,.85],[.0,1.05],[-.02,.8],[-.06,.62],[-.03,.45],[-.06,.3]];add(extrude(P,.016,.006),'b');
  add(extrude(P.map(([x,y])=>[x*1.12,y*1.015]),.004,.002),'e',M(0,0,-.002));for(let i=0;i<4;i++)add(cone(.025,.09,5),'b',M(-.07+i*.01,.25+i*.15,0,0,0,.8));len=1.05;}
 else if(id==='bloodfang'){mats.b=S({color:0x2a2228,metalness:1,roughness:.3});mats.e=new T.MeshStandardMaterial({color:0x300000,emissive:0xff1020,emissiveIntensity:2.6});glow=0xff1020;hilt('b',.26);
  const P=[[-.05,.1],[.06,.1]];for(let i=0;i<9;i++){P.push([.075+(i%2?.03:0),.18+i*.09]);}P.push([.02,1.05],[-.05,.95],[-.06,.5]);add(extrude(P,.014,.005),'b');add(box(.018,.78,.03),'e',M(0,.52,0));
  add(cone(.04,.14,5),'b',M(-.12,.08,0,0,0,1.1));add(cone(.04,.14,5),'b',M(.12,.08,0,0,0,-1.1));len=1.05;}
 else if(id==='frost'){mats.b=phys({color:0xb8f4ff,roughness:.05,metalness:0,transparent:true,opacity:.82,emissive:0x2aa8ff,emissiveIntensity:.6});glow=0x40c8ff;hilt('guard',.18);
  add(new T.OctahedronGeometry(.07,0),'b',M(0,.55,0,0,0,0,.9,6.5,.5));for(let i=0;i<7;i++){const y=.2+i*.11,s=i%2?1:-1;add(new T.OctahedronGeometry(.04,0),'b',M(s*.05,y,0,0,0,-s*.5,.7,2.4,.6));}
  for(let i=0;i<4;i++)add(new T.OctahedronGeometry(.03,0),'b',M((i-1.5)*.06,.12,0,0,0,(i-1.5)*.5,.7,2.2,.7));len=1.0;}
 else if(id==='venom'){mats.b=S({color:0x1c3a14,metalness:.8,roughness:.25});mats.e=new T.MeshStandardMaterial({color:0x103000,emissive:0x6aff20,emissiveIntensity:2.2});glow=0x6aff20;hilt('b',.14);
  add(cyl(.018,.02,.55,8),'b',M(0,.35,0));const arc=[];for(let i=0;i<=12;i++){const a=i/12*PI*1.05;arc.push([Math.cos(a)*.34-.34+.02,Math.sin(a)*.3+.62]);}
  const inner=arc.slice().reverse().map(([x,y],i)=>[x*.78-.07,(y-.62)*.6+.66]);add(extrude(arc.concat(inner),.014,.006),'b');add(extrude(arc.map(([x,y])=>[x,y+.012]).concat(arc.slice().reverse().map(([x,y])=>[x*.96,y-.01])),.006,.002),'e',M(0,0,.006));
  for(let i=0;i<3;i++)add(sph(.014,8,6),'e',M(-.55+i*.12,.62+Math.sin((i+1)*.8)*.15-.02,0,0,0,0,1,1.6,1));len=.95;}
 else if(id==='void'){mats.b=phys({color:0x050008,roughness:.15,metalness:.4});mats.e=new T.MeshStandardMaterial({color:0x100018,emissive:0xb040ff,emissiveIntensity:2.6});glow=0xb040ff;hilt('b',.34);
  const P=[[-.06,.1],[.07,.1],[.1,.4],[.16,.6],[.12,.9],[.04,1.3],[-.02,1.1],[-.08,.8],[-.05,.5]];add(extrude(P,.018,.008),'b');
  for(let i=0;i<5;i++)add(box(.03,.05,.03),'e',M(.02+i*.012,.3+i*.17,0,0,0,.4));add(extrude(P.map(([x,y])=>[x*1.08,y*1.01]),.004,.002),'e',M(0,0,-.003));
  add(extrude([[-.22,0],[.22,0],[.26,.08],[0,.03],[-.26,.08]],.03,.008),'b',M(0,.09,0));len=1.3;}
 return {B,mats,glow,len,orb:id==='void',drip:id==='venom'?0x6aff20:(id==='bloodfang'?0xff1020:null)};}

class Hero{
 constructor(root,GLOW){this.root=root;this.R=rig(root);this.GLOW=GLOW;this.outfits={};this.blades={};this.oid=null;this.bid=null;this.cape=[.3,.1,.1];this.capeV=[0,0,0];this.tail=[.2,.1,.1];this.tailV=[0,0,0];this.t=0;
  this.gOut={};this.gBlade={};this.gBones=null;this.glbOn=false;this.act=null;
  this.bodyP=GL.load('hero_body').then(g=>{if(!g)return null;const sc=prepGLB(g.scene);const bones={};sc.traverse(o=>{if(o.isBone)bones[o.name]=o;});
   if(!bones.hips)return null;this.gBones=bones;this.gRest=bones.hips.position.clone();this.gScene=sc;sc.visible=false;this.root.add(sc);
   this.mixer=new T.AnimationMixer(sc);this.clips={};for(const a of g.animations)this.clips[a.name]=a;this._mode();return bones;});}
 _loadOutfit(id){if(this.gOut[id]!==undefined)return;this.gOut[id]=null;
  Promise.all([this.bodyP,GL.load('outfit_'+id)]).then(([bones,g])=>{if(!bones||!g)return;const ms=[];g.scene.traverse(o=>{if(o.isSkinnedMesh)ms.push(o);});
   for(const m of ms){const sk=m.skeleton;const nb=sk.bones.map(b=>bones[b.name]);if(nb.some(b=>!b))return;m.bind(new T.Skeleton(nb,sk.boneInverses.map(x=>x.clone())),m.bindMatrix.clone());}
   for(const m of ms){prepGLB(m);m.visible=false;this.gScene.add(m);}this.gOut[id]=ms;this._mode();});}
 _loadBlade(id){if(this.gBlade[id]!==undefined)return;this.gBlade[id]=null;
  GL.load('blade_'+id).then(g=>{if(!g)return;const b=this.blades[id];if(!b)return;const sc=prepGLB(g.scene);this.gBlade[id]=sc;
   for(const c of b.g.children)if(c.isMesh&&!b.orbs.includes(c))c.visible=false;b.g.add(sc);});}
 _mode(){const on=!!(this.gBones&&this.gOut[this.oid]);this.glbOn=on;
  for(const k in this.outfits)for(const m of this.outfits[k])m.visible=!on&&(k===this.oid);
  for(const k in this.gOut)if(this.gOut[k])for(const m of this.gOut[k])m.visible=on&&(k===this.oid);
  if(this.gScene)this.gScene.visible=on;const par=on?this.gBones.grip:this.R.grip;for(const k in this.blades){const g=this.blades[k].g;if(g.parent!==par)par.add(g);}}
 play(name){if(!this.mixer||!this.clips[name])return;this.mixer.stopAllAction();const a=this.mixer.clipAction(this.clips[name]);a.reset();a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();this.act=a;}
 stopClip(){if(this.mixer)this.mixer.stopAllAction();this.act=null;}
 syncGLB(dt){if(!this.glbOn)return;if(this.act){this.mixer.update(dt);return;}const B=this.gBones,R=this.R;
  for(const n in B){const r=R[n];if(r)B[n].quaternion.copy(r.quaternion);}B.hips.position.set(this.gRest.x,this.gRest.y+(R.hips.position.y-.98),this.gRest.z);}
 setOutfit(id){if(this.oid===id)return;for(const k in this.outfits)for(const m of this.outfits[k])m.visible=(k===id);
  if(!this.outfits[id]){const B=new Builder();(OUT[id]||OUT.wanderer)(B,this.R);this.outfits[id]=B.build(outfitMats(id));}this.oid=id;this._loadOutfit(id);this._mode();}
 setBlade(id){if(this.bid===id)return;for(const k in this.blades)this.blades[k].g.visible=(k===id);
  if(!this.blades[id]){const d=bladeDef(id);const g=new T.Group();const merged=new Map();for(const p of d.B){if(!merged.has(p.mk))merged.set(p.mk,[]);merged.get(p.mk).push({g:p.g,m:p.m});}
   for(const [mk,items] of merged){const mesh=new T.Mesh(mergeGeos(items),d.mats[mk]);mesh.frustumCulled=false;g.add(mesh);}
   let spr=null;if(d.glow){spr=new T.Sprite(new T.SpriteMaterial({map:this.GLOW,color:d.glow,blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:.55}));spr.position.y=d.len*.55;spr.scale.set(.5,d.len*1.3,1);g.add(spr);}
   const orbs=[];if(d.orb){for(let i=0;i<3;i++){const o=new T.Mesh(new T.OctahedronGeometry(.035,0),d.mats.e);g.add(o);orbs.push(o);}}
   (this.glbOn?this.gBones.grip:this.R.grip).add(g);this.blades[id]={g,spr,orbs,d};this._loadBlade(id);}
  this.bid=id;}
 bladeTip(out){const b=this.blades[this.bid];if(!b)return out.set(0,0,0);out.set(0,b.d.len*.8,0);b.g.localToWorld(out);return out;}
 setDim(d){const b=this.blades[this.bid];if(b&&b.spr)b.spr.visible=!d;}
 // p: {ph, amp, swing (sec or <0), lean, idle}
 animate(dt,p){const R=this.R,ph=p.ph,a=p.amp,S=Math.sin(ph),C=Math.cos(ph);this.t+=dt;
  const sm=(x)=>x*x*(3-2*x);
  R.thL.rotation.x=S*.8*a;R.thR.rotation.x=-S*.8*a;
  R.knL.rotation.x=-(.12+1.35*sm(Math.max(0,-C)))*a-(1-a)*.04;R.knR.rotation.x=-(.12+1.35*sm(Math.max(0,C)))*a-(1-a)*.04;
  R.anL.rotation.x=(.25*Math.max(0,-S)-.15*Math.max(0,S))*a;R.anR.rotation.x=(.25*Math.max(0,S)-.15*Math.max(0,-S))*a;
  R.hips.position.y=.98-.035*a+Math.abs(C)*.06*a+(p.idle?Math.sin(this.t*2)*.008:0);R.hips.rotation.y=-S*.1*a;R.hips.rotation.z=C*.03*a;
  R.spine.rotation.x=-.12*a;R.spine.rotation.y=S*.12*a;R.chest.rotation.x=-.06*a+(p.idle?Math.sin(this.t*2)*.015:0);R.chest.rotation.y=S*.1*a;
  R.neck.rotation.x=.16*a;R.head.rotation.y=-(S*.2)*a;
  R.shL.rotation.set(-S*.7*a+.05,0,-.12-.05*a);R.elL.rotation.x=.4+.9*a+S*.25*a;R.wrL.rotation.x=.1;
  if(p.swing>=0){const k=Math.min(1,p.swing/.17),e=1-(1-k)*(1-k)*(1-k);R.shR.rotation.set(2.6-e*2.6,-.2+e*.5,.55-e*1.25);R.elR.rotation.x=.5-e*.3;R.wrR.rotation.x=-.2+e*.4;R.grip.rotation.set(-PI/2+.3,0,0);
   R.chest.rotation.y+=(-.3+e*.7);}
  else{R.shR.rotation.set(.35+S*.25*a,0,.18);R.elR.rotation.x=1.15;R.wrR.rotation.x=0;R.grip.rotation.set(-PI/2-.55,0,0);}
  // cape spring (secondary motion)
  const tgt=[.25+a*.55+Math.sin(ph*2)*.06*a,.12+a*.18,.1+a*.15];for(let i=0;i<3;i++){const f=(tgt[i]-this.cape[i])*60-this.capeV[i]*9;this.capeV[i]+=f*dt;this.cape[i]+=this.capeV[i]*dt;}
  R.cape0.rotation.x=-this.cape[0];R.cape1.rotation.x=-(this.cape[1]+Math.sin(ph*2+1)*.05*a);R.cape2.rotation.x=-(this.cape[2]+Math.sin(ph*2+2)*.08*a);
  const tg2=[.15+a*.6,.1+a*.2,.08+a*.15];for(let i=0;i<3;i++){const f=(tg2[i]-this.tail[i])*50-this.tailV[i]*8;this.tailV[i]+=f*dt;this.tail[i]+=this.tailV[i]*dt;}
  R.tail0.rotation.x=-this.tail[0];R.tail1.rotation.x=-(this.tail[1]+Math.sin(ph*2+1.5)*.06*a);R.tail2.rotation.x=-this.tail[2];
  const b=this.blades[this.bid];if(b){for(let i=0;i<b.orbs.length;i++){const an=this.t*2.4+i*2.1;b.orbs[i].position.set(Math.cos(an)*.16,b.d.len*.6+Math.sin(an*1.3)*.25,Math.sin(an)*.16);b.orbs[i].rotation.set(an,an*1.3,0);}
   if(b.spr)b.spr.material.opacity=.45+.15*Math.sin(this.t*6);}
  this.syncGLB(dt);
 }}
CRM.Hero=Hero;

// ---------------- BLACK WIDOW ----------------
class Widow{
 constructor(GLOW,hi=true){const g=this.g=new T.Group();this.body=new T.Group();g.add(this.body);this.GLOW=GLOW;
  const black=this.mBody=phys({color:0x040404,roughness:.22,metalness:.15,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.6});
  const legM=this.mLeg=std({color:0x070606,roughness:.38,metalness:.2,envMapIntensity:1.3});
  const red=new T.MeshStandardMaterial({color:0x400000,emissive:0xff0a14,emissiveIntensity:2.4,roughness:.3});
  const eyeM=phys({color:0x100000,emissive:0xff1020,emissiveIntensity:1.6,roughness:.02});
  const fangM=phys({color:0x1a0606,roughness:.1,metalness:.3});
  // cephalothorax + abdomen (merged per material)
  const hair=(items,cnt,center,rad,sc)=>{for(let i=0;i<cnt;i++){const th=Math.random()*PI*2,ph=Math.acos(1-Math.random()*1.4);const n=new T.Vector3(Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th));
   const p=n.clone().multiply(rad).add(center);const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n.add(new T.Vector3(0,0,.6)).normalize());items.push({g:cone(.012*sc,.09*sc,3),m:new T.Matrix4().compose(p,q,new T.Vector3(1,1,1))});}};
  const bI=[],rI=[],eI=[],fI=[];
  bI.push({g:sph(.5,28,20),m:M(0,0,0,0,0,0,.92,.55,1.15)});bI.push({g:sph(.34,20,14),m:M(0,.05,-.62,0,0,0,1,.68,.9)}); // thorax + head region
  bI.push({g:cyl(.09,.12,.3,12),m:M(0,.02,.55,PI/2)}); // pedicel
  bI.push({g:sph(1,40,30),m:M(0,.38,1.55,-.35,0,0,1.0,.92,1.22)}); // abdomen
  // hourglass (ventral) + dorsal mark
  rI.push({g:cone(.22,.34,4),m:M(0,-.36,1.5,PI/2-.35,0,0,1,1,.3)});rI.push({g:cone(.22,.34,4),m:M(0,-.15,1.85,-PI/2-.35,0,0,1,1,.3)});
  rI.push({g:sph(.09,10,8),m:M(0,1.25,1.5,0,0,0,1,.4,1.4)});rI.push({g:sph(.06,10,8),m:M(0,1.08,2.05,0,0,0,1,.4,1.2)});
  // eyes: 8
  const ep=[[.07,.22,-.92,.06],[-.07,.22,-.92,.06],[.16,.2,-.86,.042],[-.16,.2,-.86,.042],[.05,.31,-.86,.035],[-.05,.31,-.86,.035],[.2,.29,-.78,.03],[-.2,.29,-.78,.03]];
  for(const [x,y,z,r] of ep)eI.push({g:sph(r,12,10),m:M(x,y,z)});
  // chelicerae + fangs
  for(const s of[-1,1]){bI.push({g:lathe([[0,0],[.08,-.02],[.09,-.15],[.06,-.3],[0,-.34]],12),m:M(s*.09,.06,-.95,.35,0,s*.1)});
   fI.push({g:taperTube([[0,0,0],[0,-.08,-.04],[-s*.02,-.17,0],[-s*.06,-.21,.06]],.03,.004,16,6),m:M(s*.1,-.24,-1.04)});}
  if(hi){hair(bI,140,new T.Vector3(0,.0,0),new T.Vector3(.46,.5,1.05),1);hair(bI,90,new T.Vector3(0,.05,-.6),new T.Vector3(.33,.23,.3),.8);}
  for(const [arr,mat] of [[bI,black],[rI,red],[eI,eyeM],[fI,fangM]]){const m=new T.Mesh(mergeGeos(arr),mat);m.frustumCulled=false;this.body.add(m);}
  this.fangs=[];
  // eye glow
  this.eyeGlow=[];for(const [x,y,z] of ep.slice(0,4)){const s=new T.Sprite(new T.SpriteMaterial({map:GLOW,color:0xff1020,blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:.9}));s.position.set(x,y,z-.04);s.scale.setScalar(.35);this.body.add(s);this.eyeGlow.push(s);}
  // pedipalps
  this.palps=[];for(const s of[-1,1]){const p=new T.Group();p.position.set(s*.2,-.02,-.9);this.body.add(p);const m=new T.Mesh(mergeGeos([{g:lathe([[0,0],[.04,-.02],[.045,-.2],[0,-.24]],8),m:M(0,0,0,PI/2.2)},{g:sph(.05,8,6),m:M(0,-.08,-.22)}]),legM);m.frustumCulled=false;p.add(m);this.palps.push(p);}
  // legs: femur / tibia / metatarsus with bristles
  const segGeo=(len,r0,r1,bristles)=>{const items=[{g:lathe([[0,0],[r0,-.02],[r0*1.08,-len*.3],[r1,-len],[0,-len-.02]],10),m:M(0,0,0,0,0,PI/2)},{g:sph(r0*1.05,10,8)}];
   if(bristles)for(let i=0;i<bristles;i++){const t=Math.random()*len,a=Math.random()*PI*2,r=r0+(r1-r0)*(t/len);items.push({g:cone(.008,.08,3),m:M(t,Math.cos(a)*r,Math.sin(a)*r,a+PI/2,0,-.9,1,1,1)});}
   return mergeGeos(items);};
  this.legs=[];const hipZ=[-.32,-.12,.08,.28],hipX=[.26,.34,.34,.26],ang=[.42,1.05,1.95,2.55],rad=[2.3,1.95,1.95,2.35],L=[[1.25,1.35,.85],[1.05,1.1,.7],[1.0,1.05,.7],[1.25,1.35,.9]];
  for(let p=0;p<4;p++)for(const s of[-1,1]){const hip=new T.Group();hip.position.set(s*hipX[p],.02,hipZ[p]);this.body.add(hip);
   const fem=new T.Group();hip.add(fem);const [l1,l2,l3]=L[p];const mk=(len,r0,r1,par,x)=>{const m=new T.Mesh(segGeo(len,r0,r1,hi?Math.round(len*34):0),legM);m.frustumCulled=false;const gg=new T.Group();gg.position.x=x;par.add(gg);gg.add(m);return gg;};
   const f=mk(l1,.1,.075,fem,0);const kn=mk(l2,.075,.055,fem,l1);const an=mk(l3,.05,.016,kn,l2);
   this.legs.push({s,p,hip,fem,kn,an,l1,l2,l3,rest:new T.Vector3(s*Math.sin(ang[p])*rad[p],0,-Math.cos(ang[p])*rad[p]+hipZ[p]),off:(((p%2)^(s>0?1:0))*.5)+p*.06});}
  this.cyc=0;this.t=0;this.bodyH=.95;this.pose='run';this.p=0;
  this.g.traverse(o=>o.frustumCulled=false);this.gB=null;
  GL.load('widow').then(g=>{if(!g)return;const sc=prepGLB(T.SkeletonUtils.clone(g.scene));const bones={};sc.traverse(o=>{if(o.isBone)bones[o.name]=o;});if(!bones.body)return;
   const map=[[bones.body,this.body]];for(const L of this.legs){const k=L.p+(L.s<0?'L':'R');for(const j of['hip','fem','kn','an'])if(bones[j+k])map.push([bones[j+k],L[j]]);}
   this.palps.forEach((p,i)=>{const b=bones['palp'+(i?'R':'L')];if(b)map.push([b,p]);});
   this.body.traverse(o=>{if(o.isMesh)o.visible=false;});this.g.add(sc);this.gB=map;this.gScene=sc;this.clips=g.animations;});}
 syncGLB(){if(!this.gB)return;for(const [b,o] of this.gB){b.quaternion.copy(o.quaternion);if(o===this.body)b.position.copy(o.position);}}
 // speed in m/s of the gait; mode: 'run' | 'pounce' (k 0..1)
 update(dt,speed,mode,k){this.t+=dt;const stride=2.1;const f=Math.min(7.5,Math.max(.6,speed/stride));this.cyc=(this.cyc+dt*f)%1;
  const bh=this.bodyH,B=this.body;const pk=mode==='pounce'?k:0;
  B.position.y=bh+Math.sin(this.cyc*PI*4)*.05+pk*.6;B.rotation.x=-.06+Math.sin(this.cyc*PI*4+1)*.02-pk*.5;B.rotation.z=Math.sin(this.cyc*PI*2)*.03;
  for(const pp of this.palps){pp.rotation.x=Math.sin(this.t*9+pp.position.x*10)*.3-pk*.8;}
  for(const s of this.eyeGlow)s.material.opacity=.75+.25*Math.sin(this.t*13+s.position.x*20);
  const T0=new T.Vector3();
  for(const L of this.legs){let ph=(this.cyc+L.off)%1;const st=.55;let z,y;
   if(ph<st){const u=ph/st;z=-stride/2+stride*u;y=0;}else{const u=(ph-st)/(1-st);z=stride/2-stride*u;y=Math.sin(u*PI)*.55;}
   T0.copy(L.rest);T0.z+=z;T0.y=y-B.position.y;
   if(pk>0){// legs reach forward and up to grab
    T0.set(L.s*(1.2+L.p*.1),.3+(3-L.p)*.25,-1.6-(3-L.p)*.5+L.p*.6).lerp(T0,1-pk);}
   this.ik(L,T0);}
  this.syncGLB();}
 ik(L,tgt){const hx=L.hip.position.x,hy=L.hip.position.y,hz=L.hip.position.z;const dx=tgt.x-hx,dy=tgt.y-hy,dz=tgt.z-hz;
  L.hip.rotation.y=Math.atan2(-dz,dx);const r=Math.hypot(dx,dz),v=dy;const beta=.55;const a2=L.l2,a3=L.l3;
  const kx=a2+a3*Math.cos(beta),ky=-a3*Math.sin(beta);const L2=Math.hypot(kx,ky),del=Math.atan2(ky,kx);const L1=L.l1;
  const D=Math.min(Math.hypot(r,v),L1+L2-.01),base=Math.atan2(v,r);const cA=Math.max(-1,Math.min(1,(L1*L1+D*D-L2*L2)/(2*L1*D)));const t1=base+Math.acos(cA);
  const Kx=L1*Math.cos(t1),Ky=L1*Math.sin(t1);const phi=Math.atan2(v-Ky,r-Kx);const t2=phi-del;
  L.fem.rotation.z=t1;L.kn.rotation.z=t2-t1;L.an.rotation.z=-beta;}
}
CRM.Widow=Widow;

// ---------------- GPU TRAIL PARTICLES ----------------
const VS=`uniform float uTime,uDist,uLife,uGrav,uMode,uSize,uScale,uWorld;attribute vec3 aV;attribute float aT0,aD0,aSeed;varying float vT,vSeed;
void main(){float age=uTime-aT0;float t=age/uLife;vT=t;vSeed=aSeed;vec3 p=position+aV*age+vec3(0.,.5*uGrav*age*age,0.);p.z+=(uDist-aD0)*uWorld;float sz=uSize*(.7+.6*fract(aSeed*7.13));
 if(uMode==1.){p.x+=sin(age*9.+aSeed*30.)*.06;sz*=1.-t*.6;}else if(uMode==2.){sz*=mix(1.,.5,t);if(p.y<.02){p.y=.02;sz*=1.8;}}else if(uMode==3.){sz*=1.+t*3.;}
 else if(uMode==4.){sz*=.7+.6*sin(aSeed*40.+age*7.);}else if(uMode==5.){p.x+=sin(age*4.+aSeed*20.)*.3*t;p.y+=cos(age*3.+aSeed*10.)*.15*t;sz*=1.+.5*sin(age*8.);}
 else if(uMode==6.){float a=age*5.+aSeed*6.283;p.x+=cos(a)*.4*t;p.y+=sin(a)*.4*t;}
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(t<0.||t>1.)?0.:sz*uScale/max(.1,-mv.z);}`;
const FS=`uniform vec3 uColA,uColB;uniform float uMode;varying float vT,vSeed;
void main(){vec2 c=gl_PointCoord-.5;float d=length(c);float a=smoothstep(.5,0.,d);
 if(uMode==4.){float st=max(1.-abs(c.x)*10.,0.)*max(1.-abs(c.y)*1.6,0.)+max(1.-abs(c.y)*10.,0.)*max(1.-abs(c.x)*1.6,0.);a=max(a*.45,st);}
 if(uMode==2.){a=smoothstep(.5,.2,length(c*vec2(1.7,.9)));}
 if(uMode==1.){a=a*a*1.4+smoothstep(.12,0.,d);}
 vec3 col=mix(uColA,uColB,vT);if(uMode==6.)col=.55+.45*cos(6.283*(vSeed+vT*.6+vec3(0.,.33,.67)));
 float f=1.-vT;if(uMode==1.)f*=f;if(uMode==3.){gl_FragColor=vec4(col,a*f*.7);return;}gl_FragColor=vec4(col*a*f*1.5,a*f);}`;
class Trail{constructor(n){this.n=n;const g=this.geo=new T.BufferGeometry();this.p0=new Float32Array(n*3);this.v=new Float32Array(n*3);this.t0=new Float32Array(n).fill(-1e4);this.d0=new Float32Array(n);const sd=new Float32Array(n);for(let i=0;i<n;i++)sd[i]=Math.random();
  g.setAttribute('position',new T.BufferAttribute(this.p0,3));g.setAttribute('aV',new T.BufferAttribute(this.v,3));g.setAttribute('aT0',new T.BufferAttribute(this.t0,1));g.setAttribute('aD0',new T.BufferAttribute(this.d0,1));g.setAttribute('aSeed',new T.BufferAttribute(sd,1));
  g.boundingSphere=new T.Sphere(new T.Vector3(),1e4);
  this.u={uTime:{value:0},uDist:{value:0},uLife:{value:.8},uGrav:{value:0},uMode:{value:1},uSize:{value:.3},uScale:{value:500},uWorld:{value:1},uColA:{value:new T.Color()},uColB:{value:new T.Color()}};
  this.mat=new T.ShaderMaterial({uniforms:this.u,vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,blending:T.AdditiveBlending});this.pts=new T.Points(g,this.mat);this.pts.frustumCulled=false;this.i=0;this.rate=0;this.style=null;this.dirty=false;}
 setStyle(st){this.style=st;if(!st||!st.mode){this.rate=0;return;}const u=this.u;u.uMode.value=st.mode;u.uLife.value=st.life;u.uGrav.value=st.grav||0;u.uSize.value=st.size;u.uColA.value.setHex(st.a);u.uColB.value.setHex(st.b);this.rate=st.rate;
  const bl=st.mode===3?T.NormalBlending:T.AdditiveBlending;if(this.mat.blending!==bl){this.mat.blending=bl;this.mat.needsUpdate=true;}this.t0.fill(-1e4);this.geo.attributes.aT0.needsUpdate=true;}
 emit(x,y,z,vx,vy,vz,time,dist){const i=this.i;this.i=(i+1)%this.n;this.p0[i*3]=x;this.p0[i*3+1]=y;this.p0[i*3+2]=z;this.v[i*3]=vx;this.v[i*3+1]=vy;this.v[i*3+2]=vz;this.t0[i]=time;this.d0[i]=dist;this.dirty=true;}
 update(time,dist,world,scale){const u=this.u;u.uTime.value=time;u.uDist.value=dist;u.uWorld.value=world;u.uScale.value=scale;
  if(this.dirty){const a=this.geo.attributes;a.position.needsUpdate=a.aV.needsUpdate=a.aT0.needsUpdate=a.aD0.needsUpdate=true;this.dirty=false;}}}
CRM.Trail=Trail;
CRM.TRAILSTYLE={none:null,
 embers:{mode:1,life:.9,size:.16,a:0xffd070,b:0xff2000,rate:70,rise:1.6},
 drip:{mode:2,life:1.1,size:.14,a:0xff1020,b:0x500000,rate:55,grav:-8},
 smoke:{mode:3,life:1.2,size:.38,a:0x2a0a3a,b:0x050008,rate:45,rise:.6},
 frostmist:{mode:4,life:1.0,size:.22,a:0xffffff,b:0x40b8ff,rate:60,rise:.3},
 toxic:{mode:5,life:1.3,size:.2,a:0xc8ff40,b:0x20a010,rate:50,rise:.8},
 wisps:{mode:6,life:1.4,size:.24,a:0xffffff,b:0xffffff,rate:55,rise:.9}};
window.CRM=CRM;
})();
