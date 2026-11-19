import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/vendor/three.module.js';
import {ENEMY_TYPES,Survival} from '../dist/simulation.js';
import {MAPS,setActiveMap,OutpostLayout} from '../dist/layout.js';
import {moveWithActors,bodiesOverlap} from '../dist/actor-collision.js';
import {movementState,updateMovement} from '../dist/movement.js';
import {planEnemyWave,takeEnemySpawn} from '../dist/enemy-director.js';
import {launchEnemyVolley,advanceEnemyProjectile} from '../dist/enemy-attacks.js';
import {EnemyProjectiles} from '../dist/enemy-projectiles.js';
import {createEnemyActor} from '../dist/enemy-actor.js';
import {AssetLibrary} from '../dist/assets.js';
import {CoopRoom} from '../server/coop-room.mjs';
import {loadServerCatalogs} from '../server/catalogs.mjs';
import {LanClient} from '../dist/lan-client.js';
await loadServerCatalogs();
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const open={height(x,z,h){return typeof h==='object'?h.floorY||0:Number.isFinite(h)?h:0},move(p,dx,dz){p.x+=dx;p.z+=dz},raycast(o,d,range){return range},blockedAtHeight(){return false}};
const player=()=>({...movementState(),x:0,z:0,floorY:0,y:0,vy:0,hp:100,sprint:1,buffs:{speed:0,jump:0},reloadTimer:0});
const enemy=(extra={})=>({id:1,type:'spawn',x:0,z:-2,floorY:0,y:0,hp:100,radius:.5,height:1.6,dead:false,...extra});
const seedRandom=initial=>{let seed=initial;return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)};

test('the full hostile-table audit and forty distinct source models, skins and rigs ship together',async()=>{
 const roster=await json('dist/assets/enemy-roster.json'),library=await json('dist/assets/enemy-library.json'),manifest=await json('dist/assets/manifest.json');
 assert.equal(Object.keys(ENEMY_TYPES).length,40);assert.equal(library.entries.reduce((sum,e)=>sum+e.npcIds.length,0),library.hostileRows);
 assert.equal(library.uniqueIdentities,library.entries.length);assert.ok(library.hostileRows>1000&&library.cachedEnemyModelPaths>100);
 const hashes=new Set(),sources=new Set();
 for(const [id,cfg]of Object.entries(ENEMY_TYPES)){
  const record=roster.enemies[id],model=await json('dist/'+manifest.assets[cfg.asset].url),rig=await json('dist/assets/animations/'+cfg.asset+'.json');
  assert.deepEqual(record.stats,cfg);assert.equal(model.source,record.source);assert.ok(library.entries.some(e=>e.npcIds.includes(record.npcId)&&e.name===cfg.name));
  sources.add(model.source);hashes.add(createHash('sha256').update(JSON.stringify(model.parts.map(p=>[p.positions,p.indices]))).digest('hex'));
  assert.ok(rig.validation.originalSkin&&rig.validation.originalClips);assert.ok(rig.clips.some(c=>/run|walk/.test(c.name)));
  assert.equal(manifest.animations[cfg.asset].url,'assets/animations/'+cfg.asset+'.json');
  assert.ok((await readFile('dist/'+record.portrait)).length>0);
  for(const p of model.parts)for(const m of p.materials)if(m.map)assert.ok((await readFile('dist/'+m.map)).length>0);
 }
 assert.equal(sources.size,40);assert.equal(hashes.size,40,'recolors must not inflate the model roster');
});

test('the director retires early mobs, increases average tier, and can introduce all forty identities',()=>{
 const map=MAPS.find(m=>m.id==='dexlabs-bunker'),seen=new Set();let early=0,late=0;
 for(let run=1;run<=16;run++)for(let wave=1;wave<=50;wave++){
  const queue=planEnemyWave(wave,map,seedRandom(run*1000+wave));for(const id of queue)seen.add(id);
  if(wave===1)early+=queue.reduce((n,id)=>n+ENEMY_TYPES[id].tier,0)/queue.length;
  if(wave===40)late+=queue.reduce((n,id)=>n+ENEMY_TYPES[id].tier,0)/queue.length;
  if(wave>=10)assert.ok(queue.every(id=>ENEMY_TYPES[id].tier>1));
  if(wave>=19)assert.ok(queue.every(id=>ENEMY_TYPES[id].tier>2));
  assert.ok(queue.filter(id=>ENEMY_TYPES[id].ranged).length<=Math.ceil(queue.length*.25));
 }
 assert.equal(seen.size,40);assert.ok(late>early+2.5);
 const live=Array.from({length:4},()=>enemy({type:'gas'})),queue=['gas','robo','gas'];assert.equal(takeEnemySpawn(queue,live),'robo');assert.deepEqual(queue,['gas','gas']);assert.equal(takeEnemySpawn(queue,live),null);
});

