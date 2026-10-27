/* Croak & Dagger key art: hand-placed pixel art drawn in <canvas>.
   Still frame by default; comes alive on hover / keyboard focus / tap.
   Usage: <canvas class="keyart" data-art="croak-and-dagger" width="320" height="180"></canvas>
   Respects prefers-reduced-motion (shows a single "awake" frame instead of animating). */
(function(){
'use strict';
var P=window.LAGPixel;
var BONE='#e8dcb5',INK='#05040a';
function mk(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.imageSmoothingEnabled=false;return [c,x];}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function R(x,a,b,w,h,c){x.fillStyle=c;x.fillRect(a|0,b|0,w|0,h|0);}
function ell(x,cx,cy,rx,ry,c){x.fillStyle=c;for(var y=-ry;y<=ry;y++){var w=Math.round(rx*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry+.25))));x.fillRect(Math.round(cx-w),Math.round(cy+y),w*2+1,1);}}
// outline any sprite: inner bone rim + outer ink rim
function outlined(src,w,h,inner,outer){var o=mk(w+4,h+4),c=o[0],x=o[1];
  var d=src.getContext('2d').getImageData(0,0,w,h).data;function A(i,j){return i>=0&&j>=0&&i<w&&j<h&&d[(j*w+i)*4+3]>0;}
  for(var j=-2;j<h+2;j++)for(var i=-2;i<w+2;i++){if(A(i,j))continue;var n1=A(i-1,j)||A(i+1,j)||A(i,j-1)||A(i,j+1);
    if(n1&&inner){x.fillStyle=inner;x.fillRect(i+2,j+2,1,1);continue;}
    var n2=A(i-2,j)||A(i+2,j)||A(i,j-2)||A(i,j+2)||A(i-1,j-1)||A(i+1,j+1)||A(i-1,j+1)||A(i+1,j-1);if(n2&&outer){x.fillStyle=outer;x.fillRect(i+2,j+2,1,1);}}
  x.drawImage(src,2,2);return c;}

