import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {createAnimatedModel} from '../dist/animation.js';
let rigs=0,skinnedParts=0,originalClips=0;
for(const file of await readdir('dist/assets/animations')){
 if(!file.endsWith('.json'))continue;
 const rig=JSON.parse(await readFile(`dist/assets/animations/${file}`,'utf8'));
 const data=JSON.parse(await readFile(`dist/assets/models/${rig.id}.json`,'utf8'));
 const template=new THREE.Group();template.name=rig.id;template.userData.bounds=data.bounds;
 for(const part of data.parts){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));g.setIndex(part.indices);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial());m.name=part.name;template.add(m)}
 const object=createAnimatedModel(template,rig),controller=object.userData.animation;
 assert.ok(rig.validation.originalClips&&rig.validation.originalSkin,rig.id+' uses original animation data');
 assert.equal(rig.bones.length,rig.boneInverses.length);
 assert.ok(controller.clips.length>=(rig.id.startsWith('accessory-')?1:2),rig.id+' retains its original animation clips');
 const meshes=[];object.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
 assert.ok(meshes.length>0,rig.id+' creates actual SkinnedMesh parts');
 const limit=Math.max(...data.bounds.size)*5+1;
 for(const m of meshes){const w=m.geometry.attributes.skinWeight,idx=m.geometry.attributes.skinIndex;skinnedParts++;assert.equal(w.count,m.geometry.attributes.position.count);for(let v=0;v<w.count;v++){const total=w.getX(v)+w.getY(v)+w.getZ(v)+w.getW(v);assert.ok(Math.abs(total-1)<.0001,rig.id+' skin normalized');for(let k=0;k<4;k++)assert.ok(idx.array[v*4+k]<rig.bones.length)}}
 function sampled(){object.updateMatrixWorld(true);controller.skeleton.update();const values=[];for(const m of meshes){const count=m.geometry.attributes.position.count,step=Math.max(1,Math.floor(count/25));for(let v=0;v<count;v+=step){const point=new THREE.Vector3();m.getVertexPosition(v,point);assert.ok(point.toArray().every(Number.isFinite),rig.id+' vertex finite');assert.ok(point.length()<limit,rig.id+' animation bounded');values.push(...point.toArray())}}return values}
 const before=sampled();for(let i=0;i<20;i++)controller.update(.025,'idle');const after=sampled();assert.ok(before.some((v,i)=>Math.abs(v-after[i])>.000001),rig.id+' original idle articulates vertices');
 controller.cast();for(let i=0;i<20;i++)controller.update(.025,'idle');sampled();
 // Moving/scaling the model root must not inject world transforms twice into skinning.
 object.position.set(15,2,-20);object.scale.setScalar(2);sampled();
 controller.dispose();rigs++;originalClips+=rig.clips.length;
}
const manifest=JSON.parse(await readFile('dist/assets/manifest.json','utf8'));assert.equal(rigs,Object.keys(manifest.animations).length);
console.log(`Validated ${rigs} original rigs, ${skinnedParts} skinned mesh parts and ${originalClips} clips through Three.js bone deformation.`);
