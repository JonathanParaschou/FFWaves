import * as OUTPOST from './outpost-kit.js';
import {planMap,finishPlan} from './map-plan.js';
const bounds={minX:-52,maxX:52,minZ:-48,maxZ:44};
const p=(id,x,z,w,d,h,surface='concrete')=>({id,x,z,w,d,h,surface});
const ramp=(id,x,z,w,d,from,to,axis='z')=>({id,x,z,w,d,from,to,axis});
const prop=(asset,x,z,w,d,h,rotation=0)=>({asset,x,z,w,d,h,rotation});
function barriers(split,north,west,east){
 const gates=[{id:'yard-west',unlock:'yard',x:split,z:-10,w:1.1,d:10,h:3.6},{id:'yard-south',unlock:'yard',x:split,z:24,w:1.1,d:10,h:3.6},{id:'garden-west',unlock:'garden',x:west,z:north,w:10,d:1.1,h:3.6},{id:'garden-east',unlock:'garden',x:east,z:north,w:10,d:1.1,h:3.6}];
 const dividers=[{x:split,z:(north-15)/2,w:1.1,d:-15-north,h:3.6},{x:split,z:7,w:1.1,d:24,h:3.6},{x:split,z:37,w:1.1,d:14,h:3.6}];
 const gaps=[[-52,west-5],[west+5,east-5],[east+5,52]];for(const [a,b]of gaps)dividers.push({x:(a+b)/2,z:north,w:b-a,d:1.1,h:3.6});return {gates,dividers};
}
function stations({split,north,west,east,power,forge,refill,evac,names}){return [
 {id:'armory-plaza',kind:'armory',x:-35,z:27,label:'FIELD ARMORY',sub:'Weapons, ammunition & armor',asset:'vending',zone:0},
 {id:'rifle',kind:'weapon',weapon:'rifle',cost:700,x:-10,z:17,label:'PARTICLE RIFLE',sub:'Wall buy / 700 taros',asset:'console',zone:0},
 ...[-10,24].map((z,i)=>({id:i?'yard-gate':'yard-gate-north',kind:'gate',unlock:'yard',cost:750,x:split-3,z,label:'OPEN '+names[1],sub:'Two routes / 750 taros',asset:'console',zone:0})),
 {id:'power',kind:'power',cost:0,x:power[0],z:power[1],label:'RESTORE POWER',sub:'Activate the emergency network',asset:'console',zone:1},
 {id:'shotgun',kind:'weapon',weapon:'shotgun',cost:1000,x:43,z:31,label:'TWIST CANNON SHOTGUN',sub:'Wall buy / 1,000 taros',asset:'vending',zone:1},
 {id:'mystery',kind:'mystery',cost:850,x:19,z:-15,label:'MYSTERY CACHE',sub:'Random weapon / 850 taros',asset:'crate',zone:1},
 {id:'armory-yard',kind:'armory',x:45,z:16,label:'FIELD SUPPLY',sub:'Weapons, ammunition & armor',asset:'vending',zone:1},
 ...[west,east].map((x,i)=>({id:i?'garden-gate-east':'garden-gate',kind:'gate',unlock:'garden',cost:1000,x,z:north+3,label:'OPEN '+names[2],sub:'Requires power / 1,000 taros',asset:'console',zone:i?1:0})),
 {id:'upgrade',kind:'upgrade',cost:1800,x:forge[0],z:forge[1],label:'NANO-FORGE',sub:'Upgrade weapon / 1,800 taros',asset:'console',zone:2},
 {id:'nano-refill',kind:'nano',cost:400,x:refill[0],z:refill[1],label:'NANO RECHARGE',sub:'Recharge powers / 400 taros',asset:'vending',zone:2},
 {id:'evac',kind:'evac',cost:0,x:evac[0],z:evac[1],label:'EMERGENCY UPLINK',sub:'Extract after wave 10',asset:'antenna',zone:2}
 ];}
