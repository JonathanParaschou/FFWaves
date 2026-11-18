import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {CombatEffects,clipMuzzle} from '../dist/combat-effects.js';
import {recordingGain,installAudioUnlock,nanoVoicePrefix} from '../dist/audio-levels.js';
import {PLAYER_SCALE as P,verticalFov} from '../dist/player-scale.js';
import {movementState,updateMovement} from '../dist/movement.js';
import {loadSettings,saveSettings} from '../dist/settings.js';
import {configureNanos,resolveSquad} from '../dist/nanos.js';
import {REFERENCE_MAP as map} from '../dist/reference-map.js';
import {containsBrush} from '../dist/reference-geometry.js';
import {ReferenceLayout} from '../dist/reference-layout.js';
import {buildWeaponStation} from '../dist/weapon-stations.js';
import {loadReviewAssets,installLabelCanvas} from './helpers/scene-assets.mjs';
import {FlowField} from '../dist/layout.js';

test('near-wall shots survive slow render frames and leave visible depth-tested textured trails',()=>{
 for(const dt of [1/144,1/60,1/30,.05])for(const weapon of ['pistol','rifle','shotgun','cannon','bracer']){
  const scene=new THREE.Scene(),fx=new CombatEffects(scene,{textures:new Map()});
  fx.shot({weapon,origin:{x:0,y:1.68,z:-1},ends:[{x:0,y:1.68,z:-2,impact:true}]});
  fx.update(dt);const bullet=fx.effects.find(e=>e.projectile);
  assert.ok(bullet,`${weapon} at ${dt}: not removed before its first render`);
  assert.ok(bullet.trail.visible&&bullet.trail.scale.y>0);
  assert.ok(bullet.object.position.z<-1&&bullet.object.position.z>-2);
  assert.equal(bullet.trail.material.depthTest,true,'walls still occlude effects');
  assert.equal(bullet.object.material.toneMapped,false);
  fx.update(.05);fx.clear();assert.equal(scene.children.length,0);
 }
});

test('recording balance raises quiet music, caps peaks, and leaves silence finite',()=>{
 const buffer=samples=>({numberOfChannels:1,getChannelData:()=>Float32Array.from(samples)});
 assert.ok(recordingGain(buffer([.04,-.04]))>2.7);
 const samples=[.4,-.02,.02,-.02],gain=recordingGain(buffer(samples));
 assert.ok(gain*.4<=.880001);assert.equal(recordingGain(buffer([0,0])),1);
 assert.ok(recordingGain(buffer([.9,-.9]))<1,'loud recordings are attenuated');
});

test('a camera-layer gun cannot start its world projectile behind a nearby wall',()=>{
 const eye=new THREE.Vector3(0,1.68,0),point=new THREE.Vector3(.3,1.3,-1.4);
 const clipped=clipMuzzle(point,eye,{raycast:()=>.7});
 assert.ok(Math.abs(clipped.distanceTo(eye)-.66)<.00001);
 assert.ok(clipped.z<0);assert.ok(clipMuzzle(point,eye,{raycast:()=>2}).equals(point));
});

test('a later gesture resumes interrupted audio, while explicit mute stays muted',async()=>{
 const target=new EventTarget();let calls=0;const audio={ctx:null,start(){calls++;this.ctx={state:'running'}}};
 const remove=installAudioUnlock(audio,target);
 target.dispatchEvent(new Event('pointerdown'));await Promise.resolve();assert.equal(calls,1);
 audio.ctx.state='suspended';target.dispatchEvent(new Event('keydown'));await Promise.resolve();assert.equal(calls,2);
 audio.userMuted=true;audio.ctx.state='suspended';target.dispatchEvent(new Event('pointerdown'));assert.equal(calls,2);
 remove();audio.userMuted=false;target.dispatchEvent(new Event('keydown'));assert.equal(calls,2);
});

test('selected Nano voices use the original numeric catalog identity, not the gameplay slug',async()=>{
 const {nanos}=JSON.parse(await readFile('dist/assets/nanos-catalog.json'));
 const {audio}=JSON.parse(await readFile('dist/assets/manifest.json'));
 configureNanos(nanos);let supported=0;
 for(const n of nanos){const resolved=resolveSquad([{id:n.slug,skillId:n.skills[0].id}])[0];for(const kind of ['summon','power']){const prefix=nanoVoicePrefix(resolved,kind);assert.equal(prefix,`${kind}-${n.id}-`);if(Object.keys(audio).some(k=>k.startsWith(prefix)))supported++}}
 assert.ok(supported>=70,'recorded lines are reachable for the supported catalog');
});

