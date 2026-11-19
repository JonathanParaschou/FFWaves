import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {loadHeroReviewAssets} from './helpers/hero-scene.mjs';
import {createHeroActor} from '../dist/avatars.js';
import {createHeldWeapon} from '../dist/held-weapon.js';
import {WEAPONS,MELEE_WEAPONS} from '../dist/weapons.js';
import {RemotePlayers} from '../dist/remote-players.js';
const {assets,catalog}=await loadHeroReviewAssets();
const point=bone=>bone.getWorldPosition(new THREE.Vector3());

test('all forty external gun grips and muzzles remain on their actual source meshes',()=>{
 for(const [id,weapon]of Object.entries(WEAPONS)){
  const held=createHeldWeapon(assets,id,weapon);held.root.updateMatrixWorld(true);
  let gripDistance=Infinity,muzzleDistance=Infinity;
  held.root.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position,index=mesh.geometry.index.array;
   for(let i=0;i<index.length;i+=3){const triangle=new THREE.Triangle(...[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,index[i+k]).applyMatrix4(mesh.matrixWorld)));
    const grip=triangle.closestPointToPoint(held.right,new THREE.Vector3()).distanceTo(held.right),muzzle=triangle.closestPointToPoint(held.muzzle,new THREE.Vector3()).distanceTo(held.muzzle);
    if(Number.isFinite(grip))gripDistance=Math.min(gripDistance,grip);
    if(Number.isFinite(muzzle))muzzleDistance=Math.min(muzzleDistance,muzzle);
   }
  });
  assert.ok(gripDistance<.04,id+' trigger floats away from the gun');
  assert.ok(muzzleDistance<.04,id+' flash is not at the muzzle');
  assert.ok(held.muzzle.z>held.right.z+.12,id+' points backwards');
 }
});

test('all heroes retain original limb lengths and meet equipped gun grips through movement, aim and reload',()=>{
 const states=[{},{moving:true,sprinting:true},{crouch:1},{slide:1},{pitch:1.3},{pitch:-1.3},{reloadTimer:1,reloadTotal:2}];
 for(const hero of catalog.heroes){
  const scene=new THREE.Scene(),actor=createHeroActor(assets,{hero:hero.id});scene.add(actor.root);
  actor.root.position.set(7,.8,-3);actor.root.rotation.y=1.1;actor.root.updateMatrixWorld(true);
  const lengths=actor.heldPose.diagnostics.arms.map(a=>[point(a.upper).distanceTo(point(a.fore)),point(a.fore).distanceTo(point(a.hand))]);
  for(const [id,weapon]of Object.entries(WEAPONS)){
   const held=createHeldWeapon(assets,id,weapon);scene.add(held.root);
   for(const state of states){
    actor.update(1/60,{...state,heldWeapon:held});
    for(const [i,arm]of actor.heldPose.diagnostics.arms.entries()){
     assert.ok(Math.abs(point(arm.upper).distanceTo(point(arm.fore))-lengths[i][0])<.001,hero.id+' upper arm stretched');
     assert.ok(Math.abs(point(arm.fore).distanceTo(point(arm.hand))-lengths[i][1])<.001,hero.id+' forearm stretched');
     if(arm.target)assert.ok(arm.error<.003,hero.id+'/'+id+' palm misses grip');
     assert.ok(arm.hand.quaternion.toArray().every(Number.isFinite));
    }
    assert.ok(actor.heldPose.diagnostics.arms.some(a=>a.target&&a.vertices),'gun must use a visible source hand');
   }
   scene.remove(held.root);
  }
  actor.dispose();
 }
});