const urban={
 id:'sector-v',name:'Sector V',title:'Rooftop Relay',biome:'CITY / DUSK',tagline:'Street-level pressure. Rooftop escape routes.',
 description:'Circle the fountain, cross the service yard, then climb to the elevated monorail relay. Two ramps serve each upper route; the forge sits on an exposed overlook.',
 route:'Plaza > Reactor Yard > Skywalk',difficulty:'Balanced',elevation:6,split:5,north:-27,zones:['SIGNAL PLAZA','REACTOR YARD','SKYWALK'],
 bounds,start:{x:-25,z:30,yaw:0},menu:{position:[-5,13,40],target:[-24,4,-10]},
 palette:{sky:'#8ba8bc',top:'#234e72',fog:'#8ba8bc',ground:'#798d65',sun:'#ffdbab',light:2.4,accent:'#69e3f2'},
 buildings:OUTPOST.BUILDINGS,cover:[...OUTPOST.COVER,prop('car',-7,-3,3,5.2,1.7),prop('town-pickup',-39,32,3,5,1.5),prop('crate',31,-20,3,2.5,1.8)],
 dividers:OUTPOST.DIVIDERS,gates:OUTPOST.GATES,stations:OUTPOST.STATIONS.map(s=>({...s,z:s.id==='evac'?-40:s.z,label:s.label.replace('NANO GARDEN','SKYWALK')})),spawns:OUTPOST.SPAWNS.map(s=>({...s,z:s.x===-20?-43:s.z})),
 platforms:[p('maintenance-roof',-29.5,-8.5,25,9,3.6),p('monorail-deck',0,-43.5,104,9,6)],
 ramps:[ramp('roof-west',-36,4,8,16,3.6,0),ramp('roof-east',-21,-19,8,12,0,3.6),ramp('skywalk-west',-31,-33,10,12,6,0),ramp('skywalk-east',31,-33,10,12,6,0)],
 paths:[{points:[[-39,23],[-39,-15],[-10,-18],[-6,23],[-20,28],[-39,23]],width:8,closed:true},{points:[[-7,25],[20,25],[43,25],[43,-20],[15,-20],[6,-14]],width:7},{points:[[-31,-27],[-31,-43],[0,-43],[31,-43],[31,-27]],width:5}],
 enemies:{base:'spawn',ranged:'gas',runner:'robo',elite:'asphalt'},enemyNames:['Fusion Spawn','Noxious Spawn','Fusion Enforcer','Asphalt Destroyer'],
 landmarks:[{x:-23,z:3,name:'FOUNTAIN'},{x:-30,z:-8,name:'SERVICE ROOF'},{x:29,z:8,name:'REACTOR'},{x:0,z:-43,name:'MONORAIL RELAY'}],
 };
