import * as THREE from './vendor/three.module.js';
// Repeated real source meshes are instanced, rather than increasing per-prop draw calls.
export function instanceStaticProps(scene,props){
 scene.updateMatrixWorld(true);const inverse=scene.matrixWorld.clone().invert();const groups=new Map(),batches=[];
 for(const root of props){root.traverse(mesh=>{if(!mesh.isMesh)return;const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],key=mesh.geometry.uuid+':'+materials.map(m=>m.uuid).join(',')+':'+mesh.castShadow;if(!groups.has(key))groups.set(key,{geometry:mesh.geometry,material:mesh.material,shadow:mesh.castShadow,items:[],asset:root.userData.dressing?.asset,placements:[]});groups.get(key).items.push(inverse.clone().multiply(mesh.matrixWorld));groups.get(key).placements.push(root.userData.dressing)});root.visible=false}
 for(const group of groups.values()){const batch=new THREE.InstancedMesh(group.geometry,group.material,group.items.length);batch.name='Dressing / '+group.asset;batch.castShadow=group.shadow;batch.receiveShadow=true;batch.userData.dressingRole='source-art-instance';batch.userData.assetId=group.asset;batch.userData.dressingInstances=group.placements;group.items.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));batch.computeBoundingSphere();scene.add(batch);batches.push(batch)}
 return {batches,instances:[...groups.values()].reduce((n,g)=>n+g.items.length,0),dispose(){for(const b of batches){scene.remove(b);b.dispose()}}};
}

export function addBunkerEquipment(scene,assets,map,place){
 const owned=[],details=[],plan=map.dressing;
 for(const p of plan.placements)place(p.asset,p.x,p.y,p.z,{...p,role:p.backdrop?'campus-backdrop':p.physical?'equipment-bay':'equipment-detail',testClearance:!p.physical&&!p.backdrop});
 const geometry=new THREE.BoxGeometry(1,1,1);owned.push(geometry);
 const palette=new Map(plan.rooms.map(room=>[room.id,new THREE.MeshStandardMaterial({color:room.color,roughness:.8,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})]));owned.push(...palette.values());
 const matrices=new Map();
 function stripe(room,x,y,z,w,d,yaw){const m=new THREE.Object3D();m.position.set(x,y,z);m.rotation.y=yaw;m.scale.set(w,.008,d);m.updateMatrix();if(!matrices.has(room))matrices.set(room,[]);matrices.get(room).push(m.matrix.clone())}
 for(const bay of plan.bays){const yaw=bay.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),floor=bay.floor+.016,at=(x,z)=>[bay.x+x*c+z*s,bay.z-x*s+z*c];
  const w=bay.id==='containment-cell'?2.65:(bay.padWidth||2.4),d=bay.id==='containment-cell'?2.4:1.55;
  for(const side of [-1,1]){let [x,z]=at(0,side*d/2);stripe(bay.room,x,floor,z,w,.045,yaw);[x,z]=at(side*w/2,0);stripe(bay.room,x,floor,z,.045,d,yaw)}
  // Short stencilled bars make equipment pads readable without marking a combat route.
  for(let i=0;i<5;i++){const [x,z]=at(-w/2+.18+i*.13,d/2-.12);stripe(bay.room,x,floor+.002,z,.055,.16,yaw)}
 }
 for(const [room,items]of matrices){const mesh=new THREE.InstancedMesh(geometry,palette.get(room),items.length);mesh.name='Equipment pad / '+room;mesh.userData.dressingRole='floor-wayfinding';items.forEach((m,i)=>mesh.setMatrixAt(i,m));scene.add(mesh);details.push(mesh)}
 const accent=new THREE.PointLight('#8adacb',1,3.8,2);accent.position.set(19.6,1.6,-15);scene.add(accent);
 return {details,update(dt,time,sim){accent.intensity=THREE.MathUtils.damp(accent.intensity,sim?.power?4.5:1.0,3,dt)*(1+Math.sin(time*1.5)*.002)},dispose(){for(const object of details){scene.remove(object);object.dispose()}scene.remove(accent);for(const resource of owned)resource.dispose()}};
}
