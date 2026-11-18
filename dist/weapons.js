import {EXPANDED_WEAPONS,WEAPON_SOUNDS} from './weapon-roster.js';
export const RARITIES=[{name:'STANDARD',color:'#c1cdd5',damage:1},{name:'UNCOMMON',color:'#9cdb87',damage:1.25},{name:'RARE',color:'#79bdff',damage:1.55},{name:'EPIC',color:'#d49bfa',damage:1.95},{name:'LEGENDARY',color:'#ffc579',damage:2.4}];
export const WEAPONS={
 pistol:{name:'Null Void Pistol',type:'SIDEARM',archetype:'pistol',asset:'weapon-pistol',mag:12,reserve:108,damage:31,pellets:1,interval:.23,reload:1.35,spread:.012,range:70,cost:250,color:'#b4e8ff'},
 rifle:{name:'Particle Rifle',type:'ASSAULT RIFLE',archetype:'rifle',asset:'weapon-rifle',mag:30,reserve:240,damage:25,pellets:1,interval:.092,reload:1.85,spread:.021,range:80,cost:700,color:'#9cf4c4'},
 shotgun:{name:'Twist Cannon Shotgun',type:'SCATTERGUN',archetype:'shotgun',asset:'weapon-shotgun',mag:8,reserve:64,damage:18,pellets:8,interval:.78,reload:2.25,spread:.095,range:28,cost:1000,color:'#ffd28b'},
 cannon:{name:'Bio-Plasma Cannon',type:'PLASMA LAUNCHER',archetype:'cannon',asset:'weapon-cannon',mag:4,reserve:28,damage:155,pellets:1,interval:1.05,reload:2.65,spread:.008,range:65,cost:1600,color:'#b8ff62',splash:6}
};
const additions={
 spitwad:{type:'SNIPER RIFLE',mag:5,reserve:60,damage:170,pellets:1,interval:1.05,reload:2.1,spread:.002,range:110,cost:1400,color:'#b8e7ff'},
 rotation:{type:'AUTOMATIC RIFLE',mag:42,reserve:294,damage:28,pellets:1,interval:.078,reload:2.15,spread:.025,range:75,cost:1100,color:'#9cf4c4'},
 heatblaster:{type:'ENERGY PISTOL',mag:14,reserve:126,damage:52,pellets:1,interval:.3,reload:1.6,spread:.012,range:65,cost:850,color:'#ffc797'},
 scattergun:{type:'HEAVY SCATTERGUN',mag:6,reserve:60,damage:21,pellets:10,interval:.9,reload:2.4,spread:.105,range:30,cost:1250,color:'#ffe49d'},
 marshmallow:{type:'EXPLOSIVE LAUNCHER',mag:3,reserve:30,damage:220,pellets:1,interval:1.2,reload:2.9,spread:.008,range:70,cost:1800,color:'#f7d4f3',splash:7.5},
 bracer:{type:'RAPID BLASTER',mag:24,reserve:216,damage:22,pellets:1,interval:.12,reload:1.7,spread:.019,range:60,cost:600,color:'#9ae5ff'}
};
export const MELEE_WEAPONS={fists:{id:'fists',name:'Emergency strike',damage:75,reach:3.3,cooldown:1,windup:.17,duration:.48,arc:.2,style:'club',color:'#c9eeff'}};
const meleeStats={blade:{damage:110,reach:3.4,cooldown:.85,windup:.16,duration:.52,arc:.1,color:'#a9efff'},heavy:{damage:190,reach:3,cooldown:1.35,windup:.3,duration:.78,arc:.25,color:'#ffc77c'},club:{damage:80,reach:3.1,cooldown:.58,windup:.12,duration:.4,arc:.1,color:'#d7e5ff'}};
export function configureWeapons(records=[]){for(const r of records){if(additions[r.id])WEAPONS[r.id]={...WEAPONS[r.id],...r,...additions[r.id]};else if(r.archetype==='melee')MELEE_WEAPONS[r.id]={...r,...meleeStats[r.style]}}return WEAPONS}
export function rollWeapon(round,owned=[],random=Math.random){const pool=Object.entries(WEAPONS).filter(([id])=>!owned.includes(id));const eligible=pool.length?pool:Object.entries(WEAPONS);const weighted=eligible.flatMap(([id,w])=>Array.from({length:w.archetype==='cannon'?Math.min(4,1+Math.floor(round/10)):4},()=>id));const id=weighted[Math.min(weighted.length-1,Math.floor(random()*weighted.length))];const chance=random(),boost=Math.min(.45,round*.013);const rarity=chance<.025+boost*.25?4:chance<.12+boost*.6?3:chance<.35+boost?2:chance<.72+boost*.5?1:0;return {id,rarity}}

const names={spitwad:['Spitwad Sniper Rifle','rifle'],rotation:['Rotation Rifle','rifle'],heatblaster:['Heatblaster','pistol'],scattergun:['Vertical Scattergun','shotgun'],marshmallow:['Marshmallow Launcher','cannon'],bracer:['Bracer Blaster','pistol']};configureWeapons(Object.entries(names).map(([id,[name,archetype]])=>({id,name,archetype,asset:'weapon-'+id,portrait:'assets/ui/weapon-'+id+'.webp'})));

Object.assign(WEAPONS,EXPANDED_WEAPONS);

for(const [id,sound]of Object.entries(WEAPON_SOUNDS))WEAPONS[id].sound=sound;
