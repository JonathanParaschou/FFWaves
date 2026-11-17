import * as THREE from './vendor/three.module.js';
// Extract original textured triangles by their skin weights, never a spatial crop.
// Bake a ready pose, then place its arm segments on the FPS grip rig.
export function extractHeroArms(assets,hero){
 const body=assets.model(hero.asset,{height:1.8}),controller=body.userData.animation;
 controller.update(.3,'ready');body.updateMatrixWorld(true);controller.skeleton.update();
 const bones=controller.bones,keys=['rightUpperArm','rightForearm','rightHand','leftUpperArm','leftForearm','leftHand'],roots=keys.map(k=>bones.find(b=>b.name===hero.sockets[k]));
 const bucket=bones.map(b=>{for(let p=b;p;p=p.parent){const i=roots.indexOf(p);if(i>=0)return i}return -1}),chunks=keys.map(()=>[]),v=new THREE.Vector3();
 body.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const g=mesh.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,uv=g.attributes.uv,index=g.index;const groups=g.groups.length?g.groups:[{start:0,count:index?.count||g.attributes.position.count,materialIndex:0}];
  for(const group of groups){const data=keys.map(()=>({p:[],uv:[]}));for(let i=group.start;i<group.start+group.count;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),scores=Array(6).fill(0);for(const id of ids)for(let w=0;w<4;w++){const b=bucket[si.array[id*4+w]];if(b>=0)scores[b]+=sw.array[id*4+w]}const best=scores.indexOf(Math.max(...scores));if(scores.reduce((a,b)=>a+b,0)<1.65)continue;for(const id of ids){mesh.getVertexPosition(id,v);v.applyMatrix4(mesh.matrixWorld);data[best].p.push(...v.toArray());data[best].uv.push(uv?.getX(id)||0,uv?.getY(id)||0)}}
   data.forEach((d,i)=>{if(d.p.length)chunks[i].push({...d,material:Array.isArray(mesh.material)?mesh.material[group.materialIndex]:mesh.material})});
  }
 });
 const result=[0,1].map(side=>{const offset=side*3,parts={};for(let segment=0;segment<3;segment++){const i=offset+segment,start=roots[i].getWorldPosition(new THREE.Vector3()),end=segment<2?roots[i+1].getWorldPosition(new THREE.Vector3()):null;if(!chunks[i].length){const empty=new THREE.Group();empty.userData.sourceAsset=hero.asset;parts[['upper','fore','hand'][segment]]=empty;continue}const all=chunks[i].flatMap(c=>c.p),box=new THREE.Box3();for(let k=0;k<all.length;k+=3)box.expandByPoint(new THREE.Vector3().fromArray(all,k));const center=segment===2?box.getCenter(new THREE.Vector3()):start.clone().add(end).multiplyScalar(.5),direction=segment===2?center.clone().sub(start):end.clone().sub(start),inverse=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()).invert(),length=segment===2?Math.max(.01,box.getSize(new THREE.Vector3()).length()):start.distanceTo(end),scale=segment===2?.18/length:(segment===0?.32:.30)/length,group=new THREE.Group();group.name=`${hero.asset}/${keys[i]}`;group.userData.sourceAsset=hero.asset;
    for(const c of chunks[i]){const positions=[];for(let k=0;k<c.p.length;k+=3){v.fromArray(c.p,k).sub(center).applyQuaternion(inverse);if(segment<2){v.x*=scale;v.z*=scale;v.y/=length}else v.multiplyScalar(scale);positions.push(...v.toArray())}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(c.uv,2));geo.computeVertexNormals();group.add(new THREE.Mesh(geo,c.material))}
    if(segment<2){
     // Boundary triangles can carry sleeve weights from the adjacent joint.
     // Fit the retained source segment as a whole to the FPS joint interval.
     group.traverse(o=>{if(o.isMesh){const a=o.geometry.attributes.position,r=segment===0?.10:.085;for(let k=0;k<a.count;k++)a.setXYZ(k,THREE.MathUtils.clamp(a.getX(k),-r,r),THREE.MathUtils.clamp(a.getY(k),-.52,.52),THREE.MathUtils.clamp(a.getZ(k),-r,r));a.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere()}});
    }
    parts[['upper','fore','hand'][segment]]=group;
   }return parts});
 controller.dispose();return result;
}
