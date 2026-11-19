import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {loadHeroReviewAssets} from '../tests/helpers/hero-scene.mjs';
import {createHeroActor} from '../dist/avatars.js';
import {createHeldWeapon} from '../dist/held-weapon.js';
import {WEAPONS,MELEE_WEAPONS} from '../dist/weapons.js';
import {serializeReviewScene} from './scene-review-lib.mjs';
const {assets,catalog}=await loadHeroReviewAssets(),cases=[];
function view(id,hero,weapon,state={},before=false){
 const scene=new THREE.Scene(),actor=createHeroActor(assets,{hero}),cfg=WEAPONS[weapon]||MELEE_WEAPONS[weapon];scene.add(actor.root);
 const held=createHeldWeapon(assets,weapon,cfg);scene.add(held.root);
 for(let i=0;i<30;i++)actor.update(1/60,{...state,heldWeapon:before?null:held});
 if(before){scene.remove(held.root);const bounds=assets.manifest.assets[cfg.asset].bounds,old=assets.model(cfg.asset,{scale:.65/Math.max(...bounds.size)});scene.add(old);actor.sockets.rightHand.getWorldPosition(old.position)}
 scene.add(new THREE.HemisphereLight('#d7f3ff','#334c5b',2.7));const light=new THREE.DirectionalLight('#fff0d8',3);light.position.set(2,4,4);scene.add(light);
 let camera={eye:[-1.9,1.35,3.3],target:[0,1,.1],fov:34};
 if(id.startsWith('roster-')){
  const box=new THREE.Box3().setFromObject(actor.root,true).union(new THREE.Box3().setFromObject(held.root,true)),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const distance=Math.max(size.y/(2*Math.tan(34*Math.PI/360)),(size.x*.87+size.z*.5)/(2*Math.tan(34*Math.PI/360)*16/9))*1.2+size.z*.3;
  camera={eye:center.clone().add(new THREE.Vector3(-.5,.08,.866).multiplyScalar(distance)).toArray(),target:center.toArray(),fov:34};
 }
 cases.push({id,hero,weapon,state,scene:serializeReviewScene(scene),camera});
 actor.dispose();
}
view('numbuhfour-before','numbuhfour','pistol',{},true);
view('numbuhfour-after','numbuhfour','pistol');
for(const [id,weapon,state]of [
 ['numbuhfour-rifle','rifle',{}],['numbuhfour-cannon','cannon',{}],
 ['numbuhfour-run','rifle',{moving:true,sprinting:true}],['numbuhfour-crouch','rifle',{crouch:1}],
 ['numbuhfour-slide','shotgun',{slide:1}],['numbuhfour-aim-up','rifle',{pitch:.8}],
 ['numbuhfour-aim-down','rifle',{pitch:-.8}],['numbuhfour-reload','rifle',{reloadTimer:1,reloadTotal:2}],
 ['numbuhfour-melee',Object.keys(MELEE_WEAPONS).find(id=>MELEE_WEAPONS[id].asset),{melee:.6}]
])view(id,'numbuhfour',weapon,state);
for(const hero of catalog.heroes)view('roster-'+hero.id,hero.id,'rifle');
await mkdir('qa',{recursive:true});await writeFile('qa/held-weapon-review.json',JSON.stringify(cases));console.log('Exported',cases.length,'baked original-hero poses');