/* ---------- static layers (cached per size) ---------- */
var CACHE={};
function layers(W,H){var k=W+'x'+H;if(CACHE[k])return CACHE[k];var L={};var r=rng(77);
  var hz=Math.round(H*.655);L.hz=hz;
  // sky with ordered dither bands
  var s=mk(W,H),sx=s[1];var bands=['#07061a','#0b0a26','#120c33','#1b0f40','#28124c','#341556'];
  var bayer=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  for(var y=0;y<hz;y++){var f=y/hz*(bands.length-1),b=Math.floor(f),fr=f-b;for(var xx=0;xx<W;xx++){var c=(fr*16>bayer[y&3][xx&3])?bands[Math.min(bands.length-1,b+1)]:bands[b];sx.fillStyle=c;sx.fillRect(xx,y,1,1);}}
  // moon + halo
  var mx=Math.round(W*.5),my=Math.round(H*.40),mr=Math.round(H*.15);L.moon={x:mx,y:my,r:mr};
  for(var i=3;i>=1;i--){sx.globalAlpha=.07*i;ell(sx,mx,my,mr+12-i*3,mr+12-i*3,'#b04cff');}sx.globalAlpha=1;
  ell(sx,mx,my,mr+1,mr+1,'#000');ell(sx,mx,my,mr,mr,'#e9dfba');
  for(var yy=-mr;yy<=mr;yy++)for(var x2=-mr;x2<=mr;x2++){if(x2*x2+yy*yy>mr*mr)continue;var dd=Math.hypot(x2+mr*.45,yy+mr*.45)/mr;if(dd>1.15||(dd>.95&&((x2&1)^(yy&1)))){sx.fillStyle='#c4b78e';sx.fillRect(mx+x2,my+yy,1,1);}}
  for(var yy2=-mr;yy2<=mr;yy2++)for(var x4=-mr;x4<=mr;x4++){var d3=x4*x4+yy2*yy2;if(d3<=mr*mr&&d3>(mr-1)*(mr-1)&&x4+yy2<0){sx.fillStyle='#fff6d6';sx.fillRect(mx+x4,my+yy2,1,1);}}
  [[-8,-6,4],[6,4,5],[-3,9,3],[9,-9,2],[-11,3,2]].forEach(function(q){var s2=mr/26;ell(sx,mx+q[0]*s2,my+q[1]*s2,q[2]*s2,q[2]*s2,'#cdbf96');ell(sx,mx+q[0]*s2-1,my+q[1]*s2-1,Math.max(1,q[2]*s2-1),Math.max(1,q[2]*s2-1),'#ddd2aa');});
  // far hills
  for(var x3=0;x3<W;x3++){var hh=Math.round(8+Math.sin(x3*.045)*4+Math.sin(x3*.13+1)*2);R(sx,x3,hz-hh,1,hh,'#0c1a14');var h2=Math.round(4+Math.sin(x3*.08+2)*2);R(sx,x3,hz-h2,1,h2,'#0a1410');}
  // dead trees
  function tree(tx,th,dir){R(sx,tx,hz-th,2,th,'#050a08');var yb=hz-th;for(var k2=0;k2<4;k2++){var by=yb+Math.round(th*(.1+k2*.18)),dd=(k2%2?1:-1)*dir,len=6+Math.round(r()*8);for(var j=0;j<len;j++)R(sx,tx+(dd>0?2+j:-j),by-Math.floor(j/2),1,1,'#050a08');}}
  tree(Math.round(W*.05),Math.round(H*.42),1);tree(Math.round(W*.13),Math.round(H*.28),-1);tree(Math.round(W*.92),Math.round(H*.46),-1);tree(Math.round(W*.84),Math.round(H*.25),1);
  // reeds
  for(var q2=0;q2<70;q2++){var rx=Math.round(r()*W);if(rx>W*.3&&rx<W*.6)continue;var rh=4+Math.round(r()*12);R(sx,rx,hz-rh,1,rh,r()<.5?'#0f2a1a':'#163a22');if(r()<.3)R(sx,rx,hz-rh-2,1,3,'#3a2a18');}
  // water
  for(var y4=hz;y4<H;y4++){var t2=(y4-hz)/(H-hz);R(sx,0,y4,W,1,t2<.3?'#0a1630':t2<.6?'#081127':'#050b1a');}
  R(sx,0,hz,W,1,'#243a66');
  // left bank where the hero stands
  var bx=Math.round(W*.33);for(var x5=0;x5<bx;x5++){var by2=Math.round(H*.80+Math.sin(x5*.09)*2-(x5/bx)*-6);R(sx,x5,by2,1,H-by2,'#0b140f');R(sx,x5,by2,1,1,'#1f3a24');if((x5*7)%5===0)R(sx,x5,by2-2,1,2,'#163a22');}
  // rock under hero
  ell(sx,Math.round(W*.2),Math.round(H*.80),Math.round(W*.09),Math.round(H*.05),'#1a1f24');ell(sx,Math.round(W*.2),Math.round(H*.79),Math.round(W*.085),Math.round(H*.04),'#2a3038');R(sx,Math.round(W*.13),Math.round(H*.77),Math.round(W*.13),1,'#3d4550');
  L.sky=s[0];
  // title
  var tw=P.textW('CROAK & DAGGER',2),t=mk(tw+16,34),tx=t[1];P.text(tx,'CROAK & DAGGER',6,4,2,BONE,{glow:'rgba(176,76,255,.9)'});
  var sw=P.textW('100 FROGS MUST FALL',1);P.text(tx,'100 FROGS MUST FALL',Math.round((tw+16-sw)/2),24,1,'#9fc0ff',{glow:'rgba(58,123,255,.9)'});L.title=t[0];
  // scanlines + vignette overlay
  var o=mk(W,H),ox=o[1];for(var y6=0;y6<H;y6+=2){ox.fillStyle='rgba(0,0,0,.16)';ox.fillRect(0,y6,W,1);}
  var g=ox.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.62);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');ox.fillStyle=g;ox.fillRect(0,0,W,H);L.over=o[0];
  // stars (positions)
  L.stars=[];for(var n=0;n<46;n++){var px=Math.round(r()*W),py=Math.round(r()*hz*.85);var dm=Math.hypot(px-mx,py-my);if(dm<mr+14)continue;if(py<36&&px>W*.22&&px<W*.78)continue;L.stars.push({x:px,y:py,s:r()<.22?2:1,p:r()*6.28,c:r()<.5?'#9fc0ff':'#3a7bff'});}
  L.flies=[];for(var m=0;m<14;m++)L.flies.push({x:r()*W,y:H*.45+r()*H*.42,p:r()*6.28,sp:.4+r()*.8});
  L.frog=frogSprite(false);L.frogBlink=frogSprite(true);L.hero=heroSprite();
  CACHE[k]=L;return L;}