test('walking, sprinting and sliding cannot tunnel through living enemy bodies at different frame rates',()=>{
 for(const hz of [30,60,144])for(const mode of ['walk','sprint','slide']){
  const p=player(),e=enemy();if(mode==='slide')Object.assign(p,{stance:'slide',slideTimer:.8,slideAge:0,slideZ:-1});
  for(let i=0;i<hz;i++){updateMovement(p,{z:-1,sprint:mode==='sprint'},open,1/hz,{},[e]);assert.ok(!bodiesOverlap(p,e,open,.35),mode+' intersects at '+hz+' Hz')}
  assert.ok(p.z>e.z+.849);assert.ok(p.z<-.6);
 }
 const p=player();moveWithActors(open,p,0,-20,.35,true,[enemy()]);assert.ok(p.z> -1.151,'a large displacement still sweeps the body');
 const falling=player(),small=enemy({z:0,height:1.05});Object.assign(falling,{y:1.08,vy:-3});updateMovement(falling,{},open,1/30,{},[small]);assert.ok(!bodiesOverlap(falling,small,open,.35),'vertical motion cannot leave a stationary player inside a body');
});

test('body contacts allow tangential movement, ignore corpses and keep floor layers independent',()=>{
 const e=enemy(),p=player();for(let i=0;i<120;i++){updateMovement(p,{x:.6,z:-1},open,1/60,{},[e]);assert.ok(!bodiesOverlap(p,e,open,.35))}assert.ok(p.z< -3);
 for(const other of [enemy({dead:true}),enemy({floorY:3.6})]){const p=player();moveWithActors(open,p,0,-4,.35,true,[other]);assert.ok(p.z< -3.99)}
 const stationary=player(),e2=enemy({z:-2});moveWithActors(open,e2,0,5,.5,false,[stationary]);assert.ok(e2.z<-.849,'enemies cannot walk into stationary players');
});

test('enemy contacts retain map collision when a player is pinned beside a wall',()=>{
 const layout={...open,move(p,dx,dz){p.x=Math.min(.3,p.x+dx);p.z+=dz}},p=player();p.x=.2;
 const blockers=[enemy({x:-.8,z:0}),enemy({x:.2,z:-1.2})];
 for(let i=0;i<60;i++){updateMovement(p,{x:-1,z:-1,sprint:true},layout,1/60,{},blockers);assert.ok(p.x<=.300001);for(const e of blockers)assert.ok(!bodiesOverlap(p,e,layout,.35))}
});

test('solo, authoritative co-op and client replay all stop against the same enemy',t=>{
 setActiveMap('sector-v');const solo=new Survival();solo.start();solo.intermission=999;Object.assign(solo.player,{x:-30,z:30});const e=solo.spawn('spawn');Object.assign(e,{x:-30,z:27,floorY:0,stun:999});for(let i=0;i<90;i++)solo.update(1/60,{z:-1,sprint:true});assert.ok(solo.player.z>27.849);
 const room=new CoopRoom(),host=room.add({token:'solid-enemy-host-0001',create:true,map:'sector-v'});room.start(host.id);room.sim.intermission=999;Object.assign(host.player,{x:-30,z:30});const other=room.sim.spawn('spawn');Object.assign(other,{x:-30,z:27,floorY:0,stun:999});const snapshot=JSON.parse(JSON.stringify(room.snapshot()));
 room.input(host.id,1,{z:-1,sprint:true});for(let i=0;i<90;i++)room.tick(1/60);assert.ok(host.player.z>27.849);
 const client=new LanClient();t.after(()=>clearInterval(client.pingTimer));client.id=host.id;client.history=Array.from({length:25},(_,i)=>({seq:i+1,dt:.05,input:{z:-1,sprint:true}}));const sim=new Survival();sim.start();
 client.apply(snapshot,sim,{addEnemy(){},addProjectile(){},addDrop(){},weapon(){},nano(){},setPeers(){}});assert.ok(sim.player.z>27.849);
});

test('ranged volleys use finite source positions, visible profiles and bounded spread damage',()=>{
 setActiveMap('sector-v');const sim={layout:open,projectiles:[],events:{},nextId:1},target={...player(),x:8,z:0,eyeHeight:1.68};
 for(const [id,cfg]of Object.entries(ENEMY_TYPES).filter(([,c])=>c.ranged)){
  sim.projectiles=[];launchEnemyVolley(sim,enemy({type:id,height:cfg.height,damage:cfg.damage}),target);
  assert.equal(sim.projectiles.length,cfg.projectile.count);for(const p of sim.projectiles){assert.ok(['x','y','z','dx','dy','dz'].every(k=>Number.isFinite(p[k])));assert.ok(p.size>=.38);assert.ok(p.damage<=cfg.damage);assert.ok(p.sourceId)}
 }
 sim.projectiles=[];launchEnemyVolley(sim,enemy({type:'gas',damage:13}),enemy({hp:100,eyeHeight:1.68}));assert.ok(sim.projectiles.every(p=>Object.values(p).filter(v=>typeof v==='number').every(Number.isFinite)));
});

