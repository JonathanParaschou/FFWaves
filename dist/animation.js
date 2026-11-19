import * as THREE from './vendor/three.module.js';

export function createAnimatedModel(template,rig){
 const root=new THREE.Group();root.name=template.name;root.userData.bounds=template.userData.bounds;root.userData.source=template.userData.source;
 const bones=rig.bones.map(d=>{const b=new THREE.Bone();b.name=d.name;b.position.fromArray(d.position);b.quaternion.fromArray(d.quaternion);b.scale.fromArray(d.scale);return b});
 rig.bones.forEach((d,i)=>{if(d.parent<0)root.add(bones[i]);else bones[d.parent].add(bones[i])});
 const skeleton=new THREE.Skeleton(bones,rig.boneInverses.map(a=>new THREE.Matrix4().fromArray(a)));
 for(const original of template.children){
  if(!original.isMesh)continue;
  const part=rig.parts.find(p=>p.name===original.name),geo=original.geometry.clone();let mesh;
  if(part&&part.skinIndex.length===geo.attributes.position.count*4){geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(part.skinIndex,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(part.skinWeight,4));mesh=new THREE.SkinnedMesh(geo,original.material);mesh.name=original.name;root.add(mesh);root.updateMatrixWorld(true);mesh.bind(skeleton,new THREE.Matrix4());mesh.frustumCulled=false}
  else{mesh=new THREE.Mesh(geo,original.material);mesh.name=original.name;root.add(mesh)}
  mesh.castShadow=mesh.receiveShadow=true;
 }
 const clips=rig.clips.map(c=>new THREE.AnimationClip(c.name,c.duration,c.tracks.map(t=>{const name=`${rig.bones[t.bone].name}.${t.property}`;return t.property==='quaternion'?new THREE.QuaternionKeyframeTrack(name,t.times,t.values):new THREE.VectorKeyframeTrack(name,t.times,t.values)})));
 const mixer=new THREE.AnimationMixer(root),actions=new Map();for(const clip of clips)actions.set(clip.name,mixer.clipAction(clip));
 let current=null,castRemaining=0;
 const find=(state)=>{
  const names=state==='walk'?['walk','walk1','run','stand1']:state==='ready'?['ready','stand1','idle']:state==='cast'?['skill1','skill2','spellcasting','attack1','attack']:state==='ranged'?['range1','range','skill1','skill0','attack1','melee1','ready']:state==='attack'?['melee1','melee1upper','attack1','attack','skill1','spellcasting']:state==='run'?['run1','run','walk1','walk','stand1']:state==='death'?['death1','die1','death','die','stand1']:state==='stun'?['wound','damage1','damage','stand2','stand1']:['stand1','stand2','idle','stand'];
  for(const n of names)if(actions.has(n))return actions.get(n);return actions.values().next().value;
 };
 function play(state='idle',force=false){const next=find(state);if(!next)return;if(next===current&&!force)return;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);next.clampWhenFinished=state==='death';next.setLoop(state==='cast'||state==='death'?THREE.LoopOnce:THREE.LoopRepeat,state==='cast'||state==='death'?1:Infinity);next.play();if(current&&current!==next)next.crossFadeFrom(current,.18,true);current=next;if(state==='cast')castRemaining=Math.max(.4,next.getClip().duration)}
 play('idle');mixer.update(.001);root.updateMatrixWorld(true);
 root.userData.animation={mixer,skeleton,bones,clips,play,update(dt,state='idle'){if(castRemaining>0){castRemaining-=dt;if(castRemaining<=0)play(state)}else play(state);mixer.update(dt)},gesture(names){if(castRemaining>0)return false;const next=names.map(n=>actions.get(n)).find(Boolean);if(!next)return false;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).setLoop(THREE.LoopOnce,1).play();if(current&&current!==next)next.crossFadeFrom(current,.2,true);current=next;castRemaining=next.getClip().duration;return true},cast(){play('cast',true)},dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);skeleton.dispose();root.traverse(o=>{if(o.isMesh)o.geometry.dispose()})}};
 return root;
}
