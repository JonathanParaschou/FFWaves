import {WEAPONS} from './weapons.js';
import * as THREE from './vendor/three.module.js';
const profiles={
 pistol:{muzzle:'muzzle-shot',bullet:'projectile',impact:'impact-star',color:'#ffd7a1',size:.13,speed:420,flash:.28},
 rifle:{muzzle:'muzzle-shot',bullet:'projectile',impact:'impact-star',color:'#bcffdc',size:.11,speed:520,flash:.32},
 shotgun:{muzzle:'muzzle-scatter',bullet:'projectile',impact:'impact-burst',color:'#ffd08d',size:.12,speed:360,flash:.56},
 cannon:{muzzle:'energy-ring',bullet:'energy-plasma',impact:'impact-ring',color:'#aaff70',size:.28,speed:220,flash:.38},
 spitwad:{muzzle:'muzzle-shot',bullet:'laser',impact:'impact-star',color:'#b7e4ff',size:.09,speed:700,flash:.26},
 rotation:{muzzle:'muzzle-scatter',bullet:'energy-bolt',impact:'impact-star',color:'#a7ffd9',size:.16,speed:480,flash:.36},
 heatblaster:{muzzle:'nano-fire',bullet:'mega-projectile',impact:'impact-burst',color:'#ffc383',size:.34,speed:260,flash:.47},
 scattergun:{muzzle:'muzzle-scatter',bullet:'projectile',impact:'impact-burst',color:'#ffe1ae',size:.15,speed:340,flash:.63},
 marshmallow:{muzzle:'impact-burst',bullet:'mega-projectile',impact:'impact-ring',color:'#ffd5f4',size:.36,speed:180,flash:.42},
 bracer:{muzzle:'energy-ring',bullet:'energy-bolt',impact:'impact-ring',color:'#95eaff',size:.24,speed:360,flash:.35}
};
export function combatProfile(id){return WEAPONS[id]?.fx||profiles[id]||profiles.pistol}
export function clipMuzzle(point,eye,layout){
 const delta=point.clone().sub(eye),length=delta.length();if(length<.001||!layout?.raycast)return point;
 const distance=layout.raycast(eye,delta.clone().normalize(),length);
 return distance<length?eye.clone().addScaledVector(delta,Math.max(.02,distance-.04)/length):point;
}
export class CombatEffects{
 constructor(scene,assets){this.scene=scene;this.assets=assets;this.effects=[]}
 texture(id){const record=this.assets.combatFxCatalog?.textures[id];return record?this.assets.textures.get(record.url):null}
 flash(material,id){const p=combatProfile(id),texture=this.texture(p.muzzle);if(!material.map&&texture)material.needsUpdate=true;material.map=texture;material.color.set(p.color);return p.flash}
 sprite(texture,color,size,pos,life,extra={}){const mat=new THREE.SpriteMaterial({map:this.texture(texture),color,transparent:true,opacity:1,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}),object=new THREE.Sprite(mat);object.position.copy(pos);object.scale.set(size,size,1);this.scene.add(object);this.effects.push({object,life:0,duration:life,size,...extra});return object}
 shot(packet){
  const p=combatProfile(packet.weapon),origin=new THREE.Vector3(packet.origin.x,packet.origin.y,packet.origin.z);
  for(const [i,end]of packet.ends.entries()){
   const target=new THREE.Vector3(end.x,end.y,end.z),distance=origin.distanceTo(target);
   // Damage stays hitscan. Presentation lasts across several rendered frames, even indoors.
   const energy=p.energy??!['projectile','laser'].includes(p.bullet);
   const duration=Math.max(energy?.14:.10,Math.min(.48,distance/(p.speed/5)));
   const trail=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,6),new THREE.MeshBasicMaterial({map:this.texture(p.bullet),color:p.color,transparent:true,opacity:.7,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));
   trail.visible=false;trail.frustumCulled=false;this.scene.add(trail);
   this.sprite(p.bullet,p.color,p.size,origin,duration,{origin:origin.clone(),target,impact:end.impact,profile:p,projectile:true,trail,energy,blast:p.blast??['cannon','heatblaster','marshmallow'].includes(packet.weapon),delay:i*.002});
   if(i===0&&energy)this.sprite(p.muzzle,p.color,.25,origin,.08);
  }
 }
 impact(position,profile,large=false){this.sprite(profile.impact,profile.color,large?2.4:.38,position,large?.45:.16,{expand:true});for(let i=0;i<(large?9:3);i++)this.sprite('projectile',profile.color,large?.2:.07,position,.18+Math.random()*.2,{velocity:new THREE.Vector3(Math.random()-.5,Math.random(),Math.random()-.5).multiplyScalar(large?5:2.8),gravity:7})}
 melee(position,color='#bdefff'){this.impact(position,{impact:'impact-star',color},false)}
 update(dt){for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life+=dt;const t=Math.max(0,e.life-(e.delay||0))/e.duration;if(e.projectile){e.object.position.lerpVectors(e.origin,e.target,Math.min(1,t));const direction=e.target.clone().sub(e.origin),distance=direction.length(),head=distance*Math.min(1,t),length=Math.min(head,e.energy?.75:2.1);direction.normalize();e.trail.visible=length>.001;e.trail.position.copy(e.origin).addScaledVector(direction,head-length/2);e.trail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);const width=e.energy?.026:.012;e.trail.scale.set(width,length,width);if(t>=1&&e.impact)this.impact(e.target,e.profile,e.blast)}else if(e.velocity){e.velocity.y-=dt*e.gravity;e.object.position.addScaledVector(e.velocity,dt)}if(e.expand)e.object.scale.setScalar(e.size*(.7+t*.9));e.object.material.opacity=e.projectile?1:Math.max(0,1-t);e.object.material.rotation+=dt*(e.projectile?0:1.5);if(t>=1){this.remove(e);this.effects.splice(i,1)}}}
 remove(e){this.scene.remove(e.object);e.object.material.dispose();if(e.trail){this.scene.remove(e.trail);e.trail.geometry.dispose();e.trail.material.dispose()}}
 clear(){for(const e of this.effects)this.remove(e);this.effects=[]}
}