/* ---------- characters ---------- */
// Dapper frog in a top hat and bow tie (drawn at scale k)
var FK=1.3;
function frogSprite(blink){var k=FK,S=function(v){return Math.round(v*k);};var W=S(54),H=S(48),o=mk(W,H),x=o[1];
  function E(cx,cy,rx,ry,c){ell(x,S(cx),S(cy)+S(2),Math.max(1,S(rx)),Math.max(1,S(ry)),c);}function Q(a,b,w,h,c){R(x,S(a),S(b)+S(2),Math.max(1,S(w)),Math.max(1,S(h)),c);}
  E(9,39,8,4,'#2f7a36');E(45,39,8,4,'#2f7a36');Q(2,40,4,1,'#5ac85a');Q(48,40,4,1,'#5ac85a');
  E(27,32,21,12,'#3f9a45');E(27,29,19,8,'#4cae50');E(27,36,15,7,'#c9d98a');E(27,35,12,5,'#d8e6a0');
  [[11,28],[42,27],[16,34],[39,34],[22,25],[34,25]].forEach(function(q){E(q[0],q[1],2,1,'#2b6e31');});
  E(27,22,17,8,'#46a84c');E(27,20,14,5,'#55bb58');
  E(16,16,7,6,'#46a84c');E(38,16,7,6,'#46a84c');
  if(blink){Q(10,16,12,1.5,'#1d4a22');Q(32,16,12,1.5,'#1d4a22');}
  else{E(16,16,5,4.4,'#f2eed8');E(38,16,5,4.4,'#f2eed8');E(17,16.5,3,3,'#120a20');E(39,16.5,3,3,'#120a20');Q(15,14,1,1,'#ffffff');Q(37,14,1,1,'#ffffff');R(x,S(18),S(17)+S(2),1,1,'#5a3a9a');R(x,S(40),S(17)+S(2),1,1,'#3a5ab0');}
  for(var i=0;i<S(20);i++)R(x,S(17)+i,S(26)+S(2)+Math.round(Math.sin(i/S(20)*Math.PI)*2),1,1,'#173d1b');
  // bow tie
  x.fillStyle='#b04cff';x.beginPath();x.moveTo(S(19),S(31)+S(2));x.lineTo(S(26),S(34)+S(2));x.lineTo(S(19),S(37)+S(2));x.fill();x.beginPath();x.moveTo(S(35),S(31)+S(2));x.lineTo(S(28),S(34)+S(2));x.lineTo(S(35),S(37)+S(2));x.fill();
  x.fillStyle='#7a2acc';x.fillRect(S(20),S(35)+S(2),S(4),1);x.fillRect(S(31),S(35)+S(2),S(4),1);Q(25,32,4,4,'#e2c2ff');
  // top hat, tilted brim
  Q(8,8,24,2,'#15121c');Q(12,-2,15,11,'#15121c');Q(12,5,15,2,'#b04cff');Q(13,-1,2,6,'#2e2840');Q(30,7,2,1,'#15121c');
  return outlined(o[0],W,H,BONE,INK);}
