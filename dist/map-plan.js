// Spatial plans are gameplay geometry: rooms, banks and walls shape routes before set dressing.
const block=(id,x,z,w,d,h,style='masonry')=>({id,x,z,w,d,h,style});
const room=(name,x,z,w,d,h,axis='z',door=5.5)=>({name,x,z,w,d,h,axis,door});
const district=(name,x,z,w,d,surface,color)=>({name,x,z,w,d,surface,color});
const route=(points,width=5)=>({points,width,linear:true});
export function planMap(map){
 const city=map.id==='sector-v',forest=map.id==='camp-kidney';
 map.architecture=[];map.districts=[];map.wayfinding=[];
 if(city){
  map.description='A connected city block: shop street, fountain square, covered arcade and depot. The service roof overlooks the plaza; two yard entrances reconnect beneath the monorail.';
  map.buildings=map.buildings.filter(b=>b.id!=='garden-pavilion');map.trees=map.trees.map(t=>t.x===-8&&t.z===-42?{...t,x:-47,z:-42}:t);
  map.rooms.push(room('RELAY HALL',0,-42.3,14,5.6,4.6,'x',4.2));
  map.rooms.push(room('JELLY ARCADE',-9,3,10,20,4.8),room('REACTOR CONTROL',18,2,12,12,5,'x',6));
  map.cover=map.cover.filter(b=>!(b.asset==='car'&&b.x===-7)).map(b=>b.asset==='yard-cylinder'&&b.x===22?{...b,x:30,z:1}:b);
  map.buildings.push({id:'east-shop-block',asset:'town-building-4',x:-5,z:36,w:12,d:14,h:16,rotation:0});
  map.architecture.push(block('plaza-east-return',-16,17,8,.65,2.5),block('reactor-court-screen',17,14,12,.7,3),block('depot-service-return',35,34,.7,12,3.2));
  map.spawns=map.spawns.map(s=>s.x===-3&&s.z===37?{...s,x:-1,z:25}:s);
  map.stations=map.stations.map(s=>s.id==='power'?{...s,x:18,z:1,label:'REACTOR CONTROL / POWER'}:s.id==='evac'?{...s,x:0,z:-42.3}:s);
  map.districts=[district('SHOP STREET',-26,29,39,12,'concrete','#a5b7bc'),district('FOUNTAIN SQUARE',-23,3,29,28,'concrete','#c6c4ad'),district('SERVICE ALLEY',-44,-8,5,33,'road','#6f838c'),district('DEPOT FORECOURT',24,25,32,28,'concrete','#9ba9ad'),district('REACTOR COURT',23,-8,34,24,'ground','#8f9996')];
  map.paths=[route([[-39,28],[-39,19],[-25,19],[-25,26],[-12,26],[2,25],[14,25]],7),route([[-40,19],[-36,13],[-36,4],[-36,-8],[-29,-8],[-21,-8],[-21,-19],[-21,-25],[-12,-25]],4),route([[-25,19],[-22,18],[-21,12],[-17,11],[-17,-3],[-15,-3],[-15,-20],[-9,-20],[2,-14],[13,-14]],5),route([[2,25],[10,25],[12,17],[24,17],[27,11],[26,-6],[24,-14],[13,-14]],6),route([[23,34],[23,26],[23,17],[39,17],[39,8],[44,8],[48,8],[48,-21],[31,-23]],5)];
  map.landmarks.push({x:-9,z:3,name:'JELLY ARCADE'},{x:23,z:26,name:'TRANSIT DEPOT'});
  map.wayfinding=[{x:-25,z:27,to:'FOUNTAIN / ARCADE',direction:'N',zone:0},{x:-42,z:-18,to:'SERVICE ROOF',direction:'E',zone:0},{x:13,z:23,to:'REACTOR CONTROL',direction:'N',zone:1},{x:28,z:-21,to:'MONORAIL RELAY',direction:'N',zone:1}];
 }else if(forest){
  map.description='A camp organized around a mess hall and fire clearing. Rock-lined creek banks funnel crossings onto two bridges; the boathouse links the watch trails before the canopy climb.';
  map.ramps=map.ramps.map(r=>r.id==='lookout-north'?{...r,z:-13,d:6}:r);
  map.cover=map.cover.map(b=>b.asset==='crate'&&b.x===17&&b.z===33?{...b,x:30,z:38}:b);
  map.trees=map.trees.map(t=>t.x===-7&&t.z===-10?{...t,x:-8,z:-18}:t);
  map.spawns=map.spawns.map(s=>s.x===0&&s.z===39?{...s,x:4}:s);
  map.buildings=map.buildings.filter(b=>!(b.asset==='forest-cabin-small'&&b.x===-25));
  map.rooms.push(room('LOOKOUT LODGE',0,-40,16,8,4.8,'x',5.5));
  map.rooms.push(room('MESS HALL',-20,8,12,10,4.6),room('CREEK BOATHOUSE',22,-8,14,10,4.8,'x',6));
  map.architecture.push(block('south-creek-bank',-2,36,4,16,.9,'bank'),block('middle-creek-bank',-3,8.5,4,27,.9,'bank'),block('north-creek-bank',-3,-17,4,12,.9,'bank'),block('camp-woodpile',-37,23,6,3,2.5,'timber'),block('ranger-garden-wall',37,37,8,1,1.6,'bank'));
  map.districts=[district('FIRE CLEARING',-25,25,24,18,'wild-ground','#9b9570'),district('MESS HALL GREEN',-20,8,19,20,'wild-grass','#718863'),district('CREEK LANDING',-3,25,14,6,'wild-stone','#98a08c'),district('RANGER GREEN',27,30,24,20,'wild-ground','#88916e'),district('BOATHOUSE TRAIL',23,-9,28,17,'wild-ground','#8d9271')];
  map.paths=[route([[-35,32],[-30,32],[-30,19],[-25,16],[-20,15],[-20,8],[-20,1],[-10,1],[-10,-12]],4.5),route([[-35,32],[-34,28],[-30,24],[-30,15],[-32,12],[-32,6],[-32,-5],[-25,-5],[-16,-5],[-16,-14],[-16,-17],[-10,-17]],4),route([[-25,27],[-12,25],[-2,25],[8,24],[13,24],[13,31],[22,31],[31,31],[32,34],[39,34],[39,28],[39,18]],4),route([[-19,-17],[-10,-17],[-4,-8],[7,-10],[15,-8],[22,-8],[32,-8],[43,-6]],4),route([[39,34],[47,32],[49,23],[49,-2],[37,-2],[32,-2],[32,-15],[29,-17]],4)];
  map.landmarks.push({x:-20,z:8,name:'MESS HALL'},{x:22,z:-8,name:'BOATHOUSE'});
  map.wayfinding=[{x:-17,z:26,to:'SOUTH BRIDGE / RANGER',direction:'E',zone:0},{x:-10,z:-10,to:'NORTH BRIDGE',direction:'E',zone:0},{x:18,z:23,to:'WATCH / RANGER',direction:'E',zone:1},{x:34,z:-16,to:'CANOPY RIDGE',direction:'N',zone:1}];
 }else{
  map.description='An enclosed working plant: dispatch bay, press lanes, sorting hall and loading dock. Conveyor walls break the yard into courts; crane ramps and the furnace circuit reconnect the route.';
  map.rooms.push(room('FURNACE CONTROL',0,-42.3,16,5.6,5,'x',4.2));
  map.rooms.push(room('SORTING HALL',19,-14,18,14,6),room('LOADING DOCK',32,38,16,10,5.5,'x',6));
  map.cover=map.cover.map(b=>b.asset==='waste-tire-stack'&&b.x===39?{...b,x:36,z:41}:b.asset==='crate'&&b.x===21&&b.z===37?{...b,x:20,z:40}:b);
  map.buildings=map.buildings.filter(b=>!(b.asset==='yard-cylinder'&&(b.x===18||b.x===28)));
  map.buildings.push({id:'press-maintenance',asset:'yard-garage',x:-8,z:15,w:11,d:13,h:6,rotation:0});
  map.architecture.push(block('press-baffle',-37,6,1,11,4,'industrial'),block('sorting-south-return',12,-2,11,.8,3.5,'industrial'),block('dispatch-yard-wall',-41,37,13,.8,3.4,'industrial'));
  map.stations=map.stations.map(s=>s.id==='mystery'?{...s,x:15,z:-17}:s);
  map.districts=[district('DISPATCH COURT',-27,29,26,20,'concrete','#8e9997'),district('PRESS LANES',-23,7,29,31,'ground','#a29174'),district('SORTING COURT',19,-14,24,19,'concrete','#929d97'),district('LOADING APRON',28,31,36,25,'concrete','#a8a58b'),district('CRANE SERVICE',31,5,26,21,'ground','#a5987c')];
  map.paths=[route([[-27,36],[-27,29],[-27,22],[-32,20],[-32,6],[-33,5],[-33,-1],[-33,-11],[-28,-11],[-14,-11],[-8,-11],[-4,-14]],5),route([[-27,22],[-17,22],[-16,5],[-7,3],[-3,-4],[-2,-11],[8,-10]],4.5),route([[-3,26],[12,25],[19,24],[25,24],[25,30],[44,30],[44,34],[41.5,34],[41.5,38],[32,38]],6),route([[8,-23],[19,-23],[19,-14],[19,-5],[9,-5]],4),route([[44,25],[46,16],[46,-3],[34,-4],[31,-18],[31,-23]],5)];
  map.landmarks.push({x:19,z:-14,name:'SORTING HALL'},{x:32,z:38,name:'LOADING DOCK'});
  map.wayfinding=[{x:-18,z:27,to:'PRESS / SORTING',direction:'N',zone:0},{x:-33,z:-19,to:'SCRAP OVERLOOK',direction:'E',zone:0},{x:12,z:24,to:'LOADING / CRANE',direction:'E',zone:1},{x:31,z:-20,to:'FURNACE / FORGE',direction:'N',zone:1}];
 }
 return map;
}
// Called after wall guns are assigned so their displays remain on actual architecture.
export function finishPlan(map){
 if(map.id==='camp-kidney')map.stations=map.stations.map(s=>s.id==='rifle'?{...s,x:-12.3,z:8,mount:{x:-13.8,z:8,nx:1,nz:0}}:s);
 if(map.id==='salvage-yard')map.stations=map.stations.map(s=>s.id==='wall-rotation'?{...s,x:-17,z:-43,mount:{x:-17,z:-44,nx:0,nz:1}}:s);
 map.overhead=map.rooms.flatMap(r=>[{id:r.name+' roof',x:r.x,z:r.z,w:r.w+.7,d:r.d+.7,h:.45,baseOffset:r.h,overhead:true},...[-1,1].map(side=>({id:r.name+' transom',x:r.x+(r.axis==='x'?side*r.w/2:0),z:r.z+(r.axis==='z'?side*r.d/2:0),w:r.axis==='z'?r.door:.4,d:r.axis==='x'?r.door:.4,h:r.h-3.25,baseOffset:3.25,overhead:true}))]);
 return map;
}