function player(){return {...movementState(),x:0,z:0,y:0,vy:0,sprint:1,buffs:{},reloadTimer:0}}
const openFloor={move(p,dx,dz){p.x+=dx;p.z+=dz}};
test('player-scale traversal is consistent at 30/60/144Hz and jump height stays human-sized',()=>{
 for(const hz of [30,60,144])for(const sprint of [false,true]){
  const p=player();let maxJump=0;
  for(let i=0;i<hz*2;i++){updateMovement(p,{x:0,z:-1,sprint,jump:i===0},openFloor,1/hz);maxJump=Math.max(maxJump,p.y)}
  assert.ok(Math.abs(-p.z-(sprint?12:8))<.4,`${hz}Hz: distance ${-p.z}`);
  assert.ok(maxJump>.55&&maxJump<.7,`jump apex ${maxJump}`);
 }
 assert.equal(P.height,1.8);assert.equal(P.eye,1.68);
 const fov=verticalFov(95);assert.ok(fov>63&&fov<64);
});

test('FOV migration updates the old default once and preserves mute and chosen new FOV',()=>{
 const previous=globalThis.localStorage;let stored=JSON.stringify({fieldOfView:75,musicVolume:0});
 globalThis.localStorage={getItem:()=>stored,setItem:(key,value)=>stored=value};
 try{const settings=loadSettings();assert.equal(settings.fieldOfView,95);assert.equal(settings.musicVolume,0);saveSettings({...settings,fieldOfView:103});assert.equal(loadSettings().fieldOfView,103)}finally{globalThis.localStorage=previous}
});

test('the calibrated player physically climbs and descends each independent stair route',()=>{
 for(const closed of [110,111]){
  const layout=new ReferenceLayout(map);for(const g of map.gates)if(g.sourceEntityId!==closed)layout.unlock(g.unlock);
  const p={...player(),...map.start},upper={x:12,z:-11,floorY:3.6};
  for(const target of [upper,map.start]){
   const flow=new FlowField(layout);flow.update(target);let crossed=false;
   for(let i=0;i<7000&&Math.hypot(p.x-target.x,p.z-target.z,p.floorY-target.floorY)>.65;i++){
    const direction=flow.direction(p,target),old=p.floorY;
    updateMovement(p,{x:direction.x,z:direction.z,sprint:false},layout,1/60);
    assert.ok(Math.abs(p.floorY-old)<.37,'no floor teleport');if(p.floorY>.5&&p.floorY<3.2)crossed=true;
   }
   assert.ok(crossed);assert.ok(Math.hypot(p.x-target.x,p.z-target.z,p.floorY-target.floorY)<.8);
  }
 }
});

test('supply box clears original source solids, shares its rotated collision footprint, and has an idle beacon',async()=>{
 const station=map.stations.find(s=>s.kind==='mystery'),layout=new ReferenceLayout(map),b=layout.fixtures.find(b=>b.id==='fixture-'+station.id);
 for(let i=0;i<=8;i++)for(let j=0;j<=8;j++)for(let k=0;k<=4;k++){
  const p=[b.min[0]+(b.max[0]-b.min[0])*i/8,.03+k*.2,b.min[2]+(b.max[2]-b.min[2])*j/8];
  assert.ok(!map.reference.data.brushes.some(b=>b.solid&&containsBrush(b,...p)),`box is not embedded: ${p}`);
 }
 installLabelCanvas();const assets=await loadReviewAssets(),scene=new THREE.Scene(),fixture=buildWeaponStation(scene,assets,station,()=>0);
 fixture.update({phase:'idle'},1,0,.05);assert.ok(fixture.root.userData.beacon.visible);assert.ok(fixture.root.userData.question.visible);
 assert.ok(!fixture.hitObjects.includes(fixture.root.userData.beacon),'hologram cannot intercept bullets');
 for(let i=0;i<60;i++)fixture.update({phase:'idle'},2,0,1/60);
 assert.equal(fixture.root.position.y,0);scene.updateMatrixWorld(true);
 const bounds=new THREE.Box3();for(const mesh of fixture.hitObjects)bounds.union(new THREE.Box3().setFromObject(mesh));
 assert.ok(bounds.min.x>=b.min[0]-.01&&bounds.max.x<=b.max[0]+.01);
 assert.ok(bounds.min.z>=b.min[2]-.01&&bounds.max.z<=b.max[2]+.01);
 fixture.update({phase:'rolling',stationId:station.id},3,1,.1);assert.equal(fixture.root.userData.question.visible,false);
 fixture.update({phase:'ready',stationId:station.id,offer:{id:'rifle',rarity:2}},4,1,.1);
 assert.ok(fixture.root.children.some(o=>o.visible&&o.position.y>1.4&&o.name!=='Nano supply box'&&o.type==='Group'));
 fixture.dispose();assert.equal(scene.children.length,0);
});
