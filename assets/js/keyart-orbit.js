/* Orbit Hills key art: hand-placed pixel art drawn in <canvas>.
   A little buggy cresting a moon hill under a ringed planet and starfield.
   Still frame by default; comes alive on hover / keyboard focus / tap (the hills scroll,
   the buggy bounces and pulls the odd backflip, stars twinkle, comets streak by).
   Usage: <canvas class="keyart" data-art="orbit-hills" width="320" height="180"></canvas>
   Respects prefers-reduced-motion (shows a single "awake" frame instead of animating).
   Loads after keyart-croak.js and extends window.LAGKeyArt.mountAll so site.js mounts both. */
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

/* ---------- terrain (world-space, so it scrolls consistently) ---------- */
function nearH(wx,H){return H*.69-Math.sin(wx*.019)*H*.10-Math.sin(wx*.0071+1.3)*H*.06-Math.sin(wx*.047+.4)*H*.016;}
function farH(wx,H){return H*.60-Math.sin(wx*.013+2)*H*.06-Math.sin(wx*.031)*H*.025;}
function ridgeH(wx,H){var a=Math.abs(((wx*.011)%2+2)%2-1),b=Math.abs(((wx*.027+.3)%2+2)%2-1);return H*.55-a*H*.10-b*H*.04;}
// scroll offset where the buggy (at screen x BX) sits right on a crest
var BXF=.40;
function crestOffset(W,H){var bx=Math.round(W*BXF),best=0,bh=1e9;for(var o=0;o<600;o++){var h=nearH(o+bx,H);if(h<bh){bh=h;best=o;}}return best;}

