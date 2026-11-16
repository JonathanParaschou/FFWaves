import * as THREE from './vendor/three.module.js';
const Y=new THREE.Vector3(0,1,0);
export function createFirstPersonArms(scene){
 const root=new THREE.Group();root.name='Operative first-person arms';scene.add(root);
 const sleeve=new THREE.MeshStandardMaterial({color:'#234a6a',roughness:.8}),cuff=new THREE.MeshStandardMaterial({color:'#5b8caa',roughness:.6}),glove=new THREE.MeshStandardMaterial({color:'#172e40',roughness:.65}),knuckle=new THREE.MeshStandardMaterial({color:'#406d84',roughness:.6});
 function segment(radiusTop,radiusBottom,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,1,8),material);root.add(mesh);return mesh}
 function hand(){const group=new THREE.Group(),palm=new THREE.Mesh(new THREE.BoxGeometry(.09,.105,.055),glove);palm.geometry.translate(0,0,0);group.add(palm);const pad=new THREE.Mesh(new THREE.BoxGeometry(.075,.05,.014),knuckle);pad.position.set(0,.012,.034);group.add(pad);for(let i=0;i<4;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.012,.041,2,5),glove);finger.position.set(-.033+i*.022,.055,-.012);finger.rotation.x=-.65;group.add(finger)}const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.016,.045,2,5),glove);thumb.rotation.z=.65;thumb.position.set(.047,-.001,-.025);group.add(thumb);root.add(group);return group}
 const arms=[0,1].map(()=>({upper:segment(.071,.08,sleeve),fore:segment(.05,.068,sleeve),cuff:segment(.06,.062,cuff),hand:hand()}));
 const cell=new THREE.Mesh(new THREE.CylinderGeometry(.032,.032,.125,10),new THREE.MeshStandardMaterial({color:'#7ed1e6',emissive:'#28718b',emissiveIntensity:.35,roughness:.35,metalness:.35}));cell.visible=false;root.add(cell);
 const temp=new THREE.Vector3();
 function connect(mesh,a,b){temp.copy(b).sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(Y,temp.clone().normalize());mesh.scale.y=temp.length()}
 function poseArm(arm,shoulder,elbow,wrist,rotation){connect(arm.upper,shoulder,elbow);connect(arm.fore,elbow,wrist);const wristBase=wrist.clone().lerp(elbow,.13);connect(arm.cuff,wristBase,wrist);arm.hand.position.copy(wrist);arm.hand.quaternion.copy(rotation)}
 function update(gunGroup,pose,weapon){gunGroup.updateMatrixWorld(true);const orientation=gunGroup.quaternion;
  const rightLocal=new THREE.Vector3(.035,.075,.11),leftLocal=new THREE.Vector3(...(pose.reload?.hand||(weapon==='pistol'?[-.28,-.55,.08]:[-.075,.09,-.21])));
  const right=rightLocal.applyQuaternion(orientation).add(gunGroup.position),left=leftLocal.applyQuaternion(orientation).add(gunGroup.position);
  poseArm(arms[0],new THREE.Vector3(.48,-.95,.1),new THREE.Vector3(.47,-.66,-.16),right,orientation);
  poseArm(arms[1],new THREE.Vector3(-.42,-.95,.1),new THREE.Vector3(-.38,-.65,-.19),left,orientation);
  for(const m of [arms[1].upper,arms[1].fore,arms[1].cuff,arms[1].hand])m.visible=true;
  cell.visible=!!pose.reload?.cellVisible;cell.position.copy(left).add(new THREE.Vector3(.015,.035,-.02).applyQuaternion(orientation));cell.quaternion.copy(orientation);cell.rotation.z+=.15;
 }
 return {root,update,cell,arms,setColors(color,accent,handColor='#172e40'){sleeve.color.set(color);cuff.color.set(accent);glove.color.set(handColor);knuckle.color.set(handColor).multiplyScalar(.85)}};
}
