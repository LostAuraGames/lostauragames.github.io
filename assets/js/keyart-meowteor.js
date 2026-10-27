/* MEOWTEOR key art: hand-placed pixel art drawn in <canvas>.
   A space cat in a bubble helmet hops through the gaps between asteroid-rock pillars,
   trailing sparkly stardust past twinkling stars, a ringed planet and streaking meteors.
   Still frame by default; comes alive on hover / keyboard focus / tap (the pillars scroll,
   the cat makes quick sharp hops through each gap, "+1" pops up, meteors fly by).
   Usage: <canvas class="keyart" data-art="meowteor" width="320" height="180"></canvas>
   Respects prefers-reduced-motion (shows a single "awake" frame instead of animating).
   Loads after keyart-croak.js (and keyart-orbit.js) and extends window.LAGKeyArt.mountAll so site.js mounts it. */
(function(){
'use strict';
var P=window.LAGPixel;
var BONE='#e8dcb5',INK='#05040a';
function mk(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.imageSmoothingEnabled=false;return [c,x];}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(n){n=(n|0)*374761393;n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967296;}
function R(x,a,b,w,h,c){x.fillStyle=c;x.fillRect(a|0,b|0,w|0,h|0);}
function ell(x,cx,cy,rx,ry,c){x.fillStyle=c;for(var y=-ry;y<=ry;y++){var w=Math.round(rx*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry+.25))));x.fillRect(Math.round(cx-w),Math.round(cy+y),w*2+1,1);}}
var BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
function outlined(src,w,h,inner,outer){var o=mk(w+4,h+4),c=o[0],x=o[1];
  var d=src.getContext('2d').getImageData(0,0,w,h).data;function A(i,j){return i>=0&&j>=0&&i<w&&j<h&&d[(j*w+i)*4+3]>0;}
  for(var j=-2;j<h+2;j++)for(var i=-2;i<w+2;i++){if(A(i,j))continue;var n1=A(i-1,j)||A(i+1,j)||A(i,j-1)||A(i,j+1);
    if(n1&&inner){x.fillStyle=inner;x.fillRect(i+2,j+2,1,1);continue;}
    var n2=A(i-2,j)||A(i+2,j)||A(i,j-2)||A(i,j+2)||A(i-1,j-1)||A(i+1,j+1)||A(i-1,j+1)||A(i+1,j-1);if(n2&&outer){x.fillStyle=outer;x.fillRect(i+2,j+2,1,1);}}
  x.drawImage(src,2,2);return c;}