/* ---------- static layers (cached per size) ---------- */
var CACHE={};
function layers(W,H){var k=W+'x'+H;if(CACHE[k])return CACHE[k];var L={};var r=rng(4242);
  // deep space sky, dithered bands
  var s=mk(W,H),sx=s[1];var bands=['#03030f','#060720','#0b0b30','#130d3e','#1e104a','#2c1356','#3a1660'];
  for(var y=0;y<H;y++){var f=Math.min(1,y/(H*.72))*(bands.length-1),b=Math.floor(f),fr=f-b;for(var xx=0;xx<W;xx++){var c=(fr*16>BAYER[y&3][xx&3])?bands[Math.min(bands.length-1,b+1)]:bands[b];sx.fillStyle=c;sx.fillRect(xx,y,1,1);}}
  // milky way band (dither speckle along a diagonal)
  for(var n=0;n<900;n++){var u=r(),v=(r()-.5)*(r()-.5)*2;var px=Math.round(u*W),py=Math.round(H*.05+u*H*.38+v*H*.22);if(py<0||py>H*.62)continue;sx.fillStyle=r()<.5?'rgba(140,120,255,.18)':'rgba(90,160,255,.14)';sx.fillRect(px,py,1,1);}
  // faint nebula puffs
  [[.18,.20,26,'176,76,255'],[.30,.34,18,'58,123,255'],[.62,.12,22,'255,90,170']].forEach(function(q){var g=sx.createRadialGradient(W*q[0],H*q[1],0,W*q[0],H*q[1],q[2]*W/320);g.addColorStop(0,'rgba('+q[3]+',.16)');g.addColorStop(1,'rgba('+q[3]+',0)');sx.fillStyle=g;sx.fillRect(0,0,W,H);});
  // little blue home planet (Hearth) far away, left
  var hx=Math.round(W*.10),hy=Math.round(H*.40),hr=Math.max(4,Math.round(H*.045));
  ell(sx,hx,hy,hr+1,hr+1,'#000');ell(sx,hx,hy,hr,hr,'#2a6adf');
  [[-.4,-.3,.45],[.35,.25,.35],[.1,-.55,.25]].forEach(function(q){ell(sx,hx+q[0]*hr,hy+q[1]*hr,Math.max(1,q[2]*hr),Math.max(1,q[2]*hr*.7),'#3fbf5a');});
  for(var yy=-hr;yy<=hr;yy++)for(var x2=-hr;x2<=hr;x2++){if(x2*x2+yy*yy>hr*hr)continue;if(x2+yy*.4>hr*.35&&((x2+yy)&1)){sx.fillStyle='rgba(0,0,20,.55)';sx.fillRect(hx+x2,hy+yy,1,1);}}
  L.sky=s[0];
  // big ringed planet: body (bands drawn per frame so they can drift), ring back/front sprites
  var pr=Math.round(H*.19);L.planet={x:Math.round(W*.80),y:Math.round(H*.33),r:pr};
  var pb=mk(pr*2+3,pr*2+3);L.pBody=pb;L.pMask=[];
  for(var j=-pr;j<=pr;j++){var row=[];for(var i=-pr;i<=pr;i++){var d2=i*i+j*j;if(d2>pr*pr){row.push(0);continue;}
      var lit=(i*.62+j*.78)/pr;// light from upper-left => negative is lit
      var sh=lit>.55?3:lit>.25?((i^j)&1?3:2):lit>-.05?2:lit>-.35?((i^j)&1?2:1):lit>-.7?1:0;
      if(d2>(pr-1)*(pr-1)&&(i*.62+j*.78)<-pr*.55)sh=-1;row.push(sh+10);}L.pMask.push(row);}
  // ring
  function ring(front){var o=mk(pr*5,pr*2),x=o[1],cx=pr*2.5,cy=pr,rx=pr*1.95,ry=pr*.46,rw=Math.round(pr*.55);
    var RC=['#fff0c8','#f0c890','#e0a070','#c88a62','#3a2040','#3a2040','#d89a6a','#b0705a','#8a5a52','#6a4450'];
    for(var a=0;a<1440;a++){var th=a/1440*Math.PI*2,sy=Math.sin(th);if(front?sy<0:sy>=0)continue;
      for(var w=0;w<rw;w++){var k2=1-w/rx;var px=Math.round(cx+Math.cos(th)*rx*k2),py=Math.round(cy+sy*ry*k2-Math.cos(th)*pr*.16*k2);
        var ci=Math.min(RC.length-1,Math.floor(w/rw*RC.length));var col=RC[ci];if(!front&&ci<4&&((px+py)&1))col=RC[ci+1<4?ci+1:3];
        // planet shadow falls across the back of the ring
        x.fillStyle=col;x.fillRect(px,py,1,1);}}
    return o[0];}
  L.ringBack=ring(false);L.ringFront=ring(true);
  // title
  var tw=P.textW('ORBIT HILLS',2),t=mk(tw+16,34),tx=t[1];P.text(tx,'ORBIT HILLS',8,4,2,BONE,{glow:'rgba(58,123,255,.95)'});
  var stw=P.textW('A GALAXY CLIMB RACER',1);P.text(tx,'A GALAXY CLIMB RACER',Math.round((tw+16-stw)/2),24,1,'#ffb0e0',{glow:'rgba(255,90,170,.85)'});L.title=t[0];
  // scanlines + vignette
  var o=mk(W,H),ox=o[1];for(var y6=0;y6<H;y6+=2){ox.fillStyle='rgba(0,0,0,.16)';ox.fillRect(0,y6,W,1);}
  var g=ox.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.62);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');ox.fillStyle=g;ox.fillRect(0,0,W,H);L.over=o[0];
  // stars
  L.stars=[];var P0=L.planet;for(var m=0;m<70;m++){var px2=Math.round(r()*W),py2=Math.round(r()*H*.6);if(Math.hypot(px2-P0.x,py2-P0.y)<P0.r*1.3)continue;if(py2<38&&px2>W*.2&&px2<W*.8)continue;
    L.stars.push({x:px2,y:py2,s:r()<.18?2:1,p:r()*6.28,c:r()<.4?'#9fc0ff':r()<.5?'#ffd8f0':'#3a7bff',d:.05+r()*.12});}
  L.buggy=buggySprite();L.off0=crestOffset(W,H);
  CACHE[k]=L;return L;}

