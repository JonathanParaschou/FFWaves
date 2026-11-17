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
export function combatProfile(id){return profiles[id]||profiles.pistol}
export class CombatEffects{
 constructor(scene,assets){this.scene=scene;this.assets=assets;this.effects=[]}
 texture(id){const record=this.assets.combatFxCatalog?.textures[id];return record?this.assets.textures.get(record.url):null}
 flash(material,id){const p=combatProfile(id),texture=this.texture(p.muzzle);if(!material.map&&texture)material.needsUpdate=true;material.map=texture;material.color.set(p.color);return p.flash}
 sprite(texture,color,size,pos,life,extra={}){const mat=new THREE.SpriteMaterial({map:this.texture(texture),color,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending}),object=new THREE.Sprite(mat);object.position.copy(pos);object.scale.set(size,size,1);this.scene.add(object);this.effects.push({object,life:0,duration:life,size,...extra});return object}
 shot(packet){const p=combatProfile(packet.weapon),origin=new THREE.Vector3(packet.origin.x,packet.origin.y,packet.origin.z);for(const [i,end]of packet.ends.entries()){const target=new THREE.Vector3(end.x,end.y,end.z),distance=origin.distanceTo(target),duration=Math.max(.035,Math.min(.32,distance/p.speed));this.sprite(p.bullet,p.color,p.size,origin,duration,{origin:origin.clone(),target,impact:end.impact,profile:p,projectile:true,delay:i*.004});if(i===0&&['cannon','marshmallow'].includes(packet.weapon))this.sprite(p.muzzle,p.color,.25,origin,.065)} }
 impact(position,profile,large=false){this.sprite(profile.impact,profile.color,large?2.4:.38,position,large?.45:.16,{expand:true});for(let i=0;i<(large?9:3);i++)this.sprite('projectile',profile.color,large?.2:.07,position,.18+Math.random()*.2,{velocity:new THREE.Vector3(Math.random()-.5,Math.random(),Math.random()-.5).multiplyScalar(large?5:2.8),gravity:7})}
 melee(position,color='#bdefff'){this.impact(position,{impact:'impact-star',color},false)}
 update(dt){for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life+=dt;const t=e.life/e.duration;if(e.projectile){e.object.position.lerpVectors(e.origin,e.target,Math.min(1,t));if(t>=1&&e.impact)this.impact(e.target,e.profile,e.size>.5)}else if(e.velocity){e.velocity.y-=dt*e.gravity;e.object.position.addScaledVector(e.velocity,dt)}if(e.expand)e.object.scale.setScalar(e.size*(.7+t*.9));e.object.material.opacity=e.projectile?1:Math.max(0,1-t);e.object.material.rotation+=dt*(e.projectile?0:1.5);if(t>=1){this.scene.remove(e.object);e.object.material.dispose();this.effects.splice(i,1)}}}
 clear(){for(const e of this.effects){this.scene.remove(e.object);e.object.material.dispose()}this.effects=[]}
}
