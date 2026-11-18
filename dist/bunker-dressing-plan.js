import {BUNKER_PROP_BOUNDS} from './bunker-prop-bounds.js';
// Source-linked equipment bays. The structural map, doors and staircases stay intact.
export const BUNKER_ROOMS=[
 {id:'intake',name:'EQUIPMENT INTAKE',number:'01',color:'#d9ac61'},
 {id:'containment',name:'CONTAINMENT / POWER',number:'02',color:'#7acbbd'},
 {id:'control',name:'OBSERVATION / CONTROL',number:'03',color:'#87bfe0'}
];
export function bunkerRoomAt(player){return (player.floorY||0)>3?BUNKER_ROOMS[2]:player.z< -5.6?BUNKER_ROOMS[1]:BUNKER_ROOMS[0]}
export function propExtent(asset,{height,dimensions,rotation=0}={}){const b=BUNKER_PROP_BOUNDS[asset],size=dimensions||b.size.map(v=>v*(height?height/b.size[1]:1)),c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));return [size[0]*c+size[2]*s,size[1],size[0]*s+size[2]*c]}
export function equipmentBox(id,min,max,extra={}){return {id,min,max,planes:[[-1,0,0,-min[0]],[1,0,0,max[0]],[0,-1,0,-min[1]],[0,1,0,max[1]],[0,0,-1,-min[2]],[0,0,1,max[2]]],solid:true,movable:false,...extra}}
export function buildBunkerDressingPlan(data){
 const placements=[],colliders=[],surfaces=[],bays=[];
 function add(asset,x,y,z,options={}){const item={id:options.id||'lab-prop-'+placements.length,asset,x,y,z,rotation:0,...options},extent=propExtent(asset,item);item.extent=extent;placements.push(item);return item}
 function physical(item,{table=false}={}){
  const [w,h,d]=item.extent,min=[item.x-w/2,item.y,item.z-d/2],max=[item.x+w/2,item.y+h,item.z+d/2];
  let pieces=[[min,max]];
  if(table){const [lw,lh,ld]=item.dimensions,c=Math.cos(item.rotation),s=Math.sin(item.rotation),world=([x,y,z])=>[item.x+x*c+z*s,item.y+y,item.z-x*s+z*c];pieces=[[-lw/2,lh-.10,-ld/2,lw/2,lh,ld/2],[-lw/2,0,-ld/2,-lw/2+.10,lh,ld/2],[lw/2-.48,0,-ld/2,lw/2,lh,ld/2]].map(b=>{const corners=[];for(const x of [b[0],b[3]])for(const y of [b[1],b[4]])for(const z of [b[2],b[5]])corners.push(world([x,y,z]));return [0,1].map(hi=>[0,1,2].map(a=>Math[hi?'max':'min'](...corners.map(p=>p[a]))))})}
  for(const [i,[lo,hi]]of pieces.entries())colliders.push(equipmentBox(item.id+'-'+i,lo,hi,{dressing:true,assemblyId:item.assemblyId,sourceEntityId:item.sourceEntityId}));
  surfaces.push({min,max,floorY:item.room==='control'?3.6:0,assemblyId:item.assemblyId});item.physical=true;
 }
 function bench(id,room,x,z,floor,yaw,sourceEntityId,kind='research',endcaps=true){
  const bay={id,room,x,z,floor,yaw,sourceEntityId,padWidth:endcaps?3.6:2.4};bays.push(bay);
  const at=(dx,dz)=>({x:x+dx*Math.cos(yaw)+dz*Math.sin(yaw),z:z-dx*Math.sin(yaw)+dz*Math.cos(yaw)});
  const place=(asset,dx,dy,dz,options={})=>{const p=at(dx,dz);return add(asset,p.x,floor+dy,p.z,{rotation:yaw,assemblyId:id,room,sourceEntityId,...options})};
  physical(place('lab-table',0,0,0,{dimensions:[2.10,.78,.76],id:id+'-desk'}),{table:true});
  place('lab-field-device-b',-.53,.78,-.03,{height:.30});
  place(kind==='research'?'lab-research-head':'lab-robot-arm',.48,.78,.02,{height:kind==='research'?.43:.15,rotation:yaw+Math.PI/2});
  place('lab-beacon',.82,.78,-.20,{height:.23});
  place('lab-field-device-b',.34,0,-.02,{height:.36});
  if(kind==='maintenance')place('weapon-rifle',-.08,.80,.17,{height:.10,rotation:yaw+Math.PI/2});
  const chair=place('lab-metal-chair',-.45,0,.74,{height:.86,rotation:yaw+Math.PI,id:id+'-chair'});physical(chair);
  if(endcaps)for(const side of (Array.isArray(endcaps)?endcaps:[-1,1]))physical(place('lab-cabinet',side*1.45,0,0,{height:1.35,id:id+'-locker-'+side}));
  return bay;
 }
 // Long spawn wing: paired workcells, with the original windows and resupply approaches free.
 bench('intake-maintenance','intake',-5.55,7.4,0,Math.PI/2,199,'maintenance');
 bench('intake-inspection','intake',-5.55,24.5,0,Math.PI/2,262,'research',[-1]);
 const sign=add('lab-dextech-sign',-5.75,0,.2,{height:1.82,rotation:Math.PI/2,id:'intake-wayfinding',room:'intake',assemblyId:'intake-wayfinding',sourceEntityId:199});physical(sign);
 // Help room: the machinery belongs to one containment cell beside the power wall.
 bays.push({id:'containment-cell',room:'containment',x:19.6,z:-15.0,floor:0,yaw:0,sourceEntityId:277});
 const ring=add('lab-bubble-machine',19.6,0,-15.0,{dimensions:[2.10,.65,1.85],id:'containment-cell-base',assemblyId:'containment-cell',room:'containment',sourceEntityId:277});physical(ring);
 const pod=add('lab-field-device',19.6,.65,-15.0,{height:1.6,id:'containment-cell-pod',assemblyId:'containment-cell',room:'containment',sourceEntityId:277});physical(pod);
 const battery=add('lab-field-device-b',12.45,0,-15.6,{dimensions:[1.45,.72,.65],id:'power-cooling-bank',assemblyId:'power-cooling-bank',room:'containment',sourceEntityId:274});physical(battery);
 add('lab-beacon',12.45,.72,-15.6,{height:.30,assemblyId:'power-cooling-bank',room:'containment',sourceEntityId:274});
 // Upper floor: an observation station and a robotics bench, rather than random crates.
 bench('upper-observation','control',-5.55,-13.8,3.6,Math.PI/2,321,'research');
 bench('upper-diagnostics','control',9.5,-7.25,3.6,Math.PI,361,'maintenance',false);
 bench('upper-relay','control',-5.30,.65,3.6,Math.PI/2,334,'maintenance',[-1]);
 // Exterior silhouettes are seen through the original windows, outside the playable shell.
 add('lab-dextech-hq',-45,0,-41,{height:26,rotation:Math.PI/3,id:'dextech-campus',room:'exterior',assemblyId:'exterior-campus',sourceEntityId:260,backdrop:true});
 add('lab-tech-building',49,0,12,{height:23,rotation:-Math.PI/3,id:'dextech-cooling-tower',room:'exterior',assemblyId:'exterior-campus',sourceEntityId:407,backdrop:true});
 add('lab-comms-dish',-17,0,15,{height:6.0,rotation:Math.PI/2,id:'campus-comms-dish',room:'exterior',assemblyId:'exterior-campus',sourceEntityId:257,backdrop:true});
 // Each placement retains a source anchor; no random-position prop scatter is used.
 for(const p of placements){const e=data.entities.find(e=>e.id===p.sourceEntityId);p.sourceAnchor=e?.origin||null}
 return {placements,colliders,surfaces,bays,rooms:BUNKER_ROOMS,reviewViews:[{name:'Intake workcell',position:[-2.3,1.68,9.7],target:[-5.55,1.1,7.4]},{name:'Containment machinery',position:[16,1.68,-10],target:[19.6,1.2,-15]},{name:'Upper diagnostics bay',position:[8.5,5.28,-10.7],target:[9.5,4.5,-7.25]}]};
}
