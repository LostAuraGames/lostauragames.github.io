/* Lost Aura Games - pixel helpers: bitmap font, logo, aura emblem, animated CRT background.
   Plain JS, no dependencies. */
(function(){
'use strict';
var FONT={A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,17,25,21,19,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,10,4,4,4,4],Z:[31,1,2,4,8,16,31],
'0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],'3':[31,2,4,2,1,17,14],'4':[2,6,10,18,31,2,2],'5':[31,16,30,1,1,17,14],'6':[6,8,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],'9':[14,17,17,15,1,2,12],'&':[12,18,20,8,21,18,13],'!':[4,4,4,4,4,0,4],'-':[0,0,0,31,0,0,0],"'":[4,4,8,0,0,0,0],'.':[0,0,0,0,0,12,12],'?':[14,17,1,2,4,0,4],':':[0,12,12,0,12,12,0],' ':[0,0,0,0,0,0,0],'/':[1,1,2,4,8,16,16],',':[0,0,0,0,12,4,8],'#':[10,10,31,10,31,10,10],'+':[0,4,4,31,4,4,0]};
var BONE='#e8dcb5',PURPLE='#b04cff',BLUE='#3a7bff';

/* Draw text in the chunky pixel font. Returns width in px. */
function text(ctx,str,x0,y0,s,fill,opts){opts=opts||{};str=String(str).toUpperCase();var adv=opts.adv||6;
  function draw(ox,oy,col){ctx.fillStyle=col;for(var k=0;k<str.length;k++){var g=FONT[str[k]]||FONT[' '];for(var r=0;r<7;r++)for(var b=0;b<5;b++)if(g[r]&(16>>b))ctx.fillRect(x0+(k*adv+b+ox)*s,y0+(r+oy)*s,s,s);}}
  if(opts.glow){ctx.save();ctx.shadowColor=opts.glow;ctx.shadowBlur=s*4;draw(0,0,opts.glow);ctx.restore();}
  var o=[[-1,0],[1,0],[0,-1],[0,1],[1,1],[-1,-1],[1,-1],[-1,1],[2,2],[1,2],[2,1]];for(var i=0;i<o.length;i++)draw(o[i][0],o[i][1],'#000');
  draw(0,0,fill);
  if(opts.shade){ctx.save();ctx.globalCompositeOperation='source-atop';ctx.restore();}
  return (str.length*adv-1)*s;}
function textW(str,s,adv){return (String(str).length*(adv||6)-1)*s;}

/* The aura emblem: a pixel halo ring around a cross-star. Drawn on a 32x32 grid scaled by s. */
function emblem(ctx,x0,y0,s,t){t=t||0;
  function p(x,y,c){ctx.fillStyle=c;ctx.fillRect(x0+x*s,y0+y*s,s,s);}
  // ring
  var cx=15.5,cy=15.5;
  for(var y=0;y<32;y++)for(var x=0;x<32;x++){var d=Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));
    if(d>=13.6&&d<15.6)p(x,y,'#000');
    else if(d>=11.6&&d<13.6){var a=Math.atan2(y-cy,x-cx);var k=(Math.sin(a*3+t*2)+1)/2;p(x,y,k>.5?PURPLE:'#7a2acc');}
    else if(d>=10.6&&d<11.6)p(x,y,BONE);
    else if(d>=9.6&&d<10.6)p(x,y,'#000');
    else if(d<9.6)p(x,y,'#06040c');}
  // star cross
  var tw=Math.round((Math.sin(t*3)+1)*1.2);
  for(var i=-5-tw;i<=5+tw;i++){p(15+i,15,'#9fc0ff');p(16+i,16,'#9fc0ff');p(15,15+i,'#9fc0ff');p(16,16+i,'#9fc0ff');}
  for(var i=-3;i<=3;i++){p(15+i,15,BLUE);p(15,15+i,BLUE);}
  p(15,15,'#fff');p(16,16,'#fff');p(16,15,'#fff');p(15,16,'#fff');
  // sparkle pixels on ring
  p(4,8,'#fff');p(27,23,'#fff');p(24,4,'#9fc0ff');
}

/* Full logo: emblem + LOST AURA / GAMES. Draws into canvas sized to fit; s = pixel size. */
function logo(canvas,s,t){var w1=textW('LOST AURA',s),w2=textW('GAMES',s*0.6|0||1);var es=Math.max(1,Math.round(s*0.9));var ew=32*es;
  var W=ew+s*3+Math.max(w1,w2)+s*4,H=Math.max(32*es,(7+2)*s+7*Math.max(1,Math.round(s*.6))+s*4)+s*2;
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  var ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);
  emblem(ctx,0,Math.round((H-ew)/2),es,t);
  var tx=ew+s*3,s2=Math.max(1,Math.round(s*.6));var th=7*s+s*2+7*s2;var ty=Math.round((H-th)/2);
  text(ctx,'LOST AURA',tx,ty,s,BONE,{glow:'rgba(176,76,255,.55)'});
  text(ctx,'GAMES',tx+s,ty+7*s+s*2+s,s2,'#9fc0ff',{glow:'rgba(58,123,255,.6)',adv:7});
  return canvas;}

/* Animated background: green CRT grain + twinkling blue cross stars. */
function background(canvas){var ctx=canvas.getContext('2d');var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W,H,stars=[],noise=null,frame=0;
  function rs(){var d=Math.min(2,window.devicePixelRatio||1);W=Math.ceil(window.innerWidth/3);H=Math.ceil(window.innerHeight/3);canvas.width=W;canvas.height=H;
    stars=[];var n=Math.round(W*H/2600);for(var i=0;i<n;i++)stars.push({x:Math.random()*W|0,y:Math.random()*H|0,p:Math.random()*6.28,s:Math.random()<.25?2:1,sp:.5+Math.random()*1.5});
    noise=ctx.createImageData(W,H);}
  function draw(t){ctx.fillStyle='#020403';ctx.fillRect(0,0,W,H);
    var d=noise.data;for(var i=0;i<d.length;i+=4){var r=Math.random();if(r<.11){var g=40+Math.random()*120|0;d[i]=g*.25|0;d[i+1]=g;d[i+2]=g*.35|0;d[i+3]=255*(r<.02?.9:.45)|0;}else d[i+3]=0;}
    var tmp=draw.tmp||(draw.tmp=document.createElement('canvas'));if(tmp.width!==W||tmp.height!==H){tmp.width=W;tmp.height=H;}tmp.getContext('2d').putImageData(noise,0,0);ctx.drawImage(tmp,0,0);
    for(var k=0;k<stars.length;k++){var st=stars[k];var a=(Math.sin(t*st.sp+st.p)+1)/2;if(a<.15)continue;ctx.globalAlpha=a;ctx.fillStyle=a>.85?'#9fc0ff':BLUE;var L=st.s+(a>.7?1:0);ctx.fillRect(st.x-L,st.y,L*2+1,1);ctx.fillRect(st.x,st.y-L,1,L*2+1);}
    ctx.globalAlpha=1;}
  rs();window.addEventListener('resize',rs);
  if(reduce){draw(1);return;}
  var last=0;function loop(ms){requestAnimationFrame(loop);if(document.hidden)return;if(ms-last<66)return;last=ms;draw(ms/1000);}requestAnimationFrame(loop);}

window.LAGPixel={FONT:FONT,text:text,textW:textW,emblem:emblem,logo:logo,background:background,BONE:BONE,PURPLE:PURPLE,BLUE:BLUE};
})();
