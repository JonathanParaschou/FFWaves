import * as THREE from './vendor/three.module.js';
import {HOSTILE_SHOTS} from './enemy-attacks.js';
const position=p=>new THREE.Vector3(p.x,p.y,p.z),UP=new THREE.Vector3(0,1,0);
export class EnemyProjectiles{
 constructor(scene,assets,fx){this.scene=scene;this.assets=assets;this.fx=fx;this.entries=new Map();this.finished=new Map();this.time=0;this.coreGeometry=new THREE.IcosahedronGeometry(1,1);this.tailGeometry=new THREE.CylinderGeometry(1,1,1,6)}
 texture(id){const record=this.assets.combatFxCatalog?.textures[id];return record?this.assets.textures.get(record.url):null}
 add(data){
  if(this.finished.has(data.id))return;
  const existing=this.entries.get(data.id);if(existing){existing.data=data;return existing.object}
  const profile=HOSTILE_SHOTS[data.kind]||HOSTILE_SHOTS.toxic,object=new THREE.Group(),size=data.size||.38;
  const core=new THREE.Mesh(this.coreGeometry,new THREE.MeshBasicMaterial({color:'#edfff4',toneMapped:false}));core.scale.setScalar(size*.19);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture(profile.texture),color:profile.color,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));halo.scale.set(size*1.65,size*1.65,1);
  const tail=new THREE.Mesh(this.tailGeometry,new THREE.MeshBasicMaterial({color:profile.color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));tail.visible=false;
  object.add(core,halo,tail);object.position.copy(position(data));this.scene.add(object);
  this.entries.set(data.id,{object,core,halo,tail,data,size,profile,born:this.time,lastLife:data.life||0,sinceSnapshot:0,endedAt:null});
  // A launch flash remains visible even if a near-wall shot ends between frames.
  this.fx?.impact(position(data),{impact:'energy-ring',color:profile.color});
  return object;
 }
 trail(entry,vector,length){entry.tail.visible=length>.005;if(!entry.tail.visible)return;entry.tail.position.copy(vector).normalize().multiplyScalar(-length/2);entry.tail.quaternion.setFromUnitVectors(UP,vector.clone().normalize());entry.tail.scale.set(entry.size*.08,length,entry.size*.08)}
 impact(data){
  if(this.finished.has(data.id))return;this.add(data);const entry=this.entries.get(data.id);if(!entry)return;
  entry.data={...data,dead:true};entry.object.position.copy(position(data));entry.endedAt=this.time;entry.core.visible=false;
  const delta=position(data).sub(new THREE.Vector3(data.spawnX??data.x,data.spawnY??data.y,data.spawnZ??data.z));this.trail(entry,delta,Math.min(.9,delta.length()));
  this.fx?.impact(position(data),entry.profile);this.finished.set(data.id,this.time);
 }
 update(dt,networked=false){
  this.time+=dt;
  for(const [id,entry]of this.entries){
   const p=entry.data;if(p.dead&&entry.endedAt===null)this.impact(p);
   if(entry.endedAt!==null){const fade=Math.max(0,1-(this.time-entry.endedAt)/.14);entry.halo.material.opacity=fade;entry.tail.material.opacity=fade*.8;if(!fade)this.remove(id);continue}
   if(p.life!==entry.lastLife){entry.lastLife=p.life;entry.sinceSnapshot=0}else entry.sinceSnapshot+=dt;
   const ahead=networked?Math.min(.1,entry.sinceSnapshot):0;
   entry.object.position.set(p.x+p.dx*ahead,p.y+p.dy*ahead,p.z+p.dz*ahead);
   const velocity=new THREE.Vector3(p.dx,p.dy,p.dz),travel=entry.object.position.distanceTo(new THREE.Vector3(p.spawnX??p.x,p.spawnY??p.y,p.spawnZ??p.z));
   this.trail(entry,velocity,Math.min(.9,travel));entry.halo.material.rotation+=dt*2;
   if(this.time-entry.born>5)this.remove(id);
  }
  for(const [id,time]of this.finished)if(this.time-time>6)this.finished.delete(id);
 }
 remove(id){const entry=this.entries.get(id);if(!entry)return;this.scene.remove(entry.object);entry.core.material.dispose();entry.halo.material.dispose();entry.tail.material.dispose();this.entries.delete(id)}
 clear(){for(const id of this.entries.keys())this.remove(id);this.finished.clear()}
}