function glow(x,cx,cy,rgb,a,r){var g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba('+rgb+','+(a*.75)+')');g.addColorStop(1,'rgba('+rgb+',0)');x.globalCompositeOperation='lighter';x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);x.globalCompositeOperation='source-over';}

/* ---------- the course (world-space, so it scrolls consistently) ---------- */
var SPD=52,SP=92,COLW=22,X0=150;               // scroll speed px/s, pillar spacing, pillar width, first pillar
var CXF=.30;                                    // cat sits at 30% of the width
function colX(k){return X0+k*SP;}
function gapH(H){return Math.round(H*.43);}
function gapY(k,H){var top=H*.50,bot=H*.64;return Math.round(top+(bot-top)*(.5+.5*Math.sin(k*1.9+.6)*.9+(hash(k*7+3)-.5)*.25));}
function ease(u){return u<=0?0:u>=1?1:u*u*(3-2*u);}
// centre line of the flight path through the gaps
function pathY(wx,H){var k=Math.floor((wx-X0)/SP),a=colX(k),hold=COLW/2+8;var u=(wx-a-hold)/(SP-hold*2);return gapY(k,H)+(gapY(k+1,H)-gapY(k,H))*ease(u);}
// quick sharp hops: a fast rise, then gravity takes over
var HOP=.36;
function hopOff(t){var p=(t/HOP)%1;if(p<0)p+=1;return -6*Math.sin(Math.PI*Math.pow(p,.55));}
function catY(t,W,H){var wx=t*SPD+W*CXF;return pathY(wx,H)+hopOff(t);}
// still frame: the cat has just cleared pillar 2, "+1" popping
function stillT(W){return (colX(2)+COLW/2+9-W*CXF)/SPD;}

/* ---------- the cat (orange tabby in a bubble helmet, facing right) ---------- */
var CAT=[
'...........K...K..',
'..........KOK.KOK.',
'.KK.......KPOKOPK.',
'KOOK.....KOOOOOOOK',
'KOoK.....KOEOOOEOK',
'.KOK.....KOEOOOEOK',
'.KOK.....KLOOPOOLK',
'.KOOKKKKKKLLKLLLK.',
'..KOOoOOoOKLLLLK..',
'..KOOoOOoOOKKKK...',
'..KLOOOOOOOOLK....',
'...KLK.KLK.KLK....',
'....K...K...K.....'];
var CC={K:INK,O:'#ff9a3a',o:'#c8601e',L:'#ffe0b0',P:'#ff7ac8',E:'#1a2a40',W:'#ffffff'};
var CS=2;   // cat pixel size (helmet rim is drawn at full resolution on top)
function catSprite(){var w=CAT[0].length,h=CAT.length,pad=5,o=mk(w*CS+pad*2,h*CS+pad*2),x=o[1];
  // little jetpack on the back
  R(x,pad+4*CS,pad+5*CS,4*CS,3*CS,'#8a92a8');R(x,pad+4*CS,pad+5*CS,4*CS,1,'#e8ecf6');R(x,pad+4*CS,pad+7*CS,4*CS,1,'#555a6a');R(x,pad+5*CS,pad+6*CS,1,1,'#ff4a5a');
  for(var j=0;j<h;j++)for(var i=0;i<w;i++){var ch=CAT[j][i];if(CC[ch])R(x,pad+i*CS,pad+j*CS,CS,CS,CC[ch]);}
  // eye glints
  R(x,pad+11*CS+1,pad+4*CS,1,1,'#ffffff');R(x,pad+15*CS+1,pad+4*CS,1,1,'#ffffff');
  // bubble helmet around the head
  var hx=pad+13.5*CS+1,hy=pad+3.9*CS+1,hr=5.9*CS;
  x.globalAlpha=.16;ell(x,Math.round(hx),Math.round(hy),Math.round(hr),Math.round(hr),'#9fe0ff');x.globalAlpha=1;
  for(var a=0;a<360;a+=1.5){var th=a*Math.PI/180,px=Math.round(hx+Math.cos(th)*hr),py=Math.round(hy+Math.sin(th)*hr);R(x,px,py,1,1,(a>195&&a<285)?'#ffffff':'#bfe6ff');}
  R(x,Math.round(hx-5),Math.round(hy-8),3,1,'#ffffff');R(x,Math.round(hx-7),Math.round(hy-6),1,3,'#ffffff');R(x,Math.round(hx+6),Math.round(hy+3),1,2,'#bfe6ff');
  R(x,Math.round(hx-8),Math.round(hy+hr-1),16,2,'#c8d0e0');R(x,Math.round(hx-8),Math.round(hy+hr+1),16,1,'#8a92a8');  // collar ring
  var c=o[0];return outlined(c,c.width,c.height,null,INK);}

/* ---------- static layers (cached per size) ---------- */
var CACHE={};
function layers(W,H){var k=W+'x'+H;if(CACHE[k])return CACHE[k];var L={};var r=rng(9157);
  // deep space sky, dithered purple bands
  var s=mk(W,H),sx=s[1];var bands=['#04030e','#07061c','#0d0a2c','#160d3a','#200f46','#2b1252','#36145c'];
  for(var y=0;y<H;y++){var f=Math.min(1,y/(H*.85))*(bands.length-1),b=Math.floor(f),fr=f-b;for(var xx=0;xx<W;xx++){var c=(fr*16>BAYER[y&3][xx&3])?bands[Math.min(bands.length-1,b+1)]:bands[b];sx.fillStyle=c;sx.fillRect(xx,y,1,1);}}
  // nebula clouds (soft puffs, pixel-dithered edges)
  for(var n=0;n<46;n++){var cx=r()*W,cy=H*.25+r()*H*.6,rr=6+r()*16;var col=r()<.6?'rgba(110,60,170,':'rgba(70,40,140,';
    for(var yy=-rr;yy<=rr;yy++)for(var x2=-rr;x2<=rr;x2++){var dd=(x2*x2+yy*yy)/(rr*rr);if(dd>1)continue;if(dd>.6&&((x2+yy)&1))continue;sx.fillStyle=col+(.10*(1-dd*.6))+')';sx.fillRect(Math.round(cx+x2),Math.round(cy+yy*.55),1,1);}}
  [[.16,.30,30,'176,76,255'],[.58,.62,36,'255,90,170'],[.86,.28,22,'58,123,255']].forEach(function(q){var g=sx.createRadialGradient(W*q[0],H*q[1],0,W*q[0],H*q[1],q[2]*W/320);g.addColorStop(0,'rgba('+q[3]+',.15)');g.addColorStop(1,'rgba('+q[3]+',0)');sx.fillStyle=g;sx.fillRect(0,0,W,H);});
  L.sky=s[0];
  // ringed blue planet with a sleepy face (as in the game)
  var pr=Math.round(H*.085),pw=pr*5,ph=pr*3,pl=mk(pw,ph),px=pl[1],pcx=pw/2,pcy=ph/2;
  function ringPass(front){for(var a=0;a<720;a++){var th=a/720*Math.PI*2,sy=Math.sin(th);if(front?sy<0:sy>=0)continue;for(var w=0;w<3;w++){var rx=pr*2.05-w,ry=pr*.42-w*.2;R(px,Math.round(pcx+Math.cos(th)*rx),Math.round(pcy+sy*ry),1,1,w===0?'#9fe0ff':w===1?'#5aa0ff':'#2a5adf');}}}
  ringPass(false);
  for(var j=-pr;j<=pr;j++)for(var i=-pr;i<=pr;i++){var d2=i*i+j*j;if(d2>pr*pr)continue;var lit=(i*.6+j*.8)/pr;var cc=lit<-.45?'#7fc0ff':lit<-.05?'#3a7bff':lit<.4?((i^j)&1?'#3a7bff':'#2a5adf'):'#1e3a9a';if(d2>(pr-1)*(pr-1))cc='#0e1a5a';
    if(Math.abs(j-Math.round(pr*.15))<1&&Math.abs(i)<pr*.8&&((i+50)%3===0))cc='#2a5adf';R(px,pcx+i,pcy+j,1,1,cc);}
  // sleepy eyes + smile
  R(px,pcx-pr*.45-1,pcy-1,3,1,'#0e1a5a');R(px,pcx+pr*.45-1,pcy-1,3,1,'#0e1a5a');R(px,pcx-1,pcy+2,3,1,'#0e1a5a');
  ringPass(true);L.planet=pl[0];L.pp={x:Math.round(W*.80-pw/2),y:Math.round(H*.30-ph/2)};
  // far floating rocks (parallax)
  L.rocks=[];for(var m=0;m<7;m++)L.rocks.push({x:r()*W*1.4,y:H*.2+r()*H*.6,s:1+Math.floor(r()*3),d:.18+r()*.2});
  // stars
  L.stars=[];for(var m2=0;m2<80;m2++){var sx2=Math.round(r()*W),sy2=Math.round(r()*H*.88);L.stars.push({x:sx2,y:sy2,s:r()<.16?2:1,p:r()*6.28,c:r()<.4?'#9fc0ff':r()<.5?'#ffd8f0':'#e2c2ff',d:.04+r()*.14});}
  // pillar texture (rock column, 1 px wide strips tiled vertically)
  var pt=mk(COLW,64),ptx=pt[1];var PC=['#4a3a5a','#5e4a6e','#76608a','#8e78a2','#a894bc'];
  for(var yy2=0;yy2<64;yy2++)for(var xx2=0;xx2<COLW;xx2++){var sh=xx2<2?1:xx2<5?3:xx2<9?4:xx2<14?3:xx2<18?2:1;var hn=hash(xx2*131+yy2*977);if(hn<.12)sh=Math.max(0,sh-1);else if(hn>.94)sh=Math.min(4,sh+1);
    if(((xx2+yy2*3)%11===0)&&hash(yy2*5+xx2)<.5)sh=0;R(ptx,xx2,yy2,1,1,PC[sh]);}
  // craters on the column
  [[6,9,3],[13,30,2],[8,47,2],[15,56,3]].forEach(function(q){ell(ptx,q[0],q[1],q[2],Math.max(1,q[2]-1),PC[1]);R(ptx,q[0]-q[2]+1,q[1]-1,q[2],1,PC[0]);R(ptx,q[0],q[1]+1,q[2],1,PC[4]);});
  L.ptex=pt[0];
  // title
  var tw=P.textW('MEOWTEOR',3),t=mk(tw+16,44),tx=t[1];P.text(tx,'MEOWTEOR',8,4,3,'#ffd24a',{glow:'rgba(255,122,200,.95)'});
  var stw=P.textW('A SPACE CAT TAP-FLYER',1);P.text(tx,'A SPACE CAT TAP-FLYER',Math.round((tw+16-stw)/2),31,1,'#e2c2ff',{glow:'rgba(176,76,255,.9)'});L.title=t[0];
  // ground strip (moon rock), tiled
  var gw=64,gh=Math.round(H*.075),g=mk(gw,gh),gx=g[1];var GC=['#b8b4c8','#8e8aa4','#6a6684','#4a4664'];
  for(var y3=0;y3<gh;y3++)for(var x3=0;x3<gw;x3++){var bd=y3<1?0:y3<3?1:y3<6?2:3;var hh=hash(x3*17+y3*313);if(hh<.1&&bd>0)bd--;else if(hh>.9&&bd<3)bd++;R(gx,x3,y3,1,1,GC[bd]);}
  [[10,5,4],[34,7,3],[52,4,2]].forEach(function(q){ell(gx,q[0],q[1],q[2],1,GC[3]);R(gx,q[0]-q[2]+1,q[1]-1,q[2]*2-1,1,GC[1]);});
  L.ground=g[0];L.gh=gh;
  // scanlines + vignette
  var o=mk(W,H),ox=o[1];for(var y6=0;y6<H;y6+=2){ox.fillStyle='rgba(0,0,0,.16)';ox.fillRect(0,y6,W,1);}
  var vg=ox.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.62);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');ox.fillStyle=vg;ox.fillRect(0,0,W,H);L.over=o[0];
  L.cat=catSprite();
  CACHE[k]=L;return L;}

