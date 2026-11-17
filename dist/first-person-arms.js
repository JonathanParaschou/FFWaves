import {extractHeroArms} from './hero-arms.js';
import * as THREE from './vendor/three.module.js';
const Y=new THREE.Vector3(0,1,0);
export function createFirstPersonArms(scene){
 const root=new THREE.Group();root.name='Operative first-person arms';scene.add(root);
 const sleeve=new THREE.MeshStandardMaterial({color:'#234a6a',roughness:.8}),cuff=new THREE.MeshStandardMaterial({color:'#5b8caa',roughness:.6}),glove=new THREE.MeshStandardMaterial({color:'#172e40',roughness:.65}),knuckle=new THREE.MeshStandardMaterial({color:'#406d84',roughness:.6});
 function segment(radiusTop,radiusBottom,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,1,8),material);root.add(mesh);return mesh}
 function hand(side){const group=new THREE.Group();function block(size,position,material=glove){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...position);group.add(m);return m}block([.038,.096,.054],[.027,0,.004]);block([.012,.066,.043],[.049,.002,.004],knuckle);for(let i=0;i<4;i++){const y=-.032+i*.022;block([.053,.019,.024],[.004,y,-.035]);block([.020,.019,.045],[-.030,y,-.013]);block([.022,.016,.020],[-.027,y,.016])}const thumb=block([.026,.047,.030],[.015,side>0?.053:-.050,.021]);thumb.rotation.z=side*.3;group.userData.gripClosed=true;root.add(group);return group}
 const arms=[1,-1].map(side=>({upper:segment(.058,.065,sleeve),fore:segment(.039,.054,sleeve),cuff:segment(.045,.048,cuff),hand:hand(side)}));
 const cell=new THREE.Mesh(new THREE.CylinderGeometry(.032,.032,.125,10),new THREE.MeshStandardMaterial({color:'#7ed1e6',emissive:'#28718b',emissiveIntensity:.35,roughness:.35,metalness:.35}));cell.visible=false;root.add(cell);
 let native=false;
 function setHero(assets,hero){const parts=extractHeroArms(assets,hero);for(let i=0;i<2;i++){for(const key of ['upper','fore','hand']){const old=arms[i][key];old.parent?.remove(old);old.traverse(o=>{if(o.isMesh)o.geometry.dispose()});arms[i][key]=parts[i][key];root.add(parts[i][key])}arms[i].cuff.visible=false}native=true;root.userData.hero=hero.id}
 const temp=new THREE.Vector3();
 function connect(mesh,a,b){temp.copy(b).sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(Y,temp.clone().normalize());mesh.scale.y=temp.length()}
 function poseArm(arm,shoulder,elbow,grip,rotation,wristOffset=[0,-.055,.035]){const wrist=grip.clone().add(new THREE.Vector3(...wristOffset).applyQuaternion(rotation));connect(arm.upper,shoulder,elbow);connect(arm.fore,elbow,wrist);const wristBase=wrist.clone().lerp(elbow,.13);connect(arm.cuff,wristBase,wrist);arm.hand.position.copy(grip);arm.hand.quaternion.copy(rotation)}
 function update(gunGroup,pose,weapon,grips){gunGroup.updateMatrixWorld(true);const orientation=gunGroup.quaternion;
  const rightLocal=new THREE.Vector3(...(grips?.right||[.015,-.005,.015])),neutral=grips?.left||(weapon==='pistol'?[-.015,.045,-.13]:[0,.065,-.25]),leftLocal=new THREE.Vector3(...neutral);
  if(pose.reload?.supportOffset)leftLocal.add(new THREE.Vector3(...pose.reload.supportOffset));
  const right=rightLocal.applyQuaternion(orientation).add(gunGroup.position),left=leftLocal.applyQuaternion(orientation).add(gunGroup.position);
  const rightRotation=orientation.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...(grips?.rightRotation||[0,0,.06])))),leftRotation=orientation.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...(grips?.leftRotation||[0,0,-Math.PI/2]))));
  poseArm(arms[0],new THREE.Vector3(.42,-.87,.08),new THREE.Vector3(.41,-.58,-.30),right,rightRotation);
  poseArm(arms[1],new THREE.Vector3(-.40,-.88,.08),new THREE.Vector3(-.35,-.61,-.38),left,leftRotation,grips?.leftWristOffset);
  for(const m of [arms[1].upper,arms[1].fore,arms[1].cuff,arms[1].hand])m.visible=true;
  if(native)for(const arm of arms)arm.cuff.visible=false;
  cell.visible=!!pose.reload?.cellVisible;cell.position.copy(left).add(new THREE.Vector3(.015,.035,-.02).applyQuaternion(orientation));cell.quaternion.copy(leftRotation);cell.rotation.z+=.15;
 }
 return {root,update,cell,arms,setHero,setColors(color,accent,handColor='#172e40'){sleeve.color.set(color);cuff.color.set(accent);glove.color.set(handColor);knuckle.color.set(handColor).multiplyScalar(.85)}};
}
