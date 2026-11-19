import {nativeBlocked,sampleNativeHeight} from './native-terrain.js';
export function createNativeMap(data,catalog){
 const bounds=data.bounds,start=data.points.start;
 const definitions=[
  {id:'native-ammo-start',kind:'ammo',target:[start.x+6,start.z-1],label:'CITY AMMO CACHE',sub:'Refill held weapon / 250+ taros'},
  {id:'native-armor',kind:'armor',target:[start.x,start.z+7],label:'ARMOR STATION',sub:'75 armor / 500 taros'},
  {id:'native-rifle',kind:'wall',weapon:'rifle',cost:700,target:[start.x-10,start.z-7],label:'PARTICLE RIFLE',sub:'Wall weapon / 700 taros'},
  {id:'native-heatblaster',kind:'wall',weapon:'heatblaster',cost:850,target:[5,-13],label:'HEATBLASTER',sub:'Wall weapon / 850 taros'},
  {id:'power',kind:'power',target:[0,-44],label:'RESTORE CITY POWER',sub:'Enable the forge'},
  {id:'native-box',kind:'mystery',cost:950,target:[-54,-27],label:'SUPPLY BOX',sub:'Random weapon / 950 taros'},
  {id:'native-ammo-west',kind:'ammo',target:[-53,-9],label:'WEST STREET AMMO',sub:'Refill held weapon / 250+ taros'},
  {id:'native-shotgun',kind:'wall',weapon:'shotgun',cost:1000,target:[50,-43],label:'TWIST CANNON SHOTGUN',sub:'Wall weapon / 1,000 taros'},
  {id:'native-scattergun',kind:'wall',weapon:'scattergun',cost:1250,target:[-30,-43],label:'VERTICAL SCATTERGUN',sub:'Wall weapon / 1,250 taros'},
  {id:'native-rotation',kind:'wall',weapon:'rotation',cost:1100,target:[15,-55],label:'ROTATION RIFLE',sub:'Wall weapon / 1,100 taros'},
  {id:'upgrade',kind:'upgrade',cost:1800,target:[-56,10],label:'NANO-FORGE',sub:'Requires power / 1,800 taros'},
  {id:'native-recharge',kind:'nano',cost:400,target:[-55,-47],label:'NANO RECHARGE',sub:'Refill powers / 400 taros'},
  {id:'evac',kind:'evac',target:[15,-9],label:'EMERGENCY UPLINK',sub:'Extract after wave 10'}
 ];
 const stations=[];
 for(const definition of definitions){let position,score=Infinity;for(let z=bounds.minZ+4;z<bounds.maxZ-4;z++)for(let x=bounds.minX+4;x<bounds.maxX-4;x++){if(nativeBlocked(data,x,z,2.5)||stations.some(s=>Math.hypot(s.x-x,s.z-z)<6)||Math.hypot(start.x-x,start.z-z)<4)continue;const cost=Math.hypot(x-definition.target[0],z-definition.target[1]);if(cost<score){score=cost;position={x,z}}}if(!position)throw Error('Original region has no clear supply position for '+definition.id);const {target,...details}=definition,station={zone:0,asset:details.kind==='mystery'?'crate':details.kind==='evac'?'antenna':details.kind==='ammo'||details.kind==='armor'?'vending':'console',...details,...position};if(station.kind==='wall')station.mount={x:station.x+1.5,z:station.z,nx:-1,nz:0};stations.push(station)}

 return {
  id:'original-city',name:'Original City',title:'Recovered Courtyard',biome:'ORIGINAL FUSIONFALL REGION',tagline:'The original terrain and placed city geometry, at game scale.',
  description:'Fight through a recovered section of the original map. Terrain, streets and scenery retain their original placement; survival equipment is added for this game.',
  route:'Original streets / Open survival',difficulty:'Open survival',elevation:Math.round(Math.max(...data.heights)-Math.min(...data.heights)),split:bounds.maxX+100,north:bounds.minZ-100,zones:['ORIGINAL CITY','CITY POWER','CITY UPLINK'],bounds,start:{yaw:0,...start},openLayout:true,
  menu:{position:[start.x+12,sampleNativeHeight(data,start.x,start.z)+10,start.z+20],target:[start.x,2,start.z-15]},
  palette:{sky:'#95c8e5',top:'#428ec4',fog:'#95c8e5',ground:'#8ca47b',sun:'#fff0c8',light:2.3,accent:'#9ee9db'},
  native:{asset:catalog.id,terrain:data,source:catalog.source},
  buildings:[],cover:[],dividers:[],gates:[],rooms:[],walls:[],trunks:[],trees:[],architecture:data.obstacles||[],overhead:[],platforms:[],ramps:[],paths:[],districts:[],wayfinding:[],fixtureColliders:stations.filter(s=>s.kind==='mystery').map(s=>({x:s.x,z:s.z-2.2,w:1.8,d:.8,h:.85})),
  stations,spawns:data.points.spawns.map(p=>({zone:0,...p})),
  enemies:{base:'spawn',ranged:'gas',runner:'robo',elite:'asphalt'},enemyNames:['Fusion Spawn','Noxious Spawn','Heavy Hunter','Asphalt Freak Father'],landmarks:data.landmarks||[{x:start.x,z:start.z,name:'ORIGINAL CITY'}]
 };
}
