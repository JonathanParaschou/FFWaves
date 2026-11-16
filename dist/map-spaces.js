import * as THREE from './vendor/three.module.js';
// Used for roads and markings alike: a road must not curve through its bordering buildings.
export function routeCurve(route){
 const points=route.points.map(p=>new THREE.Vector3(p[0],0,p[1]));
 if(!route.linear)return new THREE.CatmullRomCurve3(points,!!route.closed,'centripetal');
 const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));if(route.closed)curve.add(new THREE.LineCurve3(points.at(-1),points[0]));return curve;
}
export function buildMapSpaces(map,{box:solidBox,flat,material,mesh,place,label,h,instances}){
 const batches=new Map();
 function box(x,y,z,w,hh,d,mat,solid=true){if(solid)return solidBox(x,y,z,w,hh,d,mat);if(!batches.has(mat))batches.set(mat,[]);const object=new THREE.Object3D();object.position.set(x,y+hh/2,z);object.scale.set(w,hh,d);object.updateMatrix();batches.get(mat).push(object.matrix.clone());return object}
 const city=map.id==='sector-v',forest=map.id==='camp-kidney',colors=city?['#768e9e','#b0c5cb','#d7bd74']:forest?['#725d45','#ae9d72','#b8cba0']:['#56696b','#a6a995','#e6ae55'];
 const frame=material(colors[0]),trim=material(colors[1]),paint=material(colors[2]),glass=material(city?'#365e79':forest?'#5c7669':'#344e54');glass.metalness=.3;glass.roughness=.3;glass.emissive.set(city?'#192c38':'#1c2928');
 function wallSign(text,x,y,z,rotation=0,width=5){const sprite=label(text,'#eef2cf'),mat=new THREE.MeshBasicMaterial({map:sprite.material.map,side:THREE.DoubleSide});const sign=mesh(new THREE.PlaneGeometry(width,width/4),mat,x,y,z,false);sign.rotation.y=rotation;return sign}
 for(const a of map.architecture){const base=h(a.x,a.z),mat=material(a.style==='bank'?'#657561':a.style==='timber'?'#6e6148':colors[0],forest?'wild-stone':'concrete',Math.max(1,a.w/3),Math.max(1,a.d/3));box(a.x,base,a.z,a.w,a.h,a.d,mat);box(a.x,base+a.h,a.z,a.w+.08,.12,a.d+.08,trim,false);
  if(a.style==='bank'){const alongX=a.w>a.d,n=Math.ceil(Math.max(a.w,a.d)/2.2);for(let i=0;i<n;i++){const t=(i+.5)/n-.5,x=a.x+(alongX?t*a.w:0),z=a.z+(alongX?0:t*a.d);place('waste-rock',x,z,{height:a.h+.3+(i%3)*.15,rotation:i*1.3,solid:false});if(i%2===0)place('forest-plant',x+(alongX?0:.8),z+(alongX?.8:0),{height:.7,solid:false})}}
  else{const alongX=a.w>a.d,n=Math.ceil(Math.max(a.w,a.d)/3);for(let i=0;i<=n;i++){const t=i/n-.5;box(a.x+(alongX?t*a.w:0),base,a.z+(alongX?0:t*a.d),alongX?.2:a.w+.12,a.h+.1,alongX?a.d+.12:.2,trim,false)}}
 }
 for(const r of map.rooms){const base=h(r.x,r.z),entryHeight=3.25;
  for(const side of [-1,1]){const x=r.x+(r.axis==='x'?side*r.w/2:0),z=r.z+(r.axis==='z'?side*r.d/2:0),wide=r.axis==='z';
   // A normal-sized door beneath a transom keeps the shell at a human scale.
   box(x,base+entryHeight,z,wide?r.door:.4,r.h-entryHeight,wide?.4:r.door,frame);box(x,base+2.95,z,wide?r.door+.65:1.25,.14,wide?1.25:r.door+.65,paint,false);
   for(const edge of [-1,1])box(x+(wide?edge*(r.door/2+.15):0),base,z+(wide?0:edge*(r.door/2+.15)),.25,3.25,.25,trim,false);
   const signX=x+(wide?0:side*.25),signZ=z+(wide?side*.25:0);wallSign(r.name,signX,base+3.9,signZ,wide?(side<0?Math.PI:0):side*Math.PI/2,Math.min(6,r.door+1));
  }
  // Repeated structural bays and opaque windows belong to the room's solid side walls.
  const length=r.axis==='z'?r.d:r.w,n=Math.floor(length/3.5);
  for(const side of [-1,1])for(let i=0;i<n;i++){const t=(i+.5)/n-.5,x=r.x+(r.axis==='z'?side*(r.w/2+.035):t*r.w),z=r.z+(r.axis==='x'?side*(r.d/2+.035):t*r.d),wide=r.axis==='x';box(x,base+.8,z,wide?2.35:.08,1.5,wide?.08:2.35,glass,false);box(x,base+.73,z,wide?2.6:.2,.12,wide?.2:2.6,trim,false);box(x,base,z,wide?.15:.25,r.h,wide?.25:.15,frame,false)}
  if(forest){for(const side of [-1,1]){const roof=box(r.x+(side*r.w/4),base+r.h+.15,r.z,r.w*.55,.2,r.d+1,frame);roof.rotation.z=-side*.16}}
  else{box(r.x,base+r.h+.2,r.z,r.w+.9,.18,r.d+.9,frame,false);for(const side of [-1,1])box(r.x+side*r.w/2,base+r.h+.35,r.z,.16,.55,r.d+.7,trim,false)}
 }
 for(const s of map.wayfinding){const base=h(s.x,s.z);box(s.x,base,s.z,.14,2.3,.14,frame,false);wallSign(s.direction+' / '+s.to,s.x,base+2.25,s.z,0,3.8)}
 if(city){
  // Continuous frontage outside the playable street makes the perimeter read as a town block.
  for(const side of [-1,1])for(const [i,z]of [-35,-9,19,44].entries())place(['town-building-2','town-building-3','town-building-1','town-building-4'][i],side*64,z,{dimensions:[24,22+(i%3)*7,16],rotation:side*Math.PI/2,solid:false});
  for(const [i,x]of [-46,-7,15,38].entries())place(i%2?'town-bank':'town-building-1',x,57,{dimensions:[19,12+i*3,15],rotation:Math.PI,solid:false});
  // Storefront threshold, pavement joints and service conduits tie the street to its buildings.
  for(const x of [-37,-32,-22,-17]){box(x,0,33,4.8,.12,2.7,trim,false);box(x,2.8,34.5,4.8,.12,1.4,paint,false)}
  for(let z=-21;z<29;z+=5)box(-43,.05,z,3.4,.025,.04,frame,false);
  for(const x of [14,22]){box(x,4.9,8,.14,.14,12,frame,false);for(const z of [-3,13])box(x,0,z,.15,5,.15,trim,false)}
 }else if(forest){
  for(const side of [-1,1])for(let i=0;i<9;i++)place('waste-rock',side*(55+(i%2)*2),-43+i*10,{dimensions:[9,5+(i%3)*2,13],rotation:i*.8,solid:false});
  // Bridges have clear approaches; vegetation clusters on banks, away from their mouths.
  for(const z of [-16,-1,7,15,33,41])for(const x of [-7,2])place('forest-plant',x,z,{height:.9,rotation:z*.5,solid:false});
  for(const [x,z]of [[-31,31],[-15,18],[29,29],[37,-11]]){place('forest-log-bench',x,z,{height:.65,rotation:Math.PI/2,solid:false});place('forest-plant',x+1.2,z+1,{height:.6,solid:false})}
 }else{
  for(const side of [-1,1])for(const [i,z]of [-33,-7,20,44].entries())place('yard-garage',side*59,z,{dimensions:[13,9+(i%2)*5,23],rotation:side*Math.PI/2,solid:false});
  for(const x of [-42,-20,3,25,45])place('yard-cylinder',x,55,{height:12+Math.abs(x)%8,solid:false});
  // The conveyor is a continuous production route linking press, sorting and the crane.
  for(const [x,z,w,d]of [[-18,-19,20,1.1],[2,-19,20,1.1],[31,-8,1.1,27]]){box(x,7.2,z,w,.45,d,frame,false);for(const side of [-1,1])box(x+(w>d?side*(w/2-.3):0),0,z+(d>w?side*(d/2-.3):0),.28,7.2,.28,trim,false)}
  for(const x of [26,29,32,35,38])box(x,.08,25,1.6,.025,.2,paint,false);
 }
 for(const [mat,matrices]of batches)instances(mat,matrices);
}