/* ---------- the buggy (body only; wheels drawn live so they spin) ---------- */
var BK=1.5;
function buggySprite(){var k=BK,S=function(v){return Math.round(v*k);};var w=S(34),h=S(17),o=mk(w,h),x=o[1];
  function Q(a,b,ww,hh,c){R(x,S(a),S(b),Math.max(1,S(ww)),Math.max(1,S(hh)),c);}
  // roll cage
  Q(9,1,1.4,8,'#c8d0e0');Q(9,1,12,1.4,'#c8d0e0');Q(19.6,1,1.4,6.5,'#c8d0e0');Q(14,2.4,1,4.6,'#8a92a8');R(x,S(9),S(1),S(12),1,'#ffffff');
  // driver dome (no character, just a tinted visor bubble)
  ell(x,S(15.5),S(5.6),S(3.2),S(3),'#2a5adf');ell(x,S(16),S(5.2),S(2),S(1.8),'#7fc0ff');R(x,S(16.5),S(3.6),1,1,'#ffffff');
  // antenna + aura flag
  Q(4,0,.7,8,'#8a92a8');Q(4.7,0,4,2.6,'#b04cff');Q(4.7,0,4,.7,'#e2c2ff');
  // chassis
  Q(1,8,30,5,'#ff4a5a');Q(1,8,30,1,'#ff9aa2');Q(1,12,30,1,'#a01828');Q(23,6.6,8.5,2.4,'#ff4a5a');Q(23,6.6,8.5,.8,'#ff9aa2');Q(27,7.6,2,1,'#a01828');
  Q(30.5,8.8,2.5,2.2,'#ffd24a');R(x,S(32),S(9),1,1,'#ffffff');// headlight
  Q(0,9,1.6,2.6,'#3a3a48');Q(0,9,1.6,.7,'#8a92a8');// exhaust
  // race stripe + number
  Q(3,10,25,1,'#ffffff');Q(8,10,2,1,'#ff4a5a');Q(17,10,2,1,'#ff4a5a');
  ell(x,S(12.5),S(10.3),S(1.6),S(1.6),'#ffffff');R(x,S(12.5),S(9.6),1,S(1.6),'#ff4a5a');
  // underside / suspension
  Q(4,13,26,2,'#2a2a38');Q(6,13,2,3.4,'#555a6a');Q(25,13,2,3.4,'#555a6a');Q(6,13,2,.6,'#8a92a8');Q(25,13,2,.6,'#8a92a8');
  return outlined(o[0],w,h,null,INK);}
function wheel(x,cx,cy,rad,ang){ell(x,cx,cy,rad+1,rad+1,INK);ell(x,cx,cy,rad,rad,'#1a1a24');ell(x,cx,cy,rad-1,rad-1,'#2e2e3c');ell(x,cx,cy,Math.max(1,rad-3),Math.max(1,rad-3),'#8a92a8');
  for(var k=0;k<3;k++){var a=ang+k*Math.PI/1.5;R(x,Math.round(cx+Math.cos(a)*(rad-1)),Math.round(cy+Math.sin(a)*(rad-1)),1,1,'#555a6a');}
  var a2=ang;R(x,Math.round(cx+Math.cos(a2)*(rad-3)),Math.round(cy+Math.sin(a2)*(rad-3)),1,1,'#e8ecf6');R(x,cx|0,cy|0,1,1,'#ffd24a');}

