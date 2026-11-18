import * as THREE from './vendor/three.module.js';
import {WEAPONS,RARITIES} from './weapons.js';
export function buildWeaponStation(scene,assets,s,height,own){
 const root=new THREE.Group(),guns=new Map();scene.add(root);const materials=[],geometry=[];
 function mat(color,glow=false){const m=new THREE.MeshStandardMaterial({color,emissive:glow?color:'#000000',emissiveIntensity:glow?.5:0,roughness:.65});materials.push(m);return m}
 const frame=mat('#253f4d'),trim=mat('#64d9ee',true),wood=mat('#657e8c');
 function box(w,h,d,m,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);geometry.push(mesh.geometry);mesh.position.set(x,y,z);root.add(mesh);return mesh}
 function gun(id,length){if(guns.has(id))return guns.get(id);const w=WEAPONS[id],bounds=assets.manifest.assets[w.asset].bounds,m=assets.model(w.asset,{scale:length/Math.max(...bounds.size)});m.rotation.y=Math.PI/2;m.position.y=1.4;root.add(m);guns.set(id,m);return m}
 function separateLid(body,lid){
  // Reuse the original crate's textured roof as the moving lid. Never edit cached meshes.
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),replacement=new THREE.Group();
  body.traverse(mesh=>{if(!mesh.isMesh)return;const baked=mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)),p=baked.getAttribute('position'),index=baked.index?.array||Array.from({length:p.count},(_,i)=>i),groups=baked.groups.length?baked.groups:[{start:0,count:index.length,materialIndex:0}],sides=[],roof=[],sideGroups=[],roofGroups=[];
   for(const g of groups){const a=sides.length,b=roof.length;for(let i=g.start;i<g.start+g.count;i+=3){const triangle=[index[i],index[i+1],index[i+2]],isRoof=triangle.every(v=>p.getY(v)>.705);(isRoof?roof:sides).push(...triangle)}if(sides.length>a)sideGroups.push({start:a,count:sides.length-a,materialIndex:g.materialIndex});if(roof.length>b)roofGroups.push({start:b,count:roof.length-b,materialIndex:g.materialIndex})}
   for(const [indices,drawGroups,parent,isRoof]of [[sides,sideGroups,replacement,false],[roof,roofGroups,lid,true]]){if(!indices.length)continue;const geo=baked.clone();geo.setIndex(indices);geo.clearGroups();for(const g of drawGroups)geo.addGroup(g.start,g.count,g.materialIndex);if(isRoof)geo.translate(0,-lid.position.y,-lid.position.z);geometry.push(geo);const part=new THREE.Mesh(geo,mesh.material);part.castShadow=part.receiveShadow=true;part.userData.originalCratePart=isRoof?'lid':'body';parent.add(part)}baked.dispose();
  });root.remove(body);root.add(replacement);
 }
 let lid,beam,question,light,spawnAge=0,hasSpawned=false;
 if(s.kind==='wall'){
  root.position.set(s.mount.x,height(s.x,s.z),s.mount.z);root.rotation.y=Math.atan2(s.mount.nx,s.mount.nz);if(s.zone===2)for(const x of [-1.25,1.25])box(.12,2.3,.12,frame,x,1.15,-.03);box(2.8,1.65,.13,frame,0,1.45,0);box(2.72,.045,.05,trim,0,2.25,.1);box(2.72,.045,.05,trim,0,.65,.1);for(const x of [-1.35,1.35])box(.045,1.65,.05,trim,x,1.45,.1);const m=gun(s.weapon,1.65);m.position.set(0,1.22,.18);for(const x of [-.6,.6])box(.12,.26,.25,wood,x,1.05,.18);
 }else{
  root.name='Nano supply box';root.position.set(s.x,height(s.x,s.z),s.z-2.2);
  const body=assets.model('crate',{dimensions:[1.8,.72,.8]});root.add(body);
  for(const x of [-.85,.85])box(.07,.77,.84,frame,x,.385,0);
  for(const z of [-.405,.405])box(1.85,.045,.035,trim,0,.74,z);for(const x of [-.905,.905])box(.035,.045,.8,trim,x,.74,0);box(.22,.25,.05,trim,0,.48,.4);
  lid=new THREE.Group();lid.position.set(0,.8,-.4);root.add(lid);
  const panel=new THREE.Mesh(new THREE.BoxGeometry(1.85,.035,.85),frame);geometry.push(panel.geometry);panel.position.set(0,-.10,.4);lid.add(panel);separateLid(body,lid);
  box(1.65,.035,.65,frame,0,.12,0);
  const beamMaterial=new THREE.MeshBasicMaterial({color:'#68cfff',transparent:true,opacity:.15,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});materials.push(beamMaterial);
  beam=new THREE.Mesh(new THREE.CylinderGeometry(.12,.25,1.8,16,1,true),beamMaterial);geometry.push(beam.geometry);beam.position.y=1.75;beam.userData.noHit=true;root.add(beam);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#bcefff';ctx.textAlign='center';ctx.font='bold 110px Arial';ctx.fillText('?',64,106);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  question=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#9ee8ff',transparent:true,depthWrite:false,toneMapped:false}));question.position.y=1.65;question.scale.set(.5,.5,1);root.add(question);materials.push(question.material);
  light=new THREE.PointLight('#6acaff',1.8,3,2);light.position.y=1.1;root.add(light);root.userData.beacon=beam;root.userData.question=question;root.userData.beaconTexture=texture;
 }
 if(s.displayScale){root.scale.setScalar(s.displayScale);root.position.y+=s.displayLift||0}if(s.fixture){root.position.set(s.fixture.x,s.fixture.floorY||0,s.fixture.z);root.rotation.y=s.fixture.rotation||0}
 const baseY=root.position.y,baseScale=root.scale.x,hitObjects=[];root.traverse(o=>{if(o.isMesh&&!o.userData.noHit){o.userData.stationId=s.id;hitObjects.push(o)}});
 return {root,hitObjects,update(boxState,time,wave,dt=1/60){
  if(s.kind==='wall'){const rarity=Math.min(3,Math.floor(wave/10));trim.color.set(RARITIES[rarity].color);trim.emissive.copy(trim.color);return}
  if(boxState){if(!hasSpawned){spawnAge=0;hasSpawned=true}spawnAge+=dt;const t=Math.min(1,spawnAge/.85),ease=1-Math.pow(1-t,3);root.position.y=baseY+.6*(1-ease);root.scale.setScalar(baseScale*(.85+.15*ease))}else hasSpawned=false;
  const active=boxState?.stationId===s.id&&boxState.phase!=='idle',ready=active&&boxState.phase==='ready';
  lid.rotation.x=THREE.MathUtils.damp(lid.rotation.x,active?-1.5:0,10,dt);
  beam.visible=true;beam.material.opacity=(active?.23:.10)+Math.sin(time*2)*.025;
  question.visible=!active;question.position.y=1.65+Math.sin(time*2)*.045;
  const color=ready?RARITIES[boxState.offer?.rarity||0].color:'#78dfff';trim.color.set(color);trim.emissive.copy(trim.color);beam.material.color.set(color);light.color.set(color);
  for(const m of guns.values())m.visible=false;if(!active)return;
  const id=boxState.phase==='rolling'?Object.keys(WEAPONS)[Math.floor(time*13)%Object.keys(WEAPONS).length]:boxState.offer?.id;if(!WEAPONS[id])return;
  const m=gun(id,1.1);m.visible=true;m.position.y=(ready?1.5:1.25)+Math.sin(time*2)*.06;m.rotation.set(0,Math.PI/2+Math.sin(time*.8)*.12,0);
 },dispose(){geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.userData.beaconTexture?.dispose();root.parent?.remove(root)}};
}