/* ---------- pieces drawn per frame ---------- */
function pillar(x,L,sx,y0,y1,capDown,off){if(y1<=y0)return;var w=COLW;
  for(var y=y0;y<y1;y+=64){var h=Math.min(64,y1-y);var sy=capDown?((y1-y-h)%64):(y-y0)%64;x.drawImage(L.ptex,0,0,w,h,sx,y,w,h);}
  R(x,sx-1,y0,1,y1-y0,INK);R(x,sx+w,y0,1,y1-y0,INK);
  // cap
  var cy=capDown?y1-6:y0;R(x,sx-3,cy-1,w+6,8,INK);R(x,sx-2,cy,w+4,6,'#8e78a2');R(x,sx-2,cy,w+4,1,'#c8b4dc');R(x,sx-2,cy+5,w+4,1,'#4a3a5a');R(x,sx+2,cy+2,w-4,1,'#a894bc');
  // glowing crystal stud on the cap
  R(x,sx+w/2-1,cy+2,2,2,'#3affe0');}
function trail(x,t,W,H,still){var CX=W*CXF;var N=40,D=.028;
  // ribbon (pink / purple / blue / cyan bands that follow the cat's past positions)
  var BC=['#ff7ac8','#b04cff','#3a7bff','#3affe0'];
  for(var i=N;i>=1;i--){var ti=t-i*D,px=Math.round(CX-17-i*D*SPD),py=Math.round(catY(ti,W,H))-1;var a=Math.pow(1-i/N,.8);x.globalAlpha=a*.9;
    for(var bb=0;bb<4;bb++)R(x,px,py-4+bb*2,3,2,BC[bb]);}
  x.globalAlpha=1;
  // stardust sparkles scattered along it
  var fr=still?3:Math.floor(t*12);
  for(var k=0;k<30;k++){var i2=1+k*1.25;var ti2=t-i2*D;var jx=(hash(k*31+fr*7)-.5)*8,jy=(hash(k*17+fr*13)-.5)*18;
    var px2=Math.round(CX-16-i2*D*SPD+jx),py2=Math.round(catY(ti2,W,H)+jy);var tw=hash(k*97+fr);if(tw<.25)continue;
    var col=k%4===0?'#ffffff':k%4===1?'#ffd24a':k%4===2?'#ffb0e0':'#9fe0ff';x.globalAlpha=Math.max(.3,1-k/34);
    if(tw>.72&&k<18){R(x,px2-2,py2,5,1,col);R(x,px2,py2-2,1,5,col);R(x,px2,py2,1,1,'#ffffff');}else if(tw>.5)R(x,px2,py2,2,2,col);else R(x,px2,py2,1,1,col);}
  x.globalAlpha=1;}
