import {equipmentBox} from './bunker-dressing-plan.js';
const cache=new WeakMap();
export function referenceFixtures(map){
 if(cache.has(map))return cache.get(map);
 const stations=map.stations.filter(s=>s.fixture).map(s=>{const f=s.fixture,a=f.rotation||0,bw=s.kind==='mystery'?.925:.43,bd=s.kind==='mystery'?.425:.33,w=Math.abs(Math.cos(a))*bw+Math.abs(Math.sin(a))*bd,d=Math.abs(Math.sin(a))*bw+Math.abs(Math.cos(a))*bd,h=s.kind==='mystery'?.85:1.25,min=[f.x-w,f.floorY||0,f.z-d],max=[f.x+w,(f.floorY||0)+h,f.z+d];return equipmentBox('fixture-'+s.id,min,max,{stationId:s.id,floorY:f.floorY||0})});
 const result={boxes:[...stations,...(map.dressing?.colliders||[])],surfaces:[...stations.map(b=>({min:b.min,max:b.max,floorY:b.floorY})),...(map.dressing?.surfaces||[])]};cache.set(map,result);return result;
}