const forestNames=['SCOUT CAMP','CREEK WATCH','CANOPY RIDGE'];
const forest={
 id:'camp-kidney',name:'Camp Kidney',title:'Canopy Crossing',biome:'WILDS / NIGHTFALL',tagline:'Cabins, creek crossings, and an elevated forest trail.',
 description:'The camp loops around a creek. Climb the watch platform by either trail, restore its signal, and open both ramps to the ridge. Dense trees break distant sightlines.',
 route:'Scout Camp > Creek Watch > Canopy Ridge',difficulty:'Close encounters',elevation:5,split:10,north:-20,zones:forestNames,
 bounds,start:{x:-25,z:30,yaw:0},menu:{position:[-4,16,42],target:[-16,4,-10]},
 palette:{sky:'#557d83',top:'#112f4c',fog:'#557d83',ground:'#416247',sun:'#b6d4db',light:1.7,accent:'#93efcb'},
 buildings:[prop('forest-cabin',-44,12,11,13,8),prop('forest-cabin-small',-25,5,10,9,5.5),prop('forest-cabin',-39,-12,11,10,7),prop('forest-tent',-10,32,9,7,4),prop('forest-cabin-small',45,-13,10,10,6),prop('forest-watchtower',39,6,5,5,8)],
 cover:[prop('forest-campfire',-24,23,4,4,1),prop('forest-picnic-table',-37,34,5,2.5,1.2),prop('forest-log-bench',-20,17,4,1.6,1),prop('forest-tent',-43,37,7,6,3.4),prop('forest-picnic-table',23,-10,4.5,2,1.2),prop('forest-campfire',32,16,3,3,1),prop('crate',17,33,3,3,1.6)],
 ...barriers(10,-20,-26,28),
 stations:stations({split:10,north:-20,west:-26,east:28,power:[29,5],forge:[-27,-41],refill:[29,-41],evac:[0,-41],names:forestNames}),
 spawns:[{x:-48,z:-17,zone:0},{x:-6,z:-16,zone:0},{x:-46,z:25,zone:0},{x:0,z:39,zone:0},{x:14,z:-17,zone:1},{x:47,z:37,zone:1},{x:47,z:-5,zone:1},{x:16,z:39,zone:1},{x:-46,z:-44,zone:2},{x:45,z:-44,zone:2}],
 platforms:[p('watch-platform',36,11,24,22,3,'wild-stone'),p('canopy-ridge',0,-41,104,14,5,'wild-ground'),p('scout-lookout',-25,-5,22,10,2.4,'wild-ground')],
 ramps:[ramp('watch-west',19,7,10,8,0,3,'x'),ramp('watch-south',39,28,8,12,3,0),ramp('ridge-west',-26,-27,10,14,5,0),ramp('ridge-east',28,-27,10,14,5,0),ramp('lookout-south',-32,6,8,12,2.4,0),ramp('lookout-north',-16,-14,8,8,0,2.4)],
 paths:[{points:[[-34,30],[-11,22],[-10,9],[-15,-13],[-32,-16],[-35,13],[-34,30]],width:5,closed:true},{points:[[8,24],[30,32],[46,23],[46,-7],[24,-16],[9,-10]],width:4.5},{points:[[-26,-20],[-26,-41],[0,-41],[28,-41],[28,-20]],width:4}],
 enemies:{base:'packarachnid',ranged:'skeeter',runner:'spidertoad',elite:'growth'},reinforcements:['stalker'],enemyNames:['Pack Arachnid','Wild Stinger','Spider Toad','Ghoulish Growth'],
 landmarks:[{x:-24,z:23,name:'SCOUT CAMP'},{x:-3,z:9,name:'LEAKEY CREEK'},{x:36,z:11,name:'WATCH PLATFORM'},{x:0,z:-41,name:'CANOPY RIDGE'}],
 };