function meteor(x,mx,my,len,a){mx=Math.round(mx);my=Math.round(my);glow(x,mx+1,my+1,'255,160,60',a*.8,9);
  for(var q=0;q<len;q++){x.globalAlpha=a*(1-q/len);var c=q<3?'#fff2c2':q<7?'#ffd24a':q<13?'#ff8a3a':'#ff4a5a';var sz=q<6?3:q<14?2:1;R(x,Math.round(mx+2+q*1.7),Math.round(my-q*.95),sz,sz,c);}
  x.globalAlpha=a;R(x,mx-1,my-1,5,5,INK);R(x,mx,my,3,3,'#6a4a3a');R(x,mx,my,2,1,'#b08a6a');R(x,mx+2,my+2,1,1,'#3a2a20');x.globalAlpha=1;}

/* ---------- frame renderer ---------- */
function draw(cv,t,awake,opts){var W=cv.width,H=cv.height,x=cv.getContext('2d');x.imageSmoothingEnabled=false;var L=layers(W,H);
  var still=!awake||(opts&&opts.still);var T=stillT(W)+(still?0:t);var scroll=T*SPD;var moving=awake&&!still;
  x.drawImage(L.sky,0,0);
  // stars
  for(var i=0;i<L.stars.length;i++){var s=L.stars[i];var a=awake?(Math.sin(t*2.6+s.p)+1)/2:.55+.4*Math.sin(s.p);if(a<.2)continue;var sx=s.x;if(moving)sx=((s.x-t*SPD*s.d)%W+W)%W;sx=Math.round(sx);
    x.globalAlpha=a;x.fillStyle=a>.8?'#ffffff':s.c;var l=s.s+(a>.78?1:0);if(l>1){x.fillRect(sx-l,s.y,l*2+1,1);x.fillRect(sx,s.y-l,1,l*2+1);}else x.fillRect(sx,s.y,1,1);}x.globalAlpha=1;
  // planet (slow drift + bob)
  var pdx=moving?-((t*2)%W):0,pby=moving?Math.round(Math.sin(t*1.2)):0;x.drawImage(L.planet,Math.round(L.pp.x+pdx),L.pp.y+pby);
  // far floating rocks
  for(var r2=0;r2<L.rocks.length;r2++){var rk=L.rocks[r2];var rx=((rk.x-scroll*rk.d)%(W*1.4)+W*1.4)%(W*1.4)-W*.2;var rs=rk.s;R(x,rx-1,rk.y-1,rs+3,rs+2,'#1a1230');R(x,rx,rk.y,rs+1,rs,'#3a2e58');R(x,rx,rk.y,1,1,'#5e4a8a');}
  // meteors (one fixed in the still frame, a stream of them while awake)
  if(!moving)meteor(x,W*.47,H*.40,24,.95);
  else{for(var m=0;m<2;m++){var mp=((t*.38+m*.5)%1.25);if(mp>1)continue;var mx=W*(1.05-mp*.9)+m*40,my=H*(.02+mp*.42)+m*12;meteor(x,mx,my,24,Math.min(1,(1-mp)*2.2));}}
  // pillars
  var gh=gapH(H),groundY=H-L.gh;var k0=Math.floor((scroll-X0-COLW)/SP);
  for(var k=k0;k<k0+6;k++){var csx=Math.round(colX(k)-scroll);if(csx<-COLW-4||csx>W+4)continue;var gy=gapY(k,H);var top=gy-gh/2,bot=gy+gh/2;
    pillar(x,L,csx,0,Math.round(top),true);pillar(x,L,csx,Math.round(bot),groundY,false);}
  // ground strip
  var go=Math.floor(scroll)%64;for(var gx=-go;gx<W;gx+=64)x.drawImage(L.ground,gx,groundY);R(x,0,groundY-1,W,1,INK);
  // sparkly trail + cat
  trail(x,T,W,H,!moving);
  var CX=Math.round(W*CXF),cy=catY(T,W,H),vy=(catY(T+.02,W,H)-cy)/.02;var ang=Math.max(-.45,Math.min(.6,vy/220));
  // jet flame under the jetpack right after a hop
  var hp=((T/HOP)%1);if(hp<.35){var fl=moving?(1-hp/.35):.7;x.save();x.translate(CX,Math.round(cy));x.rotate(ang);R(x,-8,8,3,Math.round(2+fl*5),'#ffd24a');R(x,-8,8,3,1,'#ffffff');if(fl>.4)R(x,-7,Math.round(10+fl*4),2,2,'#ff8a3a');x.restore();}
  x.save();x.translate(CX,Math.round(cy));x.rotate(ang);var C=L.cat;x.drawImage(C,-Math.round(C.width/2),-Math.round(C.height/2));x.restore();
  // helmet glint
  if(moving&&(t%2.4)<.25){glow(x,CX+6,Math.round(cy)-6,'255,255,255',.9,5);}
  // "+1" pop after clearing each gap
  var catW=scroll+W*CXF,kp=Math.floor((catW-X0-COLW/2)/SP),since=(catW-(colX(kp)+COLW/2))/SPD;var score=Math.max(0,kp+1)+12;
  if(since>=0&&since<.75){var fa=1-since/.75;x.globalAlpha=Math.min(1,fa*1.8);P.text(x,'+1',CX+10,Math.round(cy-30-(1-fa)*10),2,'#ffffff',{glow:'rgba(255,210,74,.9)'});x.globalAlpha=1;}
  // score counter (bottom-left, like the game's HUD)
  P.text(x,String(score),8,7,2,'#ffffff',{glow:'rgba(255,210,74,.7)'});
  // title with shimmer
  var TT=L.title,tdx=Math.round((W-TT.width)/2),tdy=Math.round(H*.02);x.drawImage(TT,tdx,tdy);
  if(moving){var sh=(t*.6)%1.6;if(sh<1)x.drawImage(shim(TT,sh),tdx,tdy);}
  x.drawImage(L.over,0,0);}