// Hooded reaper hero, 60x80
function heroSprite(){var o=mk(60,80),x=o[1];
  // cloak with folds
  for(var y=34;y<76;y++){var hw=9+Math.round((y-34)*.4);R(x,28-hw,y,hw*2+1,1,'#231c33');R(x,28-hw,y,2,1,'#3a2f52');R(x,28+hw-1,y,1,1,'#17121f');}
  [[22,46,28],[30,44,30],[36,50,24]].forEach(function(f){for(var y=f[1];y<f[1]+f[2]&&y<76;y++)R(x,f[0]+Math.round((y-f[1])*.08),y,1,1,'#17121f');});
  for(var i=0;i<10;i++)R(x,11+i*3.4,75,3,2+(i%3),'#231c33');
  // purple sash
  for(var j=0;j<14;j++)R(x,20+j,39+Math.round(j*.15),1,2,'#4a2470');R(x,22,41,2,6,'#4a2470');R(x,25,41,2,8,'#4a2470');
  // forward arm
  R(x,34,42,13,5,'#1a1626');R(x,34,42,13,1,'#2e2640');R(x,46,41,4,4,BONE);
  // back arm
  R(x,12,44,5,10,'#1a1626');R(x,12,53,4,3,BONE);
  // hood
  ell(x,30,24,14,15,'#2e2640');x.fillStyle='#2e2640';x.beginPath();x.moveTo(19,16);x.lineTo(36,12);x.lineTo(10,3);x.fill();
  for(var k=0;k<14;k++)R(x,19+k,11+Math.round(k*.1),1,1,'#3d3354');
  ell(x,32,26,9,10,'#05040a');
  // skull
  ell(x,32,25,6,6,'#e8dcb5');R(x,28,29,9,4,'#e8dcb5');R(x,27,23,1,3,'#c8b890');
  R(x,29,24,3,3,'#05040a');R(x,34,24,3,3,'#05040a');R(x,32,28,1,1,'#05040a');
  for(var t=0;t<4;t++)R(x,29+t*2,31,1,2,'#05040a');R(x,28,33,9,1,'#c8b890');
  return outlined(o[0],60,80,BONE,INK);}

