import * as THREE from './vendor/three.module.js';
import {routeCurve} from './map-spaces.js';
import {heightAt} from './layout.js';
export function addMapDetails(scene,assets,map,glow){
 const root=new THREE.Group();scene.add(root);const geos=[],mats=[],h=(x,z)=>heightAt(map,x,z),forest=map.id==='camp-kidney',waste=map.id==='salvage-yard';
 const metal=new THREE.MeshStandardMaterial({color:forest?'#8c8265':waste?'#8e7e66':'#8da1aa',roughness:.75}),dark=new THREE.MeshStandardMaterial({color:'#34464b',roughness:.8}),paint=new THREE.MeshBasicMaterial({color:waste?'#d8b25f':forest?'#b8ae81':'#e0d4a1'});mats.push(metal,dark,paint);
 const batches=new Map();function block(x,y,z,w,hh,d,material=metal,rotation=0){if(!batches.has(material))batches.set(material,[]);const dummy=new THREE.Object3D();dummy.position.set(x,y+hh/2,z);dummy.scale.set(w,hh,d);dummy.rotation.y=rotation;dummy.updateMatrix();batches.get(material).push(dummy.matrix.clone())}
 function prop(id,x,z,height,rotation=0,y=0){const object=assets.model(id,{height});object.position.set(x,h(x,z)+y,z);object.rotation.y=rotation;root.add(object);return object}
 const shadowMat=new THREE.MeshBasicMaterial({map:glow,color:'#071b24',transparent:true,opacity:.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});mats.push(shadowMat);const shadowGeo=new THREE.CircleGeometry(1,24);geos.push(shadowGeo);
 for(const b of [...map.cover,...map.buildings]){const m=new THREE.Mesh(shadowGeo,shadowMat);m.rotation.x=-Math.PI/2;m.position.set(b.x,h(b.x,b.z)+.076,b.z);m.scale.set(b.w*.68,b.d*.68,1);root.add(m)}
 // Instanced edge trim, grip studs and bolts anchor the upper routes without adding a draw call per piece.
 for(const r of map.ramps){const length=r.axis==='x'?r.w:r.d;for(let i=0;i<=length;i+=2){const t=i/length;for(const side of [-1,1]){const x=r.x+(r.axis==='x'?(t-.5)*r.w:side*(r.w/2-.12)),z=r.z+(r.axis==='z'?(t-.5)*r.d:side*(r.d/2-.12)),y=r.from+(r.to-r.from)*t;block(x,y+.02,z,.16,.12,.16,dark);block(x,y+.145,z,.065,.025,.065,paint)}}}
 for(const deck of map.platforms){for(let x=deck.x-deck.w/2+.5;x<deck.x+deck.w/2;x+=4){for(const side of [-1,1]){const z=deck.z+side*(deck.d/2-.16);block(x,deck.h+.055,z,.09,.03,.09,dark)}}for(let x=deck.x-deck.w/2+4;x<deck.x+deck.w/2;x+=8)block(x,deck.h+.035,deck.z,.025,.012,deck.d-.15,dark)}
 for(const r of map.rooms){const base=h(r.x,r.z);for(let z=r.z-r.d/2+2;z<r.z+r.d/2;z+=3.5){block(r.x,base+r.h-.25,z,r.w,.22,.18,dark);block(r.x,base+r.h-.31,z,2.2,.055,.24,paint)}for(const side of [-1,1]){const x=r.x+(r.axis==='x'?side*r.w/2:0),z=r.z+(r.axis==='z'?side*r.d/2:0);for(const edge of [-1,1])block(x+(r.axis==='z'?edge*(r.door/2+.12):0),base,z+(r.axis==='x'?edge*(r.door/2+.12):0),.18,r.h,.18,dark);for(let i=-2;i<=2;i++)block(x+(r.axis==='z'?i*.45:0),base+.06,z+(r.axis==='x'?i*.45:0),r.axis==='z'?.19:1.2,.02,r.axis==='x'?.19:1.2,paint)}prop(forest?'forest-log-bench':waste?'waste-tv':'town-trash',r.x-r.w/2+1.5,r.z+r.d/2-1.5,forest?.65:waste?.5:.7);}
 if(!forest){for(const route of map.paths){const curve=routeCurve(route),length=curve.getLength();for(let d=3;d<length;d+=5){const p=curve.getPoint(d/length),t=curve.getTangent(d/length),y=h(p.x,p.z);block(p.x,y+.08,p.z,.12,.015,1.7,paint,Math.atan2(t.x,t.z))}}}
 if(!forest&&!waste){
  block(-28,2.6,35.3,6,.16,1.5,metal);block(-39.9,2.8,30,1.3,.16,5,metal);
  for(const [x,z]of [[-37,20],[-7,9],[17,10],[43,-5]]){block(x,.08,z,1.1,.025,.65,dark);for(let i=0;i<5;i++)block(x-.45+i*.22,.11,z,.07,.018,.6,metal)}
  for(const x of [-41,-26,-11,5,20,35,47]){if(map.rooms.some(r=>Math.abs(x-r.x)<r.w/2+3&&Math.abs(-46-r.z)<r.d/2+1.5))continue;prop('town-planter',x,-46,.85);prop('bench',x-2,-45.7,.8,Math.PI);block(x,6.01,-48,.2,1.15,.2,dark);block(x,7.1,-48,8,.08,.08,metal)}
  for(const [x,z]of [[-33,33],[-41,-22],[15,36],[45,10]]){prop('town-trash',x,z,.65);prop('town-planter',x+1.5,z,.55)}
 }else if(forest){
  for(let i=0;i<15;i++){const x=-49+i*7;prop(i%3?'forest-tree-creek':'forest-tree-twisted',x,-54,10+i%4*1.5,i*.8);if(i%2===0)prop('waste-rock',x,-31,2.5+(i%3),i*.7)}
  for(const [x,z]of [[-40,19],[-14,30],[34,33],[44,-3],[-23,-42],[34,-43]]){prop('forest-plant',x,z,.45);prop('forest-log-bench',x+1,z+1,.55,x)}
  for(const x of [-46,-38,-6,13,40,47])prop('forest-plant',x,-45,.7,x);
  for(const [x,z]of [[-24,23],[32,16]]){for(let i=0;i<6;i++)prop('waste-rock',x+Math.cos(i)*1.9,z+Math.sin(i)*1.9,.25,i)}
 }else{
  for(const [x,z]of [[-43,17],[-39,-19],[12,34],[45,32],[-18,-44],[27,-45]]){prop('waste-tire-stack',x,z,.8);prop('waste-cabinet',x+1.1,z+1,.9);prop('waste-tv',x+.7,z+1.4,.35)}
  for(const r of map.rooms){const base=h(r.x,r.z);for(const x of [r.x-3,r.x+3])block(x,base+r.h-.5,r.z,.12,.12,r.d,dark)}
  for(const x of [-42,-27,-12,12,27,42]){block(x,7.05,-47.5,.15,1.1,.15,dark);block(x,8.1,-47.5,9,.08,.08,metal);prop('waste-drum',x,-46,.8)}
 }
 for(const [material,matrices]of batches){const geometry=new THREE.BoxGeometry(1,1,1);geos.push(geometry);const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh)}
 return {dispose(){geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());root.parent?.remove(root)}};
}
