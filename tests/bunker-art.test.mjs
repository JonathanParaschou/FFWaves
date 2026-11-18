import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {REFERENCE_MAP as map} from '../dist/reference-map.js';
import {ReferenceLayout} from '../dist/reference-layout.js';
import {referenceFixtures} from '../dist/reference-fixtures.js';
import {containsBrush,floorHeights} from '../dist/reference-geometry.js';
import {heightAt} from '../dist/layout.js';
import {movementState,updateMovement} from '../dist/movement.js';
import {instanceStaticProps} from '../dist/bunker-equipment.js';
import {loadReviewAssets,installLabelCanvas} from './helpers/scene-assets.mjs';
import {buildReferenceEnvironment} from '../dist/reference-environment.js';

test('the curated lab kit records original models, source dimensions and complete cached-library audit scope',async()=>{
 const kit=JSON.parse(await readFile('dist/assets/bunker-kit.json','utf8'));
 assert.equal(kit.inventory.bundlesIndexed,kit.inventory.bundlesPresent);
 assert.equal(kit.inventory.failures.length,0);
 assert.ok(kit.inventory.uniqueMapModels>1000);
 assert.equal(Object.keys(kit.assets).length,18);
 for(const [id,entry]of Object.entries(kit.assets)){
  assert.match(entry.source,/^map\/.+\.nif$/);
  const model=JSON.parse(await readFile('dist/assets/models/'+id+'.json','utf8'));
  assert.deepEqual(model.bounds,entry.bounds);
  for(const part of model.parts)for(const material of part.materials)if(material.map)assert.ok((await readFile('dist/'+material.map)).length>0);
 }
 for(const entry of Object.values(kit.rejectedCandidates))assert.ok(entry.reason.length>20);
});

test('authored workcells have source anchors, real support and no sampled intersections with the reference shell',()=>{
 const data=map.reference.data;
 assert.deepEqual(new Set(map.dressing.bays.map(b=>b.room)),new Set(['intake','containment','control']));
 for(const p of map.dressing.placements){
  assert.deepEqual(p.sourceAnchor,data.entities.find(e=>e.id===p.sourceEntityId).origin);
  if(p.physical)assert.ok(floorHeights(data,p.x,p.z).some(h=>Math.abs(h-(p.room==='control'?3.6:0))<.1),p.id+' must have a room floor');
 }
 for(const box of map.dressing.colliders)for(let ix=0;ix<3;ix++)for(let iy=0;iy<3;iy++)for(let iz=0;iz<3;iz++){
  const sample=[ix,iy,iz].map((n,a)=>box.min[a]+.015+(box.max[a]-box.min[a]-.03)*n/2);
  assert.ok(!data.brushes.some(b=>b.solid&&!b.movable&&containsBrush(b,...sample,0,0,.01)),box.id+' clips the source shell');
 }
});

test('visible physical equipment agrees with authoritative collision, surfaces and bullet rays',async()=>{
 installLabelCanvas();const root=new THREE.Scene(),env=buildReferenceEnvironment(root,await loadReviewAssets(),null,map),layout=new ReferenceLayout(map);
 try{
  assert.equal(env.dressing.diagnostics.rejected,0);
  for(const p of map.dressing.placements.filter(p=>p.physical)){
   const object=env.props.find(o=>o.userData.dressing.id===p.id);assert.ok(object,p.id);
   const visual=new THREE.Box3().setFromObject(object),pieces=layout.fixtures.filter(b=>b.id.startsWith(p.id+'-'));
   assert.ok(pieces.length>0,p.id+' has no shared collider');
   const physical=new THREE.Box3();for(const b of pieces)physical.union(new THREE.Box3(new THREE.Vector3(...b.min),new THREE.Vector3(...b.max)));
   assert.ok(visual.min.distanceTo(physical.min)<.002&&visual.max.distanceTo(physical.max)<.002,p.id+' render/collision disagreement');
   assert.ok(referenceFixtures(map).surfaces.some(s=>s.assemblyId===p.assemblyId&&Math.abs(s.max[1]-visual.max.y)<.002),p.id+' has no matching actor surface');
  }
  // Shoot through a tabletop from above: gameplay rays must hit the visible top.
  const desk=map.dressing.placements.find(p=>p.id==='intake-maintenance-desk');
  assert.ok(Math.abs(layout.raycast({x:desk.x,y:2,z:desk.z},{x:0,y:-1,z:0},3)-1.22)<.002);
  assert.ok(env.dressing.diagnostics.propBatches<env.dressing.diagnostics.propInstances);
 }finally{env.dispose()}
});

test('equipment stops walking, permits a timed jump and preserves airborne height when leaving a desk',()=>{
 const layout=new ReferenceLayout(map),player=()=>({...movementState(),x:-4,z:7.4,floorY:0,y:0,vy:0,sprint:1,buffs:{jump:0,speed:0},reloadTimer:0});
 const walker=player();for(let i=0;i<60;i++)updateMovement(walker,{x:-1},layout,1/60);
 assert.ok(walker.x> -4.3,'the chair cannot be walked through');
 const jumper=player();for(let i=0;i<60;i++)updateMovement(jumper,{x:-1,jump:i===0},layout,1/60);
 assert.equal(jumper.floorY,.78);assert.equal(jumper.y,0);
 assert.equal(layout.height(jumper.x,jumper.z,jumper),heightAt(map,jumper.x,jumper.z,jumper));
 for(let i=0;i<100;i++)updateMovement(jumper,{x:1},layout,1/60);
 assert.equal(jumper.floorY,0);assert.equal(jumper.y,0);assert.ok(jumper.x> -4);
 const airborne={x:-4.7,z:6.9,floorY:0,y:1,stance:'stand'};
 layout.move(airborne,-.2,0,.35,true);
 assert.equal(airborne.floorY,.78);assert.ok(Math.abs(airborne.floorY+airborne.y-1)<1e-6);
 layout.move(airborne,.4,0,.35,true);
 assert.equal(airborne.floorY,0);assert.ok(Math.abs(airborne.floorY+airborne.y-1)<1e-6);
});

test('prop instancing preserves transforms under a transformed scene and leaves shared model resources reusable',()=>{
 const scene=new THREE.Group();scene.position.set(12,4,-7);scene.rotation.y=.6;
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),props=[];
 for(let i=0;i<2;i++){const root=new THREE.Group();root.position.set(i*2,1,3);root.rotation.y=i*.2;root.userData.dressing={asset:'test',id:'p'+i};root.add(new THREE.Mesh(geometry,material));scene.add(root);props.push(root)}
 scene.updateMatrixWorld(true);const expected=props.map(p=>p.children[0].matrixWorld.clone()),instances=instanceStaticProps(scene,props);
 assert.equal(instances.batches.length,1);assert.equal(instances.instances,2);
 scene.updateMatrixWorld(true);const matrix=new THREE.Matrix4();
 for(let i=0;i<2;i++){instances.batches[0].getMatrixAt(i,matrix);matrix.premultiply(instances.batches[0].matrixWorld);assert.ok(matrix.elements.every((v,a)=>Math.abs(v-expected[i].elements[a])<1e-6));assert.equal(props[i].visible,false)}
 let disposed=false;geometry.addEventListener('dispose',()=>disposed=true);instances.dispose();assert.equal(disposed,false);geometry.dispose();material.dispose();
});
