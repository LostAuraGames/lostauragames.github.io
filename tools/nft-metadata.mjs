// MeowTeor Pro Items metadata generator. Writes the static metadata served under the contract's base URI
//   https://lostauragames.com/nft/meowteor/items/{id}  (and {id}.json), plus collection.json.
// Source of truth = Supabase get_nft_metadata (public RPC; fills Won By / Score / Mint Date after a claim).
// Offline (no network or --offline) it falls back to the built-in token list, so the base URI always resolves.
// Run: node tools/nft-metadata.mjs [--offline]   (the GitHub Action "nft-metadata" runs it every 15 min)
import fs from 'node:fs';import path from 'node:path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');const OUT=path.join(ROOT,'nft','meowteor');
const SB='https://fugfgorircipfntzopon.supabase.co';const KEY=process.env.SB_PUBLISHABLE_KEY||'';   // publishable (public) key only
const TOKENS=[[1,'ASTRAL SOVEREIGN','meowteor-2026-10-29','SKUFLER',145],[2,'SOLAR PHOENIX'],[3,'FROST MONARCH'],[4,'VOID REAPER'],[5,'EMERALD DRAGON KNIGHT'],
 [6,'NEON CYBER'],[7,'MOLTEN TITAN'],[8,'STORM SAMURAI'],[9,'CELESTIAL ANGEL'],[10,'ABYSSAL KRAKEN'],[11,'GOLDEN PHARAOH']];
function offline([id,name,ev,won,score]){return{name:name+' #'+id,description:'MeowTeor Pro Item. A 1 of 1 full-body space cat skin awarded to the Leaderboard Champion. Equip it in MeowTeor while this NFT is in your linked wallet.',
 image:`https://lostauragames.com/nft/meowteor/images/${id}.png`,animation_url:`https://lostauragames.com/nft/meowteor/images/${id}.gif`,external_url:'https://lostauragames.com/games/meowteor.html',
 attributes:[{trait_type:'Edition',value:'1 of 1'},{trait_type:'Rarity',value:'Unique'},{trait_type:'Total Minted',value:0,display_type:'number'},
  {trait_type:'Event',value:ev||'unassigned'},{trait_type:'Won By',value:won||'-'},{trait_type:'Score',value:score||0,display_type:'number'}]};}
async function live(id){if(!KEY||process.argv.includes('--offline'))return null;try{const r=await fetch(SB+'/rest/v1/rpc/get_nft_metadata',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token_id:id})});if(!r.ok)return null;const v=await r.json();return v&&v.name?v:null;}catch(e){return null;}}
fs.mkdirSync(path.join(OUT,'items'),{recursive:true});let changed=0;
// Pro skin art stays private until its event is decided: unassigned tokens get no public metadata (and no image).
for(const t of TOKENS){const m=(await live(t[0]))||(t[2]?offline(t):null);if(!m||(m.attributes||[]).some(a=>a.trait_type==='Event'&&a.value==='unassigned'))continue;const s=JSON.stringify(m,null,1)+'\n';
 for(const f of [String(t[0]),t[0]+'.json']){const p=path.join(OUT,'items',f);if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==s){fs.writeFileSync(p,s);changed++;}}}
const col={name:'MeowTeor Pro Items',description:'1 of 1 full-body space cat skins from MeowTeor by Lost Aura Games. Each one is won by a Leaderboard Champion and minted when the winner claims it.',
 image:'https://lostauragames.com/nft/meowteor/images/1.png',external_link:'https://lostauragames.com/games/meowteor.html'};
fs.writeFileSync(path.join(OUT,'collection.json'),JSON.stringify(col,null,1)+'\n');console.log('metadata files changed:',changed);