test('bulky silhouettes keep the trigger in front of the torso and Wilt retains his missing hand',()=>{
 for(const id of ['bloo','eduardo','numbuhtwo','wilt']){
  const actor=createHeroActor(assets,{hero:id}),held=createHeldWeapon(assets,'rifle',WEAPONS.rifle);
  for(let i=0;i<60;i++)actor.update(1/60,{heldWeapon:held});
  assert.ok(held.root.position.z>=actor.heldPose.diagnostics.front-.002,id+' gun is buried in the torso');
  if(id==='wilt'){const missing=actor.heldPose.diagnostics.arms.find(a=>!a.vertices);assert.ok(missing);assert.equal(missing.target,null);assert.equal(actor.heldPose.diagnostics.supported,false)}
  actor.dispose();
 }
});

test('external poses preserve lower-body animation, source assets and the hidden first-person body',()=>{
 const a=createHeroActor(assets,{hero:'numbuhfour'}),b=createHeroActor(assets,{hero:'numbuhfour'}),held=createHeldWeapon(assets,'rifle',WEAPONS.rifle);
 const source=assets.models.get(a.hero.asset).children[0].geometry.attributes.position.array,before=source.slice();
 for(let i=0;i<50;i++){a.update(1/60,{moving:true,sprinting:true,heldWeapon:held});b.update(1/60,{moving:true,sprinting:true});for(const key of ['pelvis','leftThigh','rightThigh','leftCalf','rightCalf']){assert.ok(a.sockets[key].position.distanceTo(b.sockets[key].position)<1e-6);assert.ok(a.sockets[key].quaternion.clone().normalize().angleTo(b.sockets[key].quaternion.clone().normalize())<1e-6)}}
 a.update(1/60,{firstPerson:true,heldWeapon:held});assert.equal(a.root.visible,false);
 for(const arm of a.heldPose.diagnostics.arms)assert.ok(arm.hand.quaternion.clone().normalize().angleTo(b.sockets[arm.side+'Hand'].quaternion.clone().normalize())<1e-6,'third-person grip override was not restored');
 assert.deepEqual(source,before);a.dispose();b.dispose();
});

test('melee and bare-hand external attachments do not use firearm bounds',()=>{
 const actor=createHeroActor(assets,{hero:'numbuhfour'});
 for(const [id,cfg]of Object.entries(MELEE_WEAPONS)){
  const held=createHeldWeapon(assets,id,cfg);assert.equal(held.kind,'melee');
  actor.update(.016,{heldWeapon:held,melee:.7});
  assert.ok(actor.heldPose.diagnostics.arms.find(a=>a.target).error<.003);
 }
 actor.dispose();
});

test('remote avatars share the grip pose and place flashes at the equipped weapon muzzle',()=>{
 const scene=new THREE.Scene(),peers=new RemotePlayers(scene,assets,()=>new THREE.Group(),null),actor=createHeroActor(assets,{hero:'numbuhfour'});
 const entry={loaded:true,actor,state:{x:0,z:0,y:0,floorY:0,yaw:.7,pitch:.4,weapons:[{id:'rifle'}],weaponIndex:0,moveSpeed:0,nano:0,crouchBlend:0,slideBlend:0},name:new THREE.Group(),ring:new THREE.Group(),gunRoot:new THREE.Group(),guns:new Map(),flash:new THREE.Sprite(new THREE.SpriteMaterial()),nano:{index:0,object:new THREE.Group(),cast:0,initialized:false}};
 scene.add(actor.root,entry.gunRoot);entry.gunRoot.add(entry.flash);peers.entries.set('guest',entry);
 const sim={layout:{blocked:()=>false},flow:{}};
 for(let i=0;i<20;i++)peers.update(1/60,i/60,sim);
 const held=entry.guns.get('rifle');assert.ok(held);
 for(const arm of actor.heldPose.diagnostics.arms)if(arm.target)assert.ok(arm.error<.003);
 assert.ok(entry.flash.getWorldPosition(new THREE.Vector3()).distanceTo(held.root.localToWorld(held.muzzle.clone()))<1e-6);
 assert.ok(peers.shot('guest','#ffffff','rifle').distanceTo(held.root.localToWorld(held.muzzle.clone()))<1e-6,'remote trails must also leave the held muzzle');
 actor.dispose();entry.flash.material.dispose();
});
