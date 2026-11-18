import {buildBunkerDressingPlan} from './bunker-dressing-plan.js';
import review from './assets/reference-bunker/review.js';
import data from './assets/reference-bunker/data.js';
const radians=Math.PI/180;
const entity=id=>data.entities.find(e=>e.id===id);
const near=(x,z,y=0)=>{let best,cost=Infinity;for(const n of data.nav.nodes){const score=Math.hypot(n.x-x,n.z-z)+Math.abs(n.y-y)*8;if(score<cost){cost=score;best=n}}return {x:best.x,z:best.z,floorY:best.y}};
const gates=[2,110,111].map((id,i)=>{const e=entity(id),brushes=data.brushes.filter(b=>e.brushIds.includes(b.id)),min=[0,1,2].map(a=>Math.min(...brushes.map(b=>b.min[a]))),max=[0,1,2].map(a=>Math.max(...brushes.map(b=>b.max[a])));return {id:'source-door-'+id,sourceEntityId:id,brushIds:e.brushIds,unlock:'door-'+id,x:(min[0]+max[0])/2,z:(min[2]+max[2])/2,w:max[0]-min[0],d:max[2]-min[2],h:max[1]-min[1],base:min[1],cost:Number(e.properties.cost),name:['CONTAINMENT','INTAKE STAIRS','RESEARCH STAIRS'][i]}});
const stations=gates.map(g=>({id:g.id,kind:'gate',unlock:g.unlock,cost:g.cost,label:'OPEN '+g.name,sub:g.cost+' taros',asset:'console',sourceEntityId:g.sourceEntityId,zone:0,...near(...({2:[3.7,-4.2,0],110:[3.5,10.3,.6],111:[1.2,-15.5,.2]}[g.sourceEntityId]))}));
const replacements={bar:'rotation',tom:'cyber-auto',tre:'cheezooka',double:'sharkbite',kar:'recon',m1a1:'beamer',off:'gatling-gum',gre:'thumper'};
for(const e of data.entities.filter(e=>e.properties.classname==='weapon_wall')){
 const p=e.origin,a=Number(e.properties.angles?.split(' ')[1]||0)*radians,nx=Math.sin(a),nz=Math.cos(a),key=e.properties.targetname,weapon=replacements[key]||'rifle',trigger=data.entities.find(t=>t.properties.classname==='buy_weapon'&&t.properties.target===key);
 stations.push({id:'source-wall-'+e.id,sourceEntityId:e.id,kind:'wall',weapon,cost:Number(trigger?.properties.cost||850),zone:0,label:weapon.toUpperCase(),sub:'Wall weapon',asset:'console',displayScale:.58,displayLift:.65,mount:{x:p[0],z:p[2],nx,nz},...near(p[0]+nx*1.15,p[2]+nz*1.15,p[1]-1.5)});
}
const box=entity(3).origin;
stations.push({id:'source-box',kind:'mystery',sourceEntityId:3,cost:950,zone:0,label:'NANO SUPPLY BOX',sub:'Random weapon / 950 taros',asset:'crate',sourceAnchor:box,fixture:{x:box[0]+1.4,z:box[2],floorY:0,rotation:Math.PI/2},...near(box[0]+2.65,box[2],0)});
// New survival services occupy source prop alcoves; their status is explicit in the reader.
for(const [id,kind,x,z,y,label,asset,ax,az,sourceAnchorId]of [['bunker-ammo','ammo',3.2,23.4,0,'AMMO CACHE','vending',1.8,23.4,84],['bunker-armor','armor',-.4,30.3,0,'ARMOR STATION','vending',-.4,28.7,262],['power','power',14.6,-15.8,0,'DEXLABS POWER','console',14.6,-14.4,80],['upgrade','upgrade',14,-15.5,3.6,'NANO-FORGE','console',14,-14,undefined],['evac','evac',-5.2,-10,3.6,'EMERGENCY UPLINK','console',-3.8,-10,undefined]])stations.push({id,kind,zone:0,label,asset,sourceAnchorId,addedService:true,fixture:{x,z,floorY:y},sub:kind==='power'?'Restore the forge':kind==='evac'?'Extract after wave 10':'Supply station',...near(ax,az,y)});
const spawns=data.entities.filter(e=>e.properties.classname==='item_barricade').map(e=>{const p=e.origin,a=Number(e.properties.angles?.split(' ')[1]||0)*radians;return {zone:0,sourceEntityId:e.id,...near(p[0]+Math.cos(a)*.9,p[2]-Math.sin(a)*.9,p[1]-1.6)}});
export const REFERENCE_MAP={
 id:'dexlabs-bunker',name:'Dexlabs Bunker',title:'Containment breach',biome:'DEXTECH RESEARCH ANNEX',tagline:'The lab has gone dark. Keep the signal alive.',
 description:'Secure the intake, restore the containment power, and hold observation until extraction. Two stair routes connect the floors of the overrun DexTech annex.',route:'Equipment Intake / Containment / Observation',difficulty:'Close quarters',elevation:3.6,
 bounds:{minX:-7,maxX:26.4,minZ:-20.4,maxZ:32.4},start:{x:0,z:0,floorY:0,yaw:-Math.PI/2+158*radians},menu:{position:[1.5,2.4,5],target:[1,1.7,-4.5]},
 split:100,north:-100,zones:['DEXLABS BUNKER','HELP ROOM','UPPER HOLDOUT'],palette:{sky:'#203c55',top:'#0a162c',fog:'#203c55',ground:'#53665d',sun:'#abc6ed',light:1.4,accent:'#79d6e4'},
 dressing:buildBunkerDressingPlan(data),reference:{asset:'reference-bunker',data,source:data.source,review},enemyHeightCap:1.8,
 buildings:[],cover:[],dividers:[],walls:[],trunks:[],fixtureColliders:[],architecture:[],overhead:[],platforms:[],ramps:[],paths:[],districts:[],wayfinding:[],trees:[],rooms:[],gates,stations,spawns,
 enemies:{base:'spawn',ranged:'gas',runner:'spidertoad',elite:'asphalt'},enemyNames:['Fusion Spawn','Noxious Spawn','Spider Toad','Asphalt Destroyer'],
 landmarks:[{x:0,z:16,name:'EQUIPMENT INTAKE'},{x:12,z:-11,name:'CONTAINMENT'},{x:8,z:-11,name:'OBSERVATION',floorY:3.6}],
 checkpoints:review.cameraCheckpoints.map(c=>({name:c.id.replaceAll('-',' '),position:c.eye,target:c.target}))
};
