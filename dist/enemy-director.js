import {ENEMY_TYPES} from './enemy-roster.js';
import {roundTuning} from './rounds.js';
const wild=new Set(['packarachnid','spidertoad','skeeter','stalker','growth','tech-drone','sonic-scorpion','oil-ogre','magma-hulk','eyebulb','extremospawn']);
export function enemyWeight(id,wave,map){
 const cfg=ENEMY_TYPES[id];if(!cfg||wave<cfg.fromWave||cfg.toWave&&wave>cfg.toWave)return 0;
 if(map.id==='camp-kidney'&&!wild.has(id))return 0;
 const target=Math.min(5,1+Math.floor((wave-1)/7)),age=cfg.toWave?Math.min(1,(cfg.toWave-wave+1)/4):1;
 const affinity=Object.values(map.enemies||{}).includes(id)?1.8:1;
 return Math.max(.18,1.8-Math.abs(cfg.tier-target)*.6)*age*affinity;
}
function pick(pool,random){const sum=pool.reduce((n,p)=>n+p.weight,0);let value=random()*sum;for(const p of pool){value-=p.weight;if(value<=0)return p.id}return pool.at(-1)?.id}
export function planEnemyWave(wave,map,random=Math.random){
 const tuning=roundTuning(wave),surge=wave%4===0,count=tuning.count+(surge?6:0);
 let pool=Object.entries(ENEMY_TYPES).map(([id,cfg])=>({id,cfg,weight:enemyWeight(id,wave,map)})).filter(p=>p.weight>0);
 const ordinary=pool.filter(p=>!p.cfg.elite),queue=[];
 for(let i=0;i<count;i++){
  const rangedLimit=wave<2?0:Math.ceil((i+1)*(wave<7?.18:.25));
  const ranged=queue.filter(id=>ENEMY_TYPES[id].ranged).length;
  const candidates=ordinary.filter(p=>!p.cfg.ranged||ranged<rangedLimit);
  let id=pick(candidates.length?candidates:ordinary,random);
  // Avoid a long identical run while preserving the authored weighted mixture.
  if(queue.length>=2&&queue.at(-1)===id&&queue.at(-2)===id){const alternatives=candidates.filter(p=>p.id!==id);if(alternatives.length)id=pick(alternatives,random)}
  if(id)queue.push(id);
 }
 if(wave>=3){for(const [role,slot]of [['ranged',Math.floor(count/3)],['runner',Math.floor(count*2/3)]]){const specialists=ordinary.filter(p=>p.cfg[role]);if(specialists.length&&!queue.some(id=>ENEMY_TYPES[id][role]))queue[slot]=pick(specialists,random)}}
 if(wave%5===0){let elites=pool.filter(p=>p.cfg.elite);if(!elites.length)elites=Object.entries(ENEMY_TYPES).filter(([,c])=>c.elite).sort((a,b)=>a[1].fromWave-b[1].fromWave).slice(0,1).map(([id,cfg])=>({id,cfg,weight:1}));for(let i=0;i<tuning.eliteCount;i++)queue.push(pick(elites,random))}
 return queue;
}
export function takeEnemySpawn(queue,living){
 const ranged=living.filter(e=>!e.dead&&ENEMY_TYPES[e.type].ranged).length;
 const index=queue.findIndex(id=>!ENEMY_TYPES[id].ranged||ranged<4);
 return index<0?null:queue.splice(index,1)[0];
}
