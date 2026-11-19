import {combatProfile} from './combat-effects.js';
import {createHeldWeapon} from './held-weapon.js';
import * as THREE from './vendor/three.module.js';
import {createHeroActor,HEROES} from './avatars.js';
import {resolveSquad} from './nanos.js';
import {WEAPONS,MELEE_WEAPONS} from './weapons.js';
import {groundHeight} from './layout.js';
import {updateCompanion} from './companions.js';
export class RemotePlayers {
 constructor(scene,assets,label,glow){this.scene=scene;this.assets=assets;this.label=label;this.glow=glow;this.entries=new Map()}
 set(states,localId){const ids=new Set();for(const state of states){if(state.id===localId)continue;ids.add(state.id);const squad=resolveSquad(state.profile.loadout),nano=squad[state.nano],signature=JSON.stringify([state.profile.operative,nano.asset]);let entry=this.entries.get(state.id);if(entry&&entry.signature!==signature){this.remove(entry);this.entries.delete(state.id);entry=null}if(!entry){entry={id:state.id,signature,state,loaded:false};this.entries.set(state.id,entry);this.load(entry,nano).catch(()=>{if(this.entries.get(entry.id)===entry)this.entries.delete(entry.id)})}entry.state=state}for(const [id,entry]of this.entries)if(!ids.has(id)){this.remove(entry);this.entries.delete(id)}}
 async load(entry,nano){const hero=HEROES.find(h=>h.id===entry.state.profile.operative.hero)||HEROES[0];await Promise.all([this.assets.ensureRig(hero.asset),this.assets.ensureRig(nano.asset)]);if(this.entries.get(entry.id)!==entry)return;entry.actor=createHeroActor(this.assets,entry.state.profile.operative);this.scene.add(entry.actor.root);entry.actor.root.position.set(entry.state.x,groundHeight(entry.state.x,entry.state.z,entry.state)+entry.state.y,entry.state.z);entry.name=this.label(entry.state.profile.name,'#b9eff6');entry.name.scale.set(1.55,.38,1);this.scene.add(entry.name);const model=this.assets.model(nano.asset,{height:.48});this.scene.add(model);entry.nano={index:0,object:model,cast:0,initialized:false};entry.gunRoot=new THREE.Group();this.scene.add(entry.gunRoot);entry.guns=new Map();entry.flash=new THREE.Sprite(new THREE.SpriteMaterial({map:this.glow,color:'#c8f4ff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));entry.flash.position.set(0,.12,.48);entry.flash.scale.set(.27,.27,1);entry.gunRoot.add(entry.flash);entry.ring=new THREE.Mesh(new THREE.RingGeometry(.65,.78,32),new THREE.MeshBasicMaterial({color:'#ffbe8e',transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));entry.ring.rotation.x=-Math.PI/2;this.scene.add(entry.ring);entry.loaded=true}
 update(dt,time,sim){for(const entry of this.entries.values()){
  if(!entry.loaded)continue;
  const p=entry.state,melee=MELEE_WEAPONS[p.meleeId],usingMelee=melee&&p.meleeTimer>melee.cooldown-melee.duration;
  const target=new THREE.Vector3(p.x,groundHeight(p.x,p.z,p)+p.y,p.z);
  entry.actor.root.position.lerp(target,1-Math.exp(-dt*20));
  const yaw=(p.yaw||0)+Math.PI,delta=Math.atan2(Math.sin(yaw-entry.actor.root.rotation.y),Math.cos(yaw-entry.actor.root.rotation.y));
  entry.actor.root.rotation.y+=delta*Math.min(1,dt*18);
  const weapon=usingMelee?'melee:'+p.meleeId:p.weapons[p.weaponIndex].id;
  if(!entry.guns.has(weapon)){const cfg=usingMelee?melee:WEAPONS[weapon],held=createHeldWeapon(this.assets,weapon,cfg);entry.gunRoot.add(held.root);entry.guns.set(weapon,held)}
  for(const [id,held]of entry.guns)held.root.visible=id===weapon;
  const heldWeapon=entry.guns.get(weapon);
  entry.actor.update(dt,{moving:p.moveSpeed>.3,sprinting:p.isSprinting,crouch:p.downed?1:p.crouchBlend,slide:p.slideBlend,firing:p.fireTimer>.03||usingMelee,melee:usingMelee?Math.sin(Math.PI*Math.min(1,(melee.cooldown-p.meleeTimer)/melee.duration)):0,firstPerson:false,eyeHeight:p.eyeHeight,heldWeapon:p.downed?null:heldWeapon,pitch:p.pitch||0,reloadTimer:p.reloadTimer,reloadTotal:p.reloadTotal});
  entry.name.position.copy(entry.actor.root.position).add(new THREE.Vector3(0,p.downed?1.1:2.35,0));
  entry.ring.visible=p.downed;entry.ring.position.set(p.x,groundHeight(p.x,p.z,p)+.06,p.z);entry.gunRoot.visible=!p.downed;
  entry.flash.position.copy(entry.gunRoot.worldToLocal(heldWeapon.root.localToWorld(heldWeapon.muzzle.clone())));
  entry.flash.material.opacity=Math.max(0,entry.flash.material.opacity-dt*18);
  const angle=updateCompanion(entry.nano,{player:p,selected:0,yaw:p.yaw||0,pitch:p.pitch||0,time,dt,moving:p.moveSpeed>.3,layout:sim.layout,aiming:false});
  if(angle!==null){entry.nano.object.rotation.y=angle;entry.nano.object.userData.animation?.update(dt,'idle')}
 }}
 shot(id,color,weapon){const entry=this.entries.get(id);if(entry?.loaded){const profile=combatProfile(weapon),texture=this.assets.combatFxCatalog?.textures[profile.muzzle];if(texture)entry.flash.material.map=this.assets.textures.get(texture.url);entry.flash.material.color.set(color);entry.flash.scale.set(profile.flash,profile.flash,1);entry.flash.material.opacity=.9;return entry.flash.getWorldPosition(new THREE.Vector3())}}
 cast(id){const entry=this.entries.get(id);if(entry?.loaded){entry.nano.cast=1.2;entry.nano.object.userData.animation?.cast()}}
 remove(entry){entry.actor?.dispose();for(const object of [entry.name,entry.nano?.object,entry.gunRoot,entry.ring])if(object)this.scene.remove(object);entry.nano?.object.userData.animation?.dispose();entry.ring?.geometry.dispose();entry.ring?.material.dispose();entry.flash?.material.dispose()}
 clear(){for(const entry of this.entries.values())this.remove(entry);this.entries.clear()}
}
