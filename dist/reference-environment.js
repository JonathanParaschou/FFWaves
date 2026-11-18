import {buildReferenceDressing} from './reference-dressing.js';
import {BUNKER_LIGHTING as lighting} from './reference-lighting.js';
import * as THREE from './vendor/three.module.js';
import {buildWeaponStation} from './weapon-stations.js';

export function buildReferenceEnvironment(scene,assets,glow,map){
 const hitObjects=[],stations=[],gateMeshes=new Map(),pools=[],fixtures=[],owned=[],props=[];
 const original=assets.model(map.reference.asset);original.name='Measured NZP Nacht architecture';scene.add(original);
 for(const gate of map.gates){const group=new THREE.Group();group.name=gate.name;original.add(group);for(const part of [...original.children])if(part.userData.sourceEntityId===gate.sourceEntityId)group.add(part);gateMeshes.set(gate.id,{group,data:gate,sourceGeometry:true})}
 original.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;hitObjects.push(o)}});
 function label(text,color='#cceaf0'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#0c1e2ee8';ctx.fillRect(0,0,512,96);ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 26px Arial';ctx.fillText(text,256,58);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false});owned.push(texture,material);const sprite=new THREE.Sprite(material);sprite.scale.set(2.8,.525,1);return sprite}
 for(const s of map.stations){
  const h=()=>s.floorY||0;
  if(s.kind==='wall'||s.kind==='mystery'){const fixture=buildWeaponStation(scene,assets,s,h);fixtures.push(fixture);hitObjects.push(...fixture.hitObjects);stations.push({data:s,object:fixture.root,marker:new THREE.Object3D(),ring:{visible:false,material:{opacity:0}}});continue}
  let object;
  if(s.kind==='gate')object=gateMeshes.get(s.id).group;
  else{object=assets.model(s.asset,{height:s.kind==='evac'?1.15:1.25});object.position.set(s.fixture?.x??s.x,s.fixture?.floorY??h(),s.fixture?.z??s.z);object.userData.survivalService=s.id;object.name=s.label;scene.add(object)}
  const marker=label(s.label);marker.position.set(s.x,h()+2,s.z);marker.visible=false;scene.add(marker);stations.push({data:s,object,marker,ring:{visible:false,material:{opacity:0}}});
 }
 const dressing=buildReferenceDressing(scene,assets,map,original);props.push(...dressing.props);for(const p of dressing.props)if(p.userData.dressing?.role==='source-cover')p.traverse(o=>{if(o.isMesh)hitObjects.push(o)});
 // Source light positions provide room-scale pools of light, rather than a uniformly lit stage.
 for(const id of [194,199,201,270,274,277,321,334,357,358,361]){const e=map.reference.data.entities.find(e=>e.id===id);if(!e?.origin)continue;const warm=e.properties.classname==='light',light=new THREE.PointLight(warm?lighting.warm:lighting.cool,warm?lighting.warmIntensity:lighting.coolIntensity,lighting.range,2);light.position.fromArray(e.origin);scene.add(light)}
 return {hitObjects,stations,gateMeshes,pools,label,props,original,dressing,update(dt,time,sim){for(const f of fixtures)f.update(sim?.box,time,sim?.wave||0,dt)},dispose(){dressing.dispose();for(const f of fixtures)f.dispose();for(const resource of owned)resource.dispose();scene.clear()}};
}
