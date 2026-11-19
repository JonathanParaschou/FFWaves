import {readFile,writeFile,mkdir} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {loadHeroReviewAssets} from '../tests/helpers/hero-scene.mjs';
import {createHeroActor} from '../dist/avatars.js';
import {createHeldWeapon} from '../dist/held-weapon.js';
import {WEAPONS} from '../dist/weapons.js';
import {serializeReviewScene} from './scene-review-lib.mjs';
const {assets,catalog}=await loadHeroReviewAssets(),record=catalog.accessories.find(a=>a.id==='nergal-tendrils');
const rig=JSON.parse(await readFile('dist/assets/animations/'+record.asset+'.json','utf8'));assets.rigs.set(record.asset,rig);
const sample=assets.model(record.asset),bounds=new THREE.Box3(),duration=Math.max(...rig.clips.map(c=>c.duration));
for(let i=0;i<120;i++){sample.userData.animation.update(duration/120,'idle');sample.updateMatrixWorld(true);sample.userData.animation.skeleton.update();bounds.union(new THREE.Box3().setFromObject(sample,true))}
const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=record.targetHeight/size.y;
record.displayFit={scale,offset:[-center.x*scale,-bounds.min.y*scale,-center.z*scale],cycleBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},method:'Uniform scale and grounding from the complete original animation cycle'};
// Replace only this record; retain existing source metadata and number formatting.
const catalogPath='dist/assets/heroes-catalog.json',catalogText=await readFile(catalogPath,'utf8');
const pattern=/    \{\r?\n      "id": "nergal-tendrils",[\s\S]*?\r?\n    \}/;
if(!pattern.test(catalogText))throw new Error('Nergal Tendrils catalog record is missing');
const replacement=JSON.stringify(record,null,2).split('\n').map(line=>'    '+line).join('\n');
await writeFile(catalogPath,catalogText.replace(pattern,replacement));sample.userData.animation.dispose();
const cases=[];
for(const [name,hero,state,eye]of [
 ['Numbuh Four / back','numbuhfour',{},[2.4,1.6,-3.7]],
 ['Numbuh Four / moving','numbuhfour',{moving:true,sprinting:true},[-2.4,1.5,-3.7]],
 ['Numbuh Four / crouch','numbuhfour',{crouch:1},[2.4,1.5,-3.7]],
 ['Dexter / back','dexter',{},[2.4,1.5,-3.7]],
 ['Gwen / back','gwen',{},[-2.4,1.5,-3.7]],
 ['Numbuh Four / front','numbuhfour',{},[-2.4,1.5,3.7]]
]){
 const scene=new THREE.Scene(),actor=createHeroActor(assets,{hero,back:record.id}),held=createHeldWeapon(assets,'rifle',WEAPONS.rifle);scene.add(actor.root,held.root);
 for(let i=0;i<45;i++)actor.update(1/60,{...state,heldWeapon:held});
 scene.add(new THREE.HemisphereLight('#dcf5f4','#274453',3));const light=new THREE.DirectionalLight('#fff1da',3);light.position.set(2,4,-3);scene.add(light);
 cases.push({name,scene:serializeReviewScene(scene),camera:{eye,target:[0,1,.0],fov:34}});actor.dispose();
}
await mkdir('qa',{recursive:true});await writeFile('qa/tentacle-review.json',JSON.stringify(cases));console.log('Fitted original tentacle animation:',record.displayFit);