/* ---------- frame renderer ---------- */
function draw(cv,t,awake,opts){var W=cv.width,H=cv.height,x=cv.getContext('2d');x.imageSmoothingEnabled=false;var L=layers(W,H);
  var still=!awake||(opts&&opts.still);var SPD=46;var off=L.off0+(still?0:t*SPD);
  x.drawImage(L.sky,0,0);
  // stars (slow parallax drift while driving)
  for(var i=0;i<L.stars.length;i++){var s=L.stars[i];var a=awake?(Math.sin(t*2.4+s.p)+1)/2:.55+.4*Math.sin(s.p);if(a<.2)continue;var sx=s.x;if(!still){sx=((s.x-t*SPD*s.d)%W+W)%W;}sx=Math.round(sx);
    x.globalAlpha=a;x.fillStyle=a>.8?'#ffffff':s.c;var l=s.s+(a>.78?1:0);if(l>1){x.fillRect(sx-l,s.y,l*2+1,1);x.fillRect(sx,s.y-l,1,l*2+1);}else x.fillRect(sx,s.y,1,1);}x.globalAlpha=1;
  // comet / shooting star
  if(awake&&!still){var cp=(t*.42)%1.8;if(cp<1){var c0x=W*.15+cp*W*.55,c0y=H*.06+cp*H*.22;for(var q=0;q<16;q++){x.globalAlpha=(1-q/16)*.9*(1-cp*.6);x.fillStyle=q<3?'#ffffff':'#9fc0ff';x.fillRect(Math.round(c0x-q*2.2),Math.round(c0y-q*.8),q<2?2:1,1);}x.globalAlpha=1;}}
  // planet
  var p=L.planet,pr=p.r,po=awake&&!still?t*3:0;
  x.drawImage(L.ringBack,Math.round(p.x-pr*2.5),Math.round(p.y-pr));
  var BAND=[['#3a1838','#5a2448','#8a3a5a','#c06a6a'],['#4a2030','#7a3440','#b0584a','#e09060'],['#2a1640','#47245e','#6e3a7e','#a060a0'],['#4a2a20','#7a4630','#b07040','#f0b070']];
  for(var j=-pr;j<=pr;j++){var row=L.pMask[j+pr];var bi=Math.floor(((j+pr)*1.0/pr*3+Math.sin((j+po)*.35)*.6+8))%4;for(var i2=-pr;i2<=pr;i2++){var v=row[i2+pr];if(!v)continue;var c;if(v===9)c='#ffe2c0';else c=BAND[bi][v-10];x.fillStyle=c;x.fillRect(p.x+i2,p.y+j,1,1);}}
  // storm spot
  ell(x,p.x-Math.round(pr*.25)+Math.round(awake&&!still?Math.sin(t*.6)*2:0),p.y+Math.round(pr*.3),Math.round(pr*.18),Math.round(pr*.09),'#f0d0a0');
  x.drawImage(L.ringFront,Math.round(p.x-pr*2.5),Math.round(p.y-pr));
  // tiny moon orbiting the planet
  var ma=awake&&!still?t*.9:2.4;var mxp=p.x+Math.cos(ma)*pr*1.75,myp=p.y+Math.sin(ma)*pr*.45-Math.cos(ma)*pr*.15;if(Math.sin(ma)>0||Math.hypot(mxp-p.x,myp-p.y)>pr+3){ell(x,mxp,myp,3,3,INK);ell(x,mxp,myp,2,2,'#c8c0d8');R(x,mxp-1,myp-1,1,1,'#ffffff');}
  // distant ridge
  for(var c1=0;c1<W;c1++){var rh=Math.round(ridgeH(c1+off*.18,H));R(x,c1,rh,1,H-rh,'#160f36');R(x,c1,rh,1,1,'#2a2160');}
  // far hills
  for(var c2=0;c2<W;c2++){var wx2=c2+off*.45,fh=Math.round(farH(wx2,H));R(x,c2,fh,1,H-fh,'#24164a');R(x,c2,fh,1,1,'#4a3a8a');if(hash(Math.floor(wx2))<.06)R(x,c2,fh-1,1,1,'#4a3a8a');}
  // near hills (the track)
  var GT=['#d8c4ff','#9a7ad8','#6a4aa8','#43307a','#2c1f56','#1b1238'];
  for(var c3=0;c3<W;c3++){var wx=c3+off,gy=Math.round(nearH(wx,H));R(x,c3,gy,1,H-gy,GT[4]);R(x,c3,gy+9,1,H-gy,GT[5]);
    for(var dy=0;dy<9;dy++){var band=dy<1?0:dy<2?1:dy<4?2:3;if(dy>=4&&((dy+c3)&1)&&dy===4)band=2;if(dy>=7&&((dy+c3)&1))band=4;R(x,c3,gy+dy,1,1,GT[band]);}
    // strata that follow the surface
    var s1=gy+15+Math.round(Math.sin(wx*.05)*2),s2=gy+27+Math.round(Math.sin(wx*.033+1)*3);
    if(s1<H){R(x,c3,s1,1,1,GT[3]);if((c3+s1)&1)R(x,c3,s1+1,1,1,GT[3]);}
    if(s2<H){R(x,c3,s2,1,1,'#3a2a6a');R(x,c3,s2+1,1,H-s2,'#140d2c');if((c3&1))R(x,c3,s2+1,1,1,'#2c1f56');}
    var wi=Math.floor(wx),hh=hash(wi);
    if(hh<.05){R(x,c3,gy+12+Math.floor(hh*200)%14,2,1,GT[2]);}
    if(hash(wi+999)<.025){R(x,c3,gy+18+Math.floor(hash(wi+5)*30),1,1,'#7a5ad0');}}
  // glowing crystals embedded in the rock (world-anchored)
  var gs=Math.floor((off-20)/37);for(var gc=gs;gc<gs+12;gc++){if(hash(gc*31+7)<.55)continue;var gwx=gc*37+hash(gc*3)*20,gsx=Math.round(gwx-off);if(gsx<-6||gsx>W+6)continue;var ggy=Math.round(nearH(gwx,H))+18+Math.floor(hash(gc*5)*22);if(ggy>H-3)continue;
    var gcol=hash(gc*11)<.5?['#3affe0','#a8fff2','58,255,224']:['#ff5ad0','#ffc2ef','255,90,208'];var gl=awake&&!still?.35+.3*Math.sin(t*3+gc):.4;
    glow(x,gsx+1,ggy-1,gcol[2],gl,6);R(x,gsx,ggy-3,2,4,gcol[0]);R(x,gsx-2,ggy-1,2,2,gcol[0]);R(x,gsx+2,ggy-2,1,3,gcol[0]);R(x,gsx,ggy-3,1,1,gcol[1]);}
  // craters on the track (world-anchored)
  var cs=Math.floor((off-40)/70);for(var cc=cs;cc<cs+8;cc++){if(hash(cc*7+3)<.45)continue;var cwx=cc*70+hash(cc)*40,csx=Math.round(cwx-off);if(csx<-10||csx>W+10)continue;var cgy=Math.round(nearH(cwx,H));ell(x,csx,cgy+5,5,1,GT[3]);R(x,csx-4,cgy+4,8,1,GT[1]);}
  // coins + fuel can on the track
  var ks=Math.floor((off)/52);for(var kc=ks;kc<ks+8;kc++){var kwx=kc*52+26,ksx=Math.round(kwx-off);if(ksx<-8||ksx>W+8)continue;if(ksx<W*BXF+30)continue;var kgy=Math.round(nearH(kwx,H))-8-Math.round(awake&&!still?Math.sin(t*4+kc)*1.5:0);
    if(hash(kc*13)<.18){R(x,ksx-3,kgy-3,7,8,INK);R(x,ksx-2,kgy-2,5,6,'#ff4a5a');R(x,ksx-2,kgy-2,5,1,'#ff9aa2');R(x,ksx-1,kgy-4,2,2,'#555a6a');R(x,ksx-1,kgy,3,1,'#ffd24a');}
    else{var sp=awake&&!still?Math.abs(Math.cos(t*5+kc)):1;var cw=Math.max(1,Math.round(3*sp));R(x,ksx-cw-1,kgy-4,cw*2+2,9,INK);R(x,ksx-cw,kgy-3,cw*2,7,'#ffd24a');if(cw>1){R(x,ksx-cw,kgy-3,cw*2,1,'#fff2a8');R(x,ksx-1,kgy-1,2,3,'#c89a20');}}}
  // buggy
  var bx=Math.round(W*BXF),wr=6,half=Math.round(11*BK);
  var g1=nearH(bx-half+off,H),g2=nearH(bx+half+off,H);var ang=Math.atan2(g2-g1,half*2);var cy=(g1+g2)/2-wr;
  var jump=0,flip=0;if(awake&&!still){var cyc=t%7;if(cyc>4.2&&cyc<5.7){var u2=(cyc-4.2)/1.5;jump=Math.sin(u2*Math.PI)*H*.24;flip=-u2*Math.PI*2;flip=-(1-Math.cos(u2*Math.PI))/2*Math.PI*2;}}
  var bob=awake&&!still&&!jump?Math.round(Math.sin(t*14)*.8+Math.sin(t*5.3)*.6):0;
  var spin=awake&&!still?t*SPD/wr:.6;
  // shadow on ground while airborne
  if(jump>2){var sw2=Math.max(3,Math.round(14-jump*.15));x.globalAlpha=.45;ell(x,bx,Math.round(nearH(bx+off,H))+1,sw2,1,'#000');x.globalAlpha=1;}
  // exhaust puffs + dust
  if(awake&&!still){for(var e=0;e<6;e++){var ep=((t*2.2+e/6)%1);var ex=bx-26-ep*26,ey=cy-jump-8-ep*10+Math.sin(e*2+t*3)*2;x.globalAlpha=(1-ep)*.7;var esz=1+Math.round(ep*3);R(x,ex,ey,esz,esz,ep<.25?'#ffd24a':ep<.5?'#ff8a3a':'#8a7aa8');}x.globalAlpha=1;
    if(!jump){for(var d=0;d<8;d++){var dp=((t*3+d/8)%1);var dx=bx-half-2-dp*22,dgy=nearH(dx+off,H)-1-Math.sin(dp*Math.PI)*6;x.globalAlpha=(1-dp)*.8;R(x,dx,dgy,1+(d&1),1,'#c6b0ff');}x.globalAlpha=1;}}
  // body (rotated around the axle midpoint)
  x.save();x.translate(bx,Math.round(cy-jump+bob));x.rotate(ang+flip);
  var B=L.buggy;x.drawImage(B,-Math.round(B.width/2),-B.height+5);
  wheel(x,-half,0,wr,spin);wheel(x,half,0,wr,spin);
  x.restore();
  // headlight beam
  if(awake){x.save();x.translate(bx,cy-jump+bob);x.rotate(ang+flip);x.globalCompositeOperation='lighter';var gb=x.createLinearGradient(16,0,60,0);gb.addColorStop(0,'rgba(255,230,140,.35)');gb.addColorStop(1,'rgba(255,230,140,0)');x.fillStyle=gb;x.beginPath();x.moveTo(24,-13);x.lineTo(78,-26);x.lineTo(78,2);x.lineTo(24,-9);x.fill();x.restore();x.globalCompositeOperation='source-over';}
  // "FLIP!" pop
  if(awake&&!still){var cy2=t%7;if(cy2>5.55&&cy2<6.4){var fa=1-(cy2-5.55)/.85;x.globalAlpha=Math.min(1,fa*1.6);P.text(x,'FLIP! +50',bx-6,Math.round(cy-34-(1-fa)*8),1,'#ffd24a',{glow:'rgba(255,210,74,.8)'});x.globalAlpha=1;}}
  // HUD hint: tiny distance counter (bottom-left, like the game)
  var dist=Math.floor(still?128:128+t*SPD/8);P.text(x,dist+'M',6,H-12,1,'#c8ffd0',{glow:'rgba(60,255,90,.6)'});
  // title with shimmer
  var T=L.title,tdx=Math.round((W-T.width)/2),tdy=Math.round(H*.035);x.drawImage(T,tdx,tdy);
  if(awake&&!still){var sh=(t*.6)%1.6;if(sh<1){x.drawImage(shim(T,sh),tdx,tdy);}}
  x.drawImage(L.over,0,0);}
