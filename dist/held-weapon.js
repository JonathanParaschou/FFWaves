import * as THREE from './vendor/three.module.js';
import {createWeaponPresentation} from './weapon-presentation.js';

// External actors use the same measured grips as the FPS gun, in hero +Z space.
// The attachment origin is the trigger grip, rather than the model's bounds centre.
export function createHeldWeapon(assets,id,weapon){
 const root=new THREE.Group();root.name='Held / '+id;
 if(weapon.archetype==='melee'||!weapon.asset){
  if(weapon.asset){const model=assets.model(weapon.asset,{height:.85});model.position.y=-.10;root.add(model)}
  return {root,id,kind:'melee',right:new THREE.Vector3(),left:null,muzzle:new THREE.Vector3(0,.7,0)};
 }
 const presentation=createWeaponPresentation(assets,id,weapon),frame=new THREE.Group();
 const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
 const trigger=new THREE.Vector3(...presentation.grips.right);
 frame.quaternion.copy(turn);frame.position.copy(trigger).applyQuaternion(turn).negate();
 presentation.model.visible=true;frame.add(presentation.model);root.add(frame);
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});
 const left=new THREE.Vector3(...presentation.grips.left).sub(trigger).applyQuaternion(turn);
 // A pistol's support hand cups the firing fist; coincident palm centres would
 // interpenetrate the much larger original full-body hands.
 if(left.length()<.08)left.add(new THREE.Vector3(.06,-.06,-.025));
 return {root,id,kind:'gun',right:new THREE.Vector3(),left,muzzle:presentation.muzzle.clone().sub(trigger).applyQuaternion(turn)};
}

const basis=(along,thumb)=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(along,thumb,new THREE.Vector3().crossVectors(along,thumb)));
const handFrame={right:basis(new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1)),left:basis(new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,1))};

function calibrateHand(body,sockets,side){
 const hand=sockets[side+'Hand'],upper=sockets[side+'UpperArm'],fore=sockets[side+'Forearm'];
 if(!hand||!upper||!fore)return null;
 body.updateMatrixWorld(true);
 const descendants=new Set();hand.traverse(b=>{if(b.isBone)descendants.add(b)});
 const bounds=new THREE.Box3(),point=new THREE.Vector3();let vertices=0;
 body.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();
  const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  for(let i=0;i<indices.count;i++){
   let influence=0;for(let k=0;k<4;k++)if(descendants.has(mesh.skeleton.bones[indices.getComponent(i,k)]))influence+=weights.getComponent(i,k);
   if(influence<.65)continue;
   mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld);hand.worldToLocal(point);bounds.expandByPoint(point);vertices++;
  }
 });
 const fingers=hand.children.filter(b=>b.isBone),along=(fingers.find(b=>/Finger1$/.test(b.userData.sourceName||''))||fingers.at(-1))?.position.clone()||new THREE.Vector3(1,0,0);
 along.normalize();let thumb=fingers[0]?.position.clone()||new THREE.Vector3(0,0,1);
 thumb.addScaledVector(along,-thumb.dot(along));if(thumb.lengthSq()<.0001)thumb.set(0,0,1).addScaledVector(along,-along.z);thumb.normalize();
 return {side,hand,upper,fore,vertices,grip:vertices?bounds.getCenter(new THREE.Vector3()):new THREE.Vector3(),orientation:handFrame[side].clone().multiply(basis(along,thumb).invert())};
}

function pointIn(root,bone){return root.worldToLocal(bone.getWorldPosition(new THREE.Vector3()))}
function orientBone(bone,world,remember){remember(bone);bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));bone.updateWorldMatrix(false,true)}
function aimBone(bone,child,target,remember){const at=bone.getWorldPosition(new THREE.Vector3()),from=child.getWorldPosition(new THREE.Vector3()).sub(at).normalize(),to=target.clone().sub(at).normalize(),world=bone.getWorldQuaternion(new THREE.Quaternion());orientBone(bone,new THREE.Quaternion().setFromUnitVectors(from,to).multiply(world),remember)}