/* ---------- frame renderer ---------- */
function draw(cv,t,awake,opts){var W=cv.width,H=cv.height,x=cv.getContext('2d');x.imageSmoothingEnabled=false;var L=layers(W,H),hz=L.hz,m=L.moon;
  x.drawImage(L.sky,0,0);
  // stars
  for(var i=0;i<L.stars.length;i++){var s=L.stars[i];var a=awake?(Math.sin(t*2.2+s.p)+1)/2:.55+.4*Math.sin(s.p);if(a<.18)continue;x.globalAlpha=a;x.fillStyle=a>.8?'#ffffff':s.c;var l=s.s+(a>.75?1:0);x.fillRect(s.x-l,s.y,l*2+1,1);x.fillRect(s.x,s.y-l,1,l*2+1);}x.globalAlpha=1;
  // fog band drifting
  var fo=awake?(t*6)%W:0;x.fillStyle='rgba(160,150,200,.06)';for(var k=0;k<3;k++){x.fillRect(((k*137+fo)%(W+120))-120,hz-6-k*4,120,3);x.fillRect(((k*211+fo*1.4+60)%(W+160))-160,hz-14-k*3,90,2);}
  // moon reflection
  for(var j=0;j<9;j++){var ry=hz+3+j*4;if(ry>H*.9)break;var rw=Math.round((m.r*1.2-j*2.2)*(1+(awake?.15*Math.sin(t*3+j):0)));if(rw<2)continue;var ox=Math.round(awake?Math.sin(t*2+j*1.3)*3:(j%2?2:-2));x.fillStyle=j<3?'#d8cc9f':'#9f9572';x.fillRect(m.x-rw+ox,ry,rw*2,1);if(j%2===0)x.fillRect(m.x-Math.round(rw*.4)-ox,ry+2,Math.round(rw*.8),1);}
  // lily pad + frog
  var fx=Math.round(W*.73),fy=Math.round(H*.81);
  // ripples
  if(awake){for(var q=0;q<3;q++){var ph=((t*.7+q/3)%1);var rr=10+ph*40;x.globalAlpha=(1-ph)*.6;x.strokeStyle='#5a7ac0';x.lineWidth=1;x.beginPath();x.ellipse(fx,fy+4,rr,rr*.22,0,0,6.283);x.stroke();}x.globalAlpha=1;}
  ell(x,fx,fy+3,38,7,'#000');ell(x,fx,fy+2,36,6,'#1f6a2a');ell(x,fx-2,fy+1,31,4,'#2a8a36');R(x,fx+18,fy-1,16,3,'#081127');R(x,fx-30,fy+2,4,1,'#3cff5a');
  ell(x,fx-28,fy-1,3,2,'#000');ell(x,fx-28,fy-1,2,1,'#e04cff');R(x,fx-28,fy-3,1,1,'#ffd24a');
  var croak=awake?Math.max(0,Math.sin(t*3.2)):0;var bob=awake?Math.round(Math.sin(t*3.2)*1):0;
  var blink=awake&&((t*.55)%1)>.93;var fs=blink?L.frogBlink:L.frog;var fW=fs.width,fH=fs.height;var fdx=fx-Math.round(fW/2),fdy=fy-fH+4-bob;
  x.drawImage(fs,fdx,fdy);
  // throat sac (croak)
  if(croak>.15){var sr=Math.round(3+croak*8);var sy0=fdy+Math.round(38*FK);ell(x,fx,sy0,sr+1,Math.round(sr*.7)+1,'#000');ell(x,fx,sy0,sr,Math.round(sr*.7),'#f0b8d8');ell(x,fx-2,sy0-1-Math.round(sr*.3),Math.max(1,sr-4),1,'#fff');
    if(croak>.8){P.text(x,'CROAK!',fx+20,fdy+6,1,'#ffd24a',{glow:'rgba(255,210,74,.7)'});}}
  // frog eye glow
  if(!blink){var gpow=awake?.55+.45*Math.sin(t*4):.45;glow(x,fdx+Math.round(17*FK),fdy+Math.round(19*FK),'176,76,255',gpow*.7,7);glow(x,fdx+Math.round(39*FK),fdy+Math.round(19*FK),'58,123,255',gpow*.7,7);}
  // hero
  var hx=Math.round(W*.2),hy=Math.round(H*.82);var hs=L.hero;var hb=awake?Math.round(Math.sin(t*2)*1):0;var hdx=hx-32,hdy=hy-hs.height+3+hb;
  // cloak wind tails
  if(awake){for(var w=0;w<5;w++){var wx=hdx+6-w*3-Math.round((Math.sin(t*5+w)+1)*2),wy=hdy+56+w*4;R(x,wx,wy,4,1,'#231c33');}}
  x.drawImage(hs,hdx,hdy);
  // hero eyes
  var ep=awake?.55+.45*Math.sin(t*5+1):.4;R(x,hdx+32,hdy+27,1,1,'#e2b0ff');R(x,hdx+37,hdy+27,1,1,'#bcd4ff');glow(x,hdx+32.5,hdy+27.5,'176,76,255',ep,4);glow(x,hdx+37.5,hdy+27.5,'58,123,255',ep,4);
  // dagger
  var dx0=hdx+52,dy0=hdy+41;R(x,dx0-2,dy0-1,2,5,'#000');R(x,dx0-1,dy0,1,3,'#7a5a2a');R(x,dx0,dy0-2,1,7,'#000');R(x,dx0,dy0-1,1,5,BONE);
  for(var b=1;b<=13;b++){var bw=b<11?3:b<13?2:1;R(x,dx0+b,dy0+2-Math.floor(bw/2)-1,1,bw+2,'#000');R(x,dx0+b,dy0+2-Math.floor(bw/2),1,bw,b%3?'#cfd6e6':'#a8b0c4');}
  if(awake){var gp=(t*1.1)%2;if(gp<1){var gx=dx0+1+Math.round(gp*12);R(x,gx,dy0,1,4,'#ffffff');R(x,gx-1,dy0+1,1,2,'#ffffff');if(gp>.85){var sx=dx0+14,sy=dy0+2;R(x,sx-3,sy,7,1,'#fff');R(x,sx,sy-3,1,7,'#fff');}}}
  // fireflies
  for(var f=0;f<L.flies.length;f++){var fl=L.flies[f];var px2,py2,on;if(awake){px2=(fl.x+Math.sin(t*fl.sp+fl.p)*14+t*4*fl.sp)%W;py2=fl.y+Math.cos(t*fl.sp*1.3+fl.p)*8;on=(Math.sin(t*3*fl.sp+fl.p)+1)/2;}else{if(f%3)continue;px2=fl.x;py2=fl.y;on=.6;}
    if(on<.25)continue;glow(x,px2,py2,'200,255,110',on*.8,5);x.fillStyle=on>.7?'#f6ffb0':'#c8ff6a';x.fillRect(Math.round(px2),Math.round(py2),1,1);}
  // title with shimmer
  var T=L.title,tdx=Math.round((W-T.width)/2),tdy=Math.round(H*.035);x.drawImage(T,tdx,tdy);
  if(awake&&!(opts&&opts.still)){var sh=(t*.6)%1.6;if(sh<1){var tmp=shim(T,sh);x.drawImage(tmp,tdx,tdy);}}
  x.drawImage(L.over,0,0);}
