const puppeteer=require('puppeteer-core');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/workspace/site';
const srv=http.createServer((q,r)=>{let f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}let b=fs.readFileSync(f);
 if(f.endsWith('games/meowteor/index.html'))b=Buffer.from(b.toString().replace('window.MEOWTEOR_UI=Object.freeze(','window.__E=s=>eval(s);window.MEOWTEOR_UI=Object.freeze('));
 r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':'text/html'});r.end(b);}).listen(8765);
(async()=>{const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
 async function page(blocked){const p=await br.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.setRequestInterception(true);
  p.on('request',q=>{if(q.url().includes('/functions/v1/meowteor-geo')){if(q.method()==='OPTIONS')return q.respond({status:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
   const b=JSON.parse(q.postData()||'{}');return q.respond({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify(b.action==='screen'?{blocked:true,sanctioned:true,message:'This wallet cannot use MeowTeor NFT features.'}:blocked?{blocked:true,message:'NFT features are not available in your region.'}:{blocked:false})});}q.continue();});p.errs=errs;return p;}
 let p=await page(true);await p.goto('http://localhost:8765/nft/meowteor/claim.html');await new Promise(r=>setTimeout(r,2500));
 let t=await p.$eval('main',e=>e.innerText);ok(/not available in your region/.test(t)&&!(await p.$('#bmm')),'claim page: blocked region message, no link buttons');ok(/DB-IP/.test(t),'claim page: DB-IP attribution');
 p=await page(false);await p.goto('http://localhost:8765/nft/meowteor/claim.html');await new Promise(r=>setTimeout(r,2500));
 ok(!!(await p.$('#bmm')),'claim page: normal region keeps link buttons');
 p=await page(true);await p.goto('http://localhost:8765/nft/meowteor/market.html');await new Promise(r=>setTimeout(r,3000));
 t=await p.$eval('#mkstate',e=>e.textContent);ok(/not available in your region/.test(t)&&await p.$eval('#mksell',e=>e.disabled),'market: blocked region, selling disabled');ok(/DB-IP/.test(await p.$eval('main',e=>e.innerText)),'market: attribution');
 for(const bl of [false,true]){p=await page(bl);await p.goto('http://localhost:8765/games/meowteor/index.html');await new Promise(r=>setTimeout(r,3000));
  await p.evaluate(()=>window.__E("CHAMP.nft={x:{token_id:12,status:'enabled'}};nftClaimChip()"));await new Promise(r=>setTimeout(r,1500));
  const c=await p.evaluate(()=>{const e=document.getElementById('nftchip');return e?e.tagName+'|'+e.textContent:'none';});
  ok(bl?/^DIV\|NFT features are not available/.test(c):/^A\|/.test(c),'game chip '+(bl?'blocked':'open')+': '+c);ok(!p.errs.length,'no page errors '+p.errs.join(';'));}
 await br.close();srv.close();process.exit(fails?1:0);})();
