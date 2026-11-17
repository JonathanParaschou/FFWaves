import * as THREE from './vendor/three.module.js';
import {WEAPONS,RARITIES} from './weapons.js';
export function buildWeaponStation(scene,assets,s,height,own){
 const root=new THREE.Group(),guns=new Map();scene.add(root);const materials=[],geometry=[];
 function mat(color,glow=false){const m=new THREE.MeshStandardMaterial({color,emissive:glow?color:'#000000',emissiveIntensity:glow?.5:0,roughness:.65});materials.push(m);return m}
 const frame=mat('#253f4d'),trim=mat('#64d9ee',true),wood=mat('#657e8c');
 function box(w,h,d,m,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);geometry.push(mesh.geometry);mesh.position.set(x,y,z);root.add(mesh);return mesh}
 function gun(id,length){if(guns.has(id))return guns.get(id);const w=WEAPONS[id],bounds=assets.manifest.assets[w.asset].bounds,m=assets.model(w.asset,{scale:length/Math.max(...bounds.size)});m.rotation.y=Math.PI/2;m.position.y=1.4;root.add(m);guns.set(id,m);return m}
 let lid,beam;
 if(s.kind==='wall'){
  root.position.set(s.mount.x,height(s.x,s.z),s.mount.z);root.rotation.y=Math.atan2(s.mount.nx,s.mount.nz);if(s.zone===2)for(const x of [-1.25,1.25])box(.12,2.3,.12,frame,x,1.15,-.03);box(2.8,1.65,.13,frame,0,1.45,0);box(2.72,.045,.05,trim,0,2.25,.1);box(2.72,.045,.05,trim,0,.65,.1);for(const x of [-1.35,1.35])box(.045,1.65,.05,trim,x,1.45,.1);const m=gun(s.weapon,1.65);m.position.set(0,1.22,.18);for(const x of [-.6,.6])box(.12,.26,.25,wood,x,1.05,.18);
 }else{
  root.position.set(s.x,height(s.x,s.z),s.z-2.2);box(1.8,.75,.8,wood,0,.375,0);for(const x of [-.85,.85])box(.07,.77,.84,frame,x,.385,0);box(1.85,.06,.84,trim,0,.77,0);lid=new THREE.Group();lid.position.set(0,.8,-.4);root.add(lid);const panel=new THREE.Mesh(new THREE.BoxGeometry(1.85,.1,.85),frame);geometry.push(panel.geometry);panel.position.z=.4;lid.add(panel);beam=box(1.5,.035,.6,trim,0,.82,0);beam.visible=false;
 }
 if(s.displayScale){root.scale.setScalar(s.displayScale);root.position.y+=s.displayLift||0}if(s.fixture){root.position.set(s.fixture.x,s.fixture.floorY||0,s.fixture.z);root.rotation.y=s.fixture.rotation||0}
 const hitObjects=[];root.traverse(o=>{if(o.isMesh){o.userData.stationId=s.id;hitObjects.push(o)}});
 return {root,hitObjects,update(boxState,time,wave){if(s.kind==='wall'){const rarity=Math.min(3,Math.floor(wave/10));trim.color.set(RARITIES[rarity].color);trim.emissive.copy(trim.color);return}const active=boxState?.stationId===s.id&&boxState.phase!=='idle';lid.rotation.x=THREE.MathUtils.damp(lid.rotation.x,active?-1.5:0,10,.016);beam.visible=active;for(const m of guns.values())m.visible=false;if(!active)return;const id=boxState.phase==='rolling'?Object.keys(WEAPONS)[Math.floor(time*13)%Object.keys(WEAPONS).length]:boxState.offer.id,m=gun(id,1.3);m.visible=true;m.position.y=1.2+Math.sin(time*2)*.06;m.rotation.set(0,Math.PI/2+Math.sin(time*.8)*.12,0);const color=boxState.phase==='ready'?RARITIES[boxState.offer.rarity].color:'#91e9ff';trim.color.set(color);trim.emissive.copy(trim.color)},dispose(){geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.parent?.remove(root)}};
}