var SH=null;function shim(T,p){if(!SH||SH[0].width!==T.width)SH=mk(T.width,T.height);var c=SH[0],x=SH[1];x.clearRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';x.drawImage(T,0,0);x.globalCompositeOperation='source-in';
  var cx=-30+p*(c.width+60);var g=x.createLinearGradient(cx-14,0,cx+14,c.height);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';return c;}
function glow(x,cx,cy,rgb,a,r){var g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba('+rgb+','+(a*.75)+')');g.addColorStop(1,'rgba('+rgb+',0)');x.globalCompositeOperation='lighter';x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);x.globalCompositeOperation='source-over';}

/* ---------- interaction ---------- */
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
function mount(cv){if(cv._ka)return;cv._ka=1;var trig=cv.closest('[data-keyart-trigger]')||cv.parentNode;var raf=0,t0=0,active=false,last=0;
  draw(cv,0,false);
  function frame(ms){if(!active)return;raf=requestAnimationFrame(frame);if(ms-last<33)return;last=ms;draw(cv,(ms-t0)/1000+0.4,true);}
  function on(){if(active)return;active=true;trig.classList.add('awake');if(reduce&&reduce.matches){draw(cv,.49,true,{still:1});return;}t0=performance.now();raf=requestAnimationFrame(frame);}
  function off(){if(!active)return;active=false;trig.classList.remove('awake');cancelAnimationFrame(raf);draw(cv,0,false);}
  trig.addEventListener('mouseenter',on);trig.addEventListener('mouseleave',off);
  trig.addEventListener('focusin',on);trig.addEventListener('focusout',function(e){if(!trig.contains(e.relatedTarget))off();});
  // touch: first tap wakes the art (and doesn't follow a link); second tap follows it.
  var touchWake=false;
  var zone=cv.parentNode;trig.addEventListener('pointerdown',function(e){touchWake=false;if((e.pointerType==='touch'||e.pointerType==='pen')&&zone.contains(e.target)){touchWake=!active;if(!active)on();}});
  trig.addEventListener('click',function(e){if(touchWake){touchWake=false;e.preventDefault();}},true);
  document.addEventListener('pointerdown',function(e){if(active&&!trig.contains(e.target)&&e.pointerType!=='mouse')off();});
  trig.addEventListener('keydown',function(e){if((e.key===' '||e.key==='Enter')&&trig===e.target&&trig.tagName!=='A'){e.preventDefault();active?off():on();}});
  cv._on=on;cv._off=off;}
function mountAll(root){[].slice.call((root||document).querySelectorAll('canvas.keyart[data-art="croak-and-dagger"]')).forEach(mount);}
window.LAGKeyArt={draw:draw,mount:mount,mountAll:mountAll,layers:layers};
if(document.readyState!=='loading')mountAll();else document.addEventListener('DOMContentLoaded',function(){mountAll();});
})();