function glow(x,cx,cy,rgb,a,r){var g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba('+rgb+','+(a*.75)+')');g.addColorStop(1,'rgba('+rgb+',0)');x.globalCompositeOperation='lighter';x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);x.globalCompositeOperation='source-over';}
var SH=null;function shim(T,p){if(!SH||SH[0].width!==T.width)SH=mk(T.width,T.height);var c=SH[0],x=SH[1];x.clearRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';x.drawImage(T,0,0);x.globalCompositeOperation='source-in';
  var cx=-30+p*(c.width+60);var g=x.createLinearGradient(cx-14,0,cx+14,c.height);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over';return c;}

/* ---------- interaction (same behaviour as keyart-croak.js) ---------- */
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
function mount(cv){if(cv._ka)return;cv._ka=1;var trig=cv.closest('[data-keyart-trigger]')||cv.parentNode;var raf=0,t0=0,active=false,last=0;
  draw(cv,0,false);
  function frame(ms){if(!active)return;raf=requestAnimationFrame(frame);if(ms-last<33)return;last=ms;draw(cv,(ms-t0)/1000+0.2,true);}
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
function mountAll(root){[].slice.call((root||document).querySelectorAll('canvas.keyart[data-art="orbit-hills"]')).forEach(mount);}
// chain onto the shared hook that site.js calls after building the grid
var prev=window.LAGKeyArt||{};
window.LAGKeyArt={draw:prev.draw,mount:prev.mount,layers:prev.layers,
  mountAll:function(root){if(prev.mountAll)prev.mountAll(root);mountAll(root);}};
window.LAGKeyArtOrbit={draw:draw,mount:mount,mountAll:mountAll,layers:layers};
if(document.readyState!=='loading')mountAll();else document.addEventListener('DOMContentLoaded',function(){mountAll();});
})();
