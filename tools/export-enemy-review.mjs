import {mkdir,readFile,writeFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {loadReviewAssets,serializeReviewScene} from './scene-review-lib.mjs';
import {ENEMY_TYPES} from '../dist/enemy-roster.js';
import {createEnemyActor} from '../dist/enemy-actor.js';
const assets=await loadReviewAssets(),views=[];
for(const [id,cfg]of Object.entries(ENEMY_TYPES)){
 const data=JSON.parse(await readFile('dist/'+assets.manifest.assets[cfg.asset].url,'utf8'));
 for(const part of data.parts)for(const material of part.materials||[])if(material.map&&!assets.textures.has(material.map)){const texture=new THREE.Texture();texture.userData.sourceUrl=material.map;texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;assets.textures.set(material.map,texture)}
 assets.registerModel(cfg.asset,data);assets.rigs.set(cfg.asset,JSON.parse(await readFile('dist/assets/animations/'+cfg.asset+'.json','utf8')));
 for(const state of ['run',cfg.ranged?'ranged':'attack']){
  const scene=new THREE.Scene(),model=createEnemyActor(assets,{height:Math.min(cfg.height,1.8)},cfg);scene.add(model);
  for(let i=0;i<20;i++)model.userData.animation.update(1/60,state);
  scene.add(new THREE.HemisphereLight('#dff8f4','#243e4e',2.7));const light=new THREE.DirectionalLight('#eef2df',3);light.position.set(2,4,4);scene.add(light);
  model.updateMatrixWorld(true);model.userData.animation.skeleton.update();const box=new THREE.Box3().setFromObject(model,true),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const distance=Math.max(size.y/(2*Math.tan(34*Math.PI/360)),(size.x*.87+size.z*.5)/(2*Math.tan(34*Math.PI/360)*16/9))*1.2+size.z*.3;
  views.push({id,role:cfg.role,name:cfg.name,tier:cfg.tier,state,scene:serializeReviewScene(scene),camera:{eye:center.clone().add(new THREE.Vector3(-.5,.12,.866).multiplyScalar(distance)).toArray(),target:center.toArray(),fov:34}});model.userData.animation.dispose();
 }
}
await mkdir('qa',{recursive:true});await writeFile('qa/enemy-review.json',JSON.stringify(views));console.log('Exported',views.length,'original skinned enemy poses');
