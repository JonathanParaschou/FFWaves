import * as THREE from './vendor/three.module.js';
import {heightAt} from './layout.js';
import {buildWeaponStation} from './weapon-stations.js';

export function buildNativeEnvironment(scene,assets,glow,map){
 const hitObjects=[],stations=[],gateMeshes=new Map(),pools=[],fixtures=[],materials=[],geometries=[],textures=[],h=(x,z)=>heightAt(map,x,z);
 const original=assets.model(map.native.asset);original.name='Original FusionFall playable region';scene.add(original);original.traverse(o=>{if(o.isMesh){hitObjects.push(o);o.castShadow=o.receiveShadow=true}});
 function label(text,color='#c8f0ec',small=''){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#092430ed';ctx.fillRect(0,0,512,128);ctx.strokeStyle=map.palette.accent;ctx.lineWidth=3;ctx.strokeRect(2,2,508,124);ctx.textAlign='center';ctx.fillStyle=color;ctx.font='bold 27px Arial';ctx.fillText(text,256,small?52:78);if(small){ctx.fillStyle='#c6dfe8';ctx.font='17px Arial';ctx.fillText(small,256,96)}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false});materials.push(material);const sprite=new THREE.Sprite(material);sprite.scale.set(4,1,1);return sprite}
 for(const s of map.stations){
  if(s.kind==='wall'||s.kind==='mystery'){const fixture=buildWeaponStation(scene,assets,s,h);fixtures.push(fixture);hitObjects.push(...fixture.hitObjects);stations.push({data:s,object:fixture.root,marker:new THREE.Object3D(),ring:{visible:false,material:{opacity:0}}});continue}
  const object=assets.model(s.asset,{height:s.kind==='evac'?3:1.5});object.position.set(s.x,h(s.x,s.z),s.z);scene.add(object);const marker=label(s.label);marker.position.set(s.x,h(s.x,s.z)+2.5,s.z);marker.visible=false;scene.add(marker);const geometry=new THREE.RingGeometry(.8,.87,32),material=new THREE.MeshBasicMaterial({color:map.palette.accent,transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false});geometries.push(geometry);materials.push(material);const ring=new THREE.Mesh(geometry,material);ring.rotation.x=-Math.PI/2;ring.position.set(s.x,h(s.x,s.z)+.05,s.z);ring.visible=false;scene.add(ring);stations.push({data:s,object,marker,ring});
 }
 return {hitObjects,stations,gateMeshes,pools,label,update(dt,time,sim){for(const f of fixtures)f.update(sim?.box,time,sim?.wave||0)},dispose(){for(const f of fixtures)f.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();for(const t of textures)t.dispose();scene.clear()}};
}