const wasteNames=['SCRAP EXCHANGE','CRUSHER WORKS','FURNACE GANTRY'];
const waste={
 id:'salvage-yard',name:'Salvage Yard',title:'Furnace Circuit',biome:'INDUSTRIAL / ASHFALL',tagline:'Scrap lanes below. Exposed gantries above.',
 description:'Thread the crushed-car lanes, climb the crane apron, and power the plant. The furnace gantry opens a high circuit between both halves of the yard.',
 route:'Scrap Exchange > Crusher Works > Furnace Gantry',difficulty:'Mixed threats',elevation:7,split:3,north:-25,zones:wasteNames,
 bounds,start:{x:-25,z:30,yaw:0},menu:{position:[-7,18,43],target:[17,7,-9]},
 palette:{sky:'#9a705a',top:'#452e38',fog:'#9a705a',ground:'#796a55',sun:'#ffc07a',light:2.2,accent:'#ffbc69'},
 buildings:[prop('yard-garage',-46,1,10,18,9),prop('waste-press',-24,9,11,10,9),prop('yard-garage',43,-13,14,13,10),prop('yard-cylinder',18,-16,5,5,11),prop('yard-cylinder',28,-17,5,5,13),prop('waste-crane',29,5,7,7,17),prop('yard-preservatory',47,38,7,6,8)],
 cover:[prop('waste-scrapcar',-38,19,4.5,7,2.2),prop('waste-tire-stack',-12,0,5,4,2.6),prop('waste-scrapcar',-16,34,4.5,6,2),prop('waste-forklift',16,29,4,5,3.6),prop('waste-tire-stack',39,31,4,4,2.8),prop('waste-cabinet',-36,-17,3,3,2.5),prop('waste-drum',40,-1,3,3,2.3),prop('crate',21,37,4,3,2)],
 ...barriers(3,-25,-31,31),
 stations:stations({split:3,north:-25,west:-31,east:31,power:[23,6],forge:[-23,-43],refill:[31,-43],evac:[0,-43],names:wasteNames}).map(s=>s.id==='mystery'?{...s,x:10,z:-18}:s),
 spawns:[{x:-46,z:30,zone:0},{x:-6,z:39,zone:0},{x:-44,z:-22,zone:0},{x:-5,z:-22,zone:0},{x:10,z:-22,zone:1},{x:46,z:26,zone:1},{x:45,z:-21,zone:1},{x:12,z:40,zone:1},{x:-46,z:-44,zone:2},{x:44,z:-44,zone:2}],
 platforms:[p('crane-apron',31,5,22,16,3.6),p('furnace-gantry',0,-43.5,104,9,7),p('scrap-overlook',-28,-11.5,18,9,2.4)],
 ramps:[ramp('crane-west',15.5,5,9,8,0,3.6,'x'),ramp('crane-south',36,20,8,14,3.6,0),ramp('furnace-west',-31,-32,10,14,7,0),ramp('furnace-east',31,-32,10,14,7,0),ramp('scrap-west',-33,-1,8,12,2.4,0),ramp('scrap-east',-14,-11,10,8,2.4,0,'x')],
 paths:[{points:[[-33,31],[-7,24],[-7,-16],[-24,-21],[-39,-15],[-38,30],[-33,31]],width:6,closed:true},{points:[[1,24],[24,28],[45,22],[44,-22],[16,-22],[2,-10]],width:6},{points:[[-31,-25],[-31,-43],[0,-43],[31,-43],[31,-25]],width:5}],
 enemies:{base:'crashloader',ranged:'shocktangler',runner:'scraptyrant',elite:'junkasaurus'},reinforcements:['dreadhead','unisickle','streetgrinder'],enemyNames:['Crash Loader','Shocktangler','Scrap Tyrant','Junkasaurus Wrecks'],
 landmarks:[{x:-24,z:9,name:'CAR PRESS'},{x:-28,z:-12,name:'SCRAP OVERLOOK'},{x:31,z:5,name:'CRANE APRON'},{x:0,z:-43,name:'FURNACE GANTRY'}],
 };