var SH=null;function shim(T,p){if(!SH||SH[0].width!==T.width)SH=mk(T.width,T.height);var c=SH[0],x=SH[1];x.clearRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';x.drawImage(T,0,0);x.globalCompositeOperation='source-in';
  var cx=-30+p*(c.width+60);var g=x.createLinearGradient(cx-14,0,cx+14,c.height);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';return c;}

/* ---------- interaction (same behaviour as keyart-croak.js / keyart-orbit.js) ---------- */
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
function mount(cv){if(cv._ka)return;cv._ka=1;var trig=cv.closest('[data-keyart-trigger]')||cv.parentNode;var raf=0,t0=0,active=false,last=0;
  draw(cv,0,false);
  function frame(ms){if(!active)return;raf=requestAnimationFrame(frame);if(ms-last<33)return;last=ms;draw(cv,(ms-t0)/1000+0.05,true);}
  function on(){if(active)return;active=true;trig.classList.add('awake');if(reduce&&reduce.matches){draw(cv,1,true,{still:1});return;}t0=performance.now();raf=requestAnimationFrame(frame);}
  function off(){if(!active)return;active=false;trig.classList.remove('awake');cancelAnimationFrame(raf);draw(cv,0,false);}
  trig.addEventListener('mouseenter',on);trig.addEventListener('mouseleave',off);
  trig.addEventListener('focusin',on);trig.addEventListener('focusout',function(e){if(!trig.contains(e.relatedTarget))off();});
  var touchWake=false;
  var zone=cv.parentNode;trig.addEventListener('pointerdown',function(e){touchWake=false;if((e.pointerType==='touch'||e.pointerType==='pen')&&zone.contains(e.target)){touchWake=!active;if(!active)on();}});
  trig.addEventListener('click',function(e){if(touchWake){touchWake=false;e.preventDefault();}},true);
  document.addEventListener('pointerdown',function(e){if(active&&!trig.contains(e.target)&&e.pointerType!=='mouse')off();});
  trig.addEventListener('keydown',function(e){if((e.key===' '||e.key==='Enter')&&trig===e.target&&trig.tagName!=='A'){e.preventDefault();active?off():on();}});
  cv._on=on;cv._off=off;}
function mountAll(root){[].slice.call((root||document).querySelectorAll('canvas.keyart[data-art="meowteor"]')).forEach(mount);}
// chain onto the shared hook that site.js calls after building the grid
var prev=window.LAGKeyArt||{};
window.LAGKeyArt={draw:prev.draw,mount:prev.mount,layers:prev.layers,
  mountAll:function(root){if(prev.mountAll)prev.mountAll(root);mountAll(root);}};
window.LAGKeyArtMeowteor={draw:draw,mount:mount,mountAll:mountAll,layers:layers};
if(document.readyState!=='loading')mountAll();else document.addEventListener('DOMContentLoaded',function(){mountAll();});
})();
