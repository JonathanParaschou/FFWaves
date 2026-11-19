import * as THREE from './vendor/three.module.js';
const calibrations=new WeakMap();
// Source rigs have different bind-pose scales and offsets. Measure the original
// animated idle once so the rendered body agrees with its gameplay height/pivot.
export function createEnemyActor(assets,enemy,cfg){
 let cache=calibrations.get(assets);if(!cache){cache=new Map();calibrations.set(assets,cache)}
 let fit=cache.get(cfg.asset);
 if(!fit){
  const sample=assets.model(cfg.asset,{height:1}),controller=sample.userData.animation;
  controller?.update(.05,'idle');sample.updateMatrixWorld(true);controller?.skeleton.update();
  const box=new THREE.Box3().setFromObject(sample,true),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  fit={height:Math.max(.01,size.y),offset:new THREE.Vector3(center.x,box.min.y,center.z)};cache.set(cfg.asset,fit);controller?.dispose();
 }
 const root=new THREE.Group(),model=assets.model(cfg.asset,{height:enemy.height,uniqueMaterials:true}),factor=enemy.height/fit.height;
 model.scale.multiplyScalar(1/fit.height);model.position.copy(fit.offset).multiplyScalar(-factor);root.add(model);
 root.name=cfg.name;root.userData.animation=model.userData.animation;root.userData.sourceModel=model;root.userData.enemyFit=fit;
 return root;
}