// Two-door interiors add sheltered supply runs without creating permanent dead ends.
urban.rooms=[{name:'TRANSIT DEPOT',x:23,z:26,w:14,d:16,h:4.7,axis:'z',door:6}];
forest.rooms=[{name:'RANGER STATION',x:22,z:31,w:12,d:10,h:5.2,axis:'x',door:5.5}];
waste.rooms=[{name:'CONTROL BAY',x:-27,z:29,w:16,d:10,h:5.6,axis:'z',door:6}];
urban.stations.push({id:'depot-supply',kind:'armory',x:19,z:23,label:'DEPOT SUPPLY',sub:'Weapons, ammunition & armor',asset:'vending',zone:1});
forest.stations.push({id:'ranger-supply',kind:'armory',x:22,z:33,label:'RANGER SUPPLY',sub:'Weapons, ammunition & armor',asset:'vending',zone:1});
waste.stations=waste.stations.map(s=>s.id==='armory-plaza'?{...s,x:-31,z:29}:s);
urban.trees=[[-33,13],[-13,13],[-44,-36],[-38,-43],[39,-44],[45,-36],[-49,20],[-8,-42]].map(([x,z])=>({asset:'tree',x,z,height:5.8}));
forest.trees=[[-48,-4,10],[-40,-24,12],[-7,-10,9],[-48,40,8],[4,6,9],[7,35,8],[48,3,12],[17,16,8],[48,-32,12],[-40,-39,11],[-14,-43,12],[15,-44,10],[38,-38,10]].map(([x,z,height])=>({asset:'forest-tree-twisted',x,z,height}));
waste.trees=[[-48,36],[-47,-20],[48,12],[48,-35],[-43,-40],[14,-44]].map(([x,z])=>({asset:'waste-metal-tree',x,z,height:9}));
function finish(map){map.trunks=map.trees.map(t=>({...t,w:.75,d:.75,h:3}));map.walls=[];for(const r of map.rooms){const thick=.35,h=r.h;if(r.axis==='z'){for(const side of [-1,1]){map.walls.push({x:r.x+side*r.w/2,z:r.z,w:thick,d:r.d,h});const segment=(r.w-r.door)/2;for(const edge of [-1,1])map.walls.push({x:r.x+edge*(r.door/2+segment/2),z:r.z+side*r.d/2,w:segment,d:thick,h})}}else{for(const side of [-1,1]){map.walls.push({x:r.x,z:r.z+side*r.d/2,w:r.w,d:thick,h});const segment=(r.d-r.door)/2;for(const edge of [-1,1])map.walls.push({x:r.x+side*r.w/2,z:r.z+edge*(r.door/2+segment/2),w:thick,d:segment,h})}}}return map}
function equipMap(map){
 const mounts=map.id==='sector-v'?{rifle:[-38.8,27,-40.4,27,1,0],shotgun:[39.7,29,41.4,29,-1,0]}:map.id==='camp-kidney'?{rifle:[-18.2,5,-19.9,5,1,0],shotgun:[22,37.8,22,36.28,0,1]}:{rifle:[-39.3,0,-40.9,0,1,0],shotgun:[41.7,38,43.4,38,-1,0]};
 map.stations=map.stations.map(s=>{if(s.kind==='armory')return {...s,kind:'ammo',label:'AMMO CACHE',sub:'Refill held weapon / 250+ taros'};if(s.kind==='mystery')return {...s,cost:950,label:'SUPPLY BOX',sub:'Roll a random weapon / 950 taros'};if(s.kind==='weapon'){const [x,z,mx,mz,nx,nz]=mounts[s.id];return {...s,kind:'wall',x,z,mount:{x:mx,z:mz,nx,nz}}}return s});
 const extra=map.id==='sector-v'?[[ 'heatblaster',-42.8,3,-44.4,3,1,0,0],['scattergun',14.2,26,15.7,26,-1,0,1],['rotation',18,-42,18,-43,0,1,2]]:map.id==='camp-kidney'?[['heatblaster',-44,20.2,-44,18.6,0,1,0],['scattergun',22.2,16,23.9,16,-1,0,1],['rotation',6,-41,6,-42,0,1,2]]:[['heatblaster',-32.8,26,-34.8,26,1,0,0],['scattergun',34.2,-10,35.9,-10,-1,0,1],['rotation',-8,-43,-8,-44,0,1,2]];
 for(const [weapon,x,z,mx,mz,nx,nz,zone]of extra)map.stations.push({id:'wall-'+weapon,kind:'wall',weapon,cost:weapon==='heatblaster'?850:weapon==='rotation'?1100:1250,x,z,zone,label:weapon.toUpperCase(),sub:'Wall weapon',asset:'console',mount:{x:mx,z:mz,nx,nz}});
 map.stations.push({id:'armor-cache',kind:'armor',x:-31,z:32,zone:0,label:'ARMOR STATION',sub:'75 armor / 500 taros',asset:'vending'});
 map.fixtureColliders=map.stations.filter(s=>s.kind==='mystery').map(s=>({x:s.x,z:s.z-2.2,w:1.8,d:.8,h:.85}));
 return map;
}
export const MAPS=[urban,forest,waste].map(planMap).map(finish).map(equipMap).map(finishPlan);
export const mapById=id=>MAPS.find(m=>m.id===id)||MAPS[0];