// Two-bone arm IK changes joint rotations only. Source limb lengths and lower-body
// animation remain intact; palm offsets come from each hero's actual hand mesh.
export function createHeldArmPose(root,body,sockets,remember){
 const arms=['right','left'].map(side=>calibrateHand(body,sockets,side)).filter(Boolean);
 // Measure the torso in the shoulder band, excluding arm-weighted vertices.
 // Broad silhouettes (Bloo/Eduardo) need the grip in front of their body as well.
 let chestFront=0;const shoulderY=arms.reduce((s,a)=>s+pointIn(root,a.upper).y,0)/Math.max(1,arms.length);
 const armBones=new Set();for(const arm of arms)arm.upper.traverse(b=>armBones.add(b));
 body.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight,point=new THREE.Vector3();for(let i=0;i<indices.count;i++){let influence=0;for(let k=0;k<4;k++)if(armBones.has(mesh.skeleton.bones[indices.getComponent(i,k)]))influence+=weights.getComponent(i,k);if(influence>.3)continue;mesh.getVertexPosition(i,point);point.applyMatrix4(mesh.matrixWorld);root.worldToLocal(point);if(point.y>shoulderY-.3&&point.y<shoulderY+.05)chestFront=Math.max(chestFront,point.z)}});
 const chest=sockets.back||sockets.pelvis,frontOffset=chest?chestFront-pointIn(root,chest).z:chestFront;
 const diagnostics={arms};
 function update(dt,held,{pitch=0,sprinting=false,reloadTimer=0,reloadTotal=1,melee=0,firing=false}={}){
  if(!held||!arms.length)return;root.updateMatrixWorld(true);
  const gunRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch+(sprinting?.3:0)+(reloadTimer>0?.22:0)-melee*.85,0,reloadTimer>0?-.25:melee*.3));
  const right=arms.find(a=>a.side==='right'&&a.vertices)||arms.find(a=>a.vertices)||arms[0],left=arms.find(a=>a!==right&&a.vertices);
  const worldScale=root.getWorldScale(new THREE.Vector3());
  let records=arms.filter(a=>a===right||a===left&&held.left).map(arm=>{
   const shoulder=pointIn(root,arm.upper),elbow=pointIn(root,arm.fore),wrist=pointIn(root,arm.hand),length1=shoulder.distanceTo(elbow),length2=elbow.distanceTo(wrist);
   const orientation=gunRotation.clone().multiply(arm.orientation),scale=arm.hand.getWorldScale(new THREE.Vector3()).divide(worldScale);
   return {arm,grip:arm===right?held.right:held.left,shoulder,length1,length2,reach:length1+length2-.001,minimum:Math.abs(length1-length2)+.001,orientation,palm:arm.grip.clone().multiply(scale).applyQuaternion(orientation)};
  });
  const dominant=records.find(r=>r.arm===right),shoulder=dominant.shoulder;
  const desired=new THREE.Vector3(shoulder.x*.7,shoulder.y-Math.min(.2,dominant.reach*.3),shoulder.z+Math.min(.3,dominant.reach*.55));
  if(sprinting)desired.y-=.08;if(reloadTimer>0)desired.y-=.04;
  const front=(chest?pointIn(root,chest).z:0)+frontOffset+.05;
  let anchor=desired.clone(),scale=1,fitted=false;
  for(let hands=0;hands<2&&!fitted;hands++){
   if(hands){records=records.filter(r=>r===dominant);desired.x=shoulder.x;}
   for(let fit=0;fit<=5;fit++){
    scale=1-fit*.05;anchor.copy(desired);
    for(const r of records){r.offset=r.grip.clone().multiplyScalar(scale).applyQuaternion(gunRotation).sub(r.palm);r.center=r.shoulder.clone().sub(r.offset)}
    for(let i=0;i<40;i++){
     anchor.z=Math.max(anchor.z,front);
     for(const r of records){const d=anchor.clone().sub(r.center),length=d.length();if(length>r.reach||length<r.minimum){if(length<.00001)d.set(0,0,1);else d.divideScalar(length);anchor.copy(r.center).addScaledVector(d,THREE.MathUtils.clamp(length,r.minimum,r.reach))}}
    }
    if(records.length===1){
     const r=records[0];if(front<=r.center.z+r.reach){
      anchor.z=Math.max(front,anchor.z);
      const dz=anchor.z-r.center.z,maximum=Math.sqrt(Math.max(0,r.reach*r.reach-dz*dz)),minimum=Math.sqrt(Math.max(0,r.minimum*r.minimum-dz*dz));
      const xy=new THREE.Vector2(anchor.x-r.center.x,anchor.y-r.center.y),length=xy.length();if(length<.00001)xy.set(1,0);else xy.divideScalar(length);
      xy.multiplyScalar(THREE.MathUtils.clamp(length,minimum,maximum));anchor.x=r.center.x+xy.x;anchor.y=r.center.y+xy.y;
     }
    }
    fitted=anchor.z>=front-.001&&records.every(r=>{const d=anchor.distanceTo(r.center);return d<=r.reach+.0001&&d>=r.minimum-.0001});if(fitted)break;
   }
  }
  held.root.scale.setScalar(scale);for(const arm of arms){arm.target=null;arm.error=null}
  const worldPosition=root.localToWorld(anchor.clone()),worldRotation=root.getWorldQuaternion(new THREE.Quaternion()).multiply(gunRotation);
  held.root.position.copy(held.root.parent?held.root.parent.worldToLocal(worldPosition):worldPosition);
  held.root.quaternion.copy(worldRotation);if(held.root.parent)held.root.quaternion.premultiply(held.root.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  held.root.updateMatrixWorld(true);
  for(const r of records){
   const {arm}=r,grip=held.root.localToWorld(r.grip.clone()),handRotation=root.getWorldQuaternion(new THREE.Quaternion()).multiply(r.orientation);
   const palm=arm.grip.clone().multiply(arm.hand.getWorldScale(new THREE.Vector3())).applyQuaternion(handRotation);
   const target=grip.clone().sub(palm),start=arm.upper.getWorldPosition(new THREE.Vector3()),direction=target.clone().sub(start),distance=direction.length();direction.normalize();
   const l1=r.length1*worldScale.x,l2=r.length2*worldScale.x,d=THREE.MathUtils.clamp(distance,Math.abs(l1-l2)+.00001,l1+l2-.00001),along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
   const pole=new THREE.Vector3(arm.side==='right'?-.7:.7,-1,-.15).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));pole.addScaledVector(direction,-pole.dot(direction)).normalize();
   const elbow=start.clone().addScaledVector(direction,along).addScaledVector(pole,height);
   aimBone(arm.upper,arm.fore,elbow,remember);aimBone(arm.fore,arm.hand,target,remember);orientBone(arm.hand,handRotation,remember);
   arm.target=grip;arm.error=arm.hand.localToWorld(arm.grip.clone()).distanceTo(grip);
  }
  root.updateMatrixWorld(true);diagnostics.scale=scale;diagnostics.supported=records.length===2;diagnostics.front=front;diagnostics.fitted=fitted;
 }
 return {update,diagnostics};
}