test('hostile projectile sweeps hit players without tunneling and stop at nearer walls',()=>{
 setActiveMap('sector-v');const p={...player(),x:2,z:0};
 const shot={id:1,x:0,y:1,z:0,dx:60,dy:0,dz:0,life:0,radius:.11};assert.equal(advanceEnemyProjectile(shot,.05,open,[p]),p);assert.ok(shot.dead&&shot.x<2);
 const blocked={...shot,dead:false,x:0,life:0},wall={...open,raycast(o,d,r){return Math.min(r,.5)}};assert.equal(advanceEnemyProjectile(blocked,.05,wall,[p]),null);assert.ok(blocked.dead&&blocked.x<.51);
 const legacy={...open,raycast:undefined,blockedAtHeight(x){return x>.6&&x<.65}},thinWall={...shot,dead:false,x:0,life:0};assert.equal(advanceEnemyProjectile(thinWall,.05,legacy,[p]),null);assert.ok(thinWall.dead&&thinWall.x<.65,'legacy geometry also sweeps a thin wall');
 const above={...shot,dead:false,x:0,y:5.28,dx:0,dy:-30,z:-11},map=MAPS.find(m=>m.id==='dexlabs-bunker');setActiveMap(map.id);above.x=12;const lower={...player(),x:12,z:-11};assert.equal(advanceEnemyProjectile(above,.1,new OutpostLayout(map),[lower]),null);assert.ok(above.dead&&above.y>3.5);setActiveMap('sector-v');
});

test('co-op broadcasts projectile launch and impact even when snapshots contain no projectile',()=>{
 setActiveMap('sector-v');const room=new CoopRoom(),host=room.add({token:'visible-shot-host-001',create:true,map:'sector-v'});room.start(host.id);room.sim.intermission=999;Object.assign(host.player,{x:-30,z:30,invuln:0});
 const packets=[];room.broadcast=p=>packets.push(JSON.parse(JSON.stringify(p)));const e=room.sim.spawn('gas');Object.assign(e,{x:-30,z:24,floorY:0,state:'windup',timer:1,stun:0,attackCooldown:0});
 for(let i=0;i<70;i++)room.tick(1/60);
 const launch=packets.find(p=>p.event==='projectile'),impact=packets.find(p=>p.event==='projectileImpact');assert.ok(launch&&impact);assert.equal(launch.args[0].id,impact.args[0].id);assert.equal(room.snapshot().projectiles.length,0);assert.ok(host.player.hp<100);
});

test('hostile visuals have an opaque unlit core, a tail and short-shot feedback without duplicate resurrection',()=>{
 const scene=new THREE.Scene(),effects=[],visuals=new EnemyProjectiles(scene,{textures:new Map()},{impact(...args){effects.push(args)}}),p={id:1,kind:'electric',x:0,y:1,z:0,spawnX:0,spawnY:1,spawnZ:0,dx:10,dy:0,dz:0,life:0,size:.4};
 visuals.add(p);visuals.update(.05,true);let entry=visuals.entries.get(1);assert.ok(entry.core.material.isMeshBasicMaterial);assert.equal(entry.core.material.transparent,false);assert.equal(entry.core.material.depthTest,true);assert.ok(entry.tail.visible);assert.ok(entry.object.position.x>0);
 visuals.impact({...p,x:.3,dead:true});visuals.update(.02,true);entry=visuals.entries.get(1);assert.ok(entry.tail.visible&&entry.halo.material.opacity>0);assert.ok(effects.length>=2);visuals.add({...p,life:.03});assert.equal(visuals.entries.size,1);visuals.update(.2,true);assert.equal(visuals.entries.size,0);visuals.add(p);assert.equal(visuals.entries.size,0);visuals.clear();assert.equal(scene.children.length,0);
});

test('all rendered enemy idle bodies are grounded, centred and scaled to their actual collision height',async()=>{
 const assets=new AssetLibrary();assets.manifest=await json('dist/assets/manifest.json');
 for(const cfg of Object.values(ENEMY_TYPES)){
  const data=await json('dist/'+assets.manifest.assets[cfg.asset].url);for(const p of data.parts)for(const m of p.materials)if(m.map)assets.textures.set(m.map,new THREE.Texture());assets.registerModel(cfg.asset,data);assets.rigs.set(cfg.asset,await json('dist/assets/animations/'+cfg.asset+'.json'));
  const object=createEnemyActor(assets,{height:Math.min(cfg.height,1.8)},cfg);object.userData.animation.update(.05,'idle');object.updateMatrixWorld(true);object.userData.animation.skeleton.update();const box=new THREE.Box3().setFromObject(object,true),center=box.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(box.min.y)<.002,cfg.name+' floats off the ground');assert.ok(Math.abs(box.getSize(new THREE.Vector3()).y-Math.min(cfg.height,1.8))<.002,cfg.name+' differs from body height');assert.ok(Math.hypot(center.x,center.z)<.002);object.userData.animation.dispose();
 }
});
