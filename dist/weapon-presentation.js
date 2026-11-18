import * as THREE from './vendor/three.module.js';
// Grip anchors are expressed in the extracted model's normalized bounds (muzzle = +Z).
export const WEAPON_PRESENTATION={
 pistol:{length:.43,frameAnchor:[0,.18,-.18],trigger:[0,0.1998,-0.3231],support:[0,0.1838,-0.3231],leftRotation:[0,0,Math.PI],leftWristOffset:[0,.055,.035],hip:[.23,-.39,-.77]},
 rifle:{length:.76,frameAnchor:[0,.15,-.16],trigger:[0,0.2269,-0.2728],support:[0,0.3362,0.1412],hip:[.25,-.40,-.79]},
 shotgun:{length:.79,frameAnchor:[0,.18,-.20],trigger:[0,0.3782,-0.2082],support:[0,0.3884,0.1197],hip:[.25,-.40,-.81]},
 cannon:{length:.84,frameAnchor:[0,.17,-.23],trigger:[0,0.132,0.0072],support:[0,0.1375,0.1771],hip:[.27,-.43,-.84]},
 spitwad:{length:.82,frameAnchor:[0,.18,-.19],trigger:[0,0.1928,-0.2058],support:[0,0.5,0.1556],hip:[.25,-.41,-.82]},
 rotation:{length:.73,frameAnchor:[0,.17,-.18],trigger:[-.28,0.5684,-0.4356],support:[0,0.3474,0.0239],hip:[.25,-.40,-.79]},
 heatblaster:{length:.47,frameAnchor:[0,.19,-.17],trigger:[0,0.385,-0.3494],support:[0,0.385,0.0191],hip:[.23,-.39,-.78]},
 scattergun:{length:.76,frameAnchor:[0,.17,-.20],trigger:[0,0.1779,-0.1986],support:[0,0.4092,0.1723],hip:[.26,-.42,-.82]},
 marshmallow:{length:.84,frameAnchor:[0,.15,-.22],trigger:[0,0.4353,-0.3446],support:[0,0.5216,0.2154],hip:[.27,-.44,-.86]},
 bracer:{length:.42,frameAnchor:[0,.20,-.14],trigger:[0,0.0743,-0.1388],support:[0,0.047,-0.1388],leftRotation:[0,0,Math.PI],leftWristOffset:[0,.055,.035],hip:[.23,-.39,-.77]}
};
export function createWeaponPresentation(assets,id,weapon){
 const profile=weapon.presentation||WEAPON_PRESENTATION[id]||WEAPON_PRESENTATION[weapon.archetype]||WEAPON_PRESENTATION.rifle,bounds=assets.manifest.assets[weapon.asset].bounds,scale=profile.length/bounds.size[2],model=assets.model(weapon.asset,{scale}),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
 const sourcePoint=([x,y,z])=>new THREE.Vector3(x*bounds.size[0],y*bounds.size[1],z*bounds.size[2]).multiplyScalar(scale).applyQuaternion(rotation),frame=sourcePoint(profile.frameAnchor||profile.trigger),trigger=sourcePoint(profile.trigger),support=sourcePoint(profile.support);
 if(profile.snapGrips){const snap=point=>{let best=Infinity,result=point;model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,index=o.geometry.index?.array||Array.from({length:p.count},(_,i)=>i);for(let i=0;i<index.length;i+=3){const vertices=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,index[i+k]).multiplyScalar(scale).applyQuaternion(rotation)),candidate=new THREE.Triangle(...vertices).closestPointToPoint(point,new THREE.Vector3()),distance=candidate.distanceToSquared(point);if(distance<best){best=distance;result=candidate}}});return result};trigger.copy(snap(trigger));support.copy(snap(support))}
 model.quaternion.copy(rotation);model.position.copy(frame).negate();model.visible=false;model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=false});model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),tip=[];
 model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)if(p.getZ(i)>bounds.max[2]-bounds.size[2]*.045)tip.push(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(o.matrixWorld))});
 const muzzle=tip.reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(1/Math.max(1,tip.length));
 return {model,profile,top:box.max.y,muzzle,grips:{right:trigger.sub(frame).add(new THREE.Vector3(.015,-.005,.015)).toArray(),left:support.sub(frame).toArray(),rightRotation:[0,0,.06],leftRotation:profile.leftRotation||[0,0,-Math.PI/2],leftWristOffset:profile.leftWristOffset}};
}
