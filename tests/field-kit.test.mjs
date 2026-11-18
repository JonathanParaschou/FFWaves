import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {Survival} from '../dist/simulation.js';
import {configureWeapons,MELEE_WEAPONS,WEAPONS,rollWeapon} from '../dist/weapons.js';
import {validateFieldKit,STARTER_GUNS} from '../dist/field-kit.js';
import {sanitizeProfile} from '../server/coop-room.mjs';
import {CombatEffects,combatProfile} from '../dist/combat-effects.js';
const catalog=JSON.parse(await readFile('dist/assets/heroes-catalog.json','utf8'));configureWeapons(catalog.weapons);
function run(kit){const sim=new Survival();sim.setFieldKit(kit);sim.start();sim.intermission=999;return sim}
function ticks(sim,n){for(let i=0;i<n;i++)sim.update(1/60,{x:0,z:0})}

test('field kit validates gear, deploys each starter and preserves the two-gun progression pool',()=>{
 assert.deepEqual(validateFieldKit({gun:'cannon',melee:'invalid'}),{gun:'pistol',melee:'sword'});assert.equal(sanitizeProfile({kit:{gun:'cannon'}}).kit.gun,'pistol');
 for(const gun of STARTER_GUNS){const sim=run({gun,melee:'hammer'});assert.equal(sim.equipped.id,gun);assert.equal(sim.player.meleeId,'hammer');assert.equal(sim.player.weapons.length,1);assert.equal(sim.setFieldKit({gun:'rifle'}),false);sim.phase='menu';sim.start();assert.equal(sim.player.weapons[0].id,gun)}
 assert.equal(Object.keys(WEAPONS).length,40);for(let i=0;i<100;i++)assert.ok(!['sword','bat','hammer'].includes(rollWeapon(10,[],()=>i/100).id));
});

test('three melee weapons have timed strikes, different recovery, directional hits and firing lockout',()=>{
 const damages=new Set(),speeds=new Set();for(const id of ['sword','hammer','bat']){const sim=run({gun:'pistol',melee:id}),cfg=MELEE_WEAPONS[id],front=sim.spawn('spawn'),back=sim.spawn('spawn');Object.assign(front,{x:-25,z:28,hp:1000,stun:999});Object.assign(back,{x:-25,z:32,hp:1000,stun:999});assert.ok(sim.melee(0));assert.equal(front.hp,1000,'strike waits for windup');assert.equal(sim.fire(),null,'cannot shoot through swing');assert.equal(sim.melee(0),false,'no duplicate strike');ticks(sim,Math.ceil(cfg.windup*60)+1);assert.equal(front.hp,1000-cfg.damage);assert.equal(back.hp,1000);assert.ok(front.stun>0);ticks(sim,Math.ceil(cfg.cooldown*60));assert.ok(sim.melee(0));damages.add(cfg.damage);speeds.add(cfg.cooldown)}assert.equal(damages.size,3);assert.equal(speeds.size,3);
});

test('melee respects cover and pausing; reload is cancelled when a strike starts',()=>{
 const sim=run({gun:'pistol',melee:'sword'}),enemy=sim.spawn('spawn');Object.assign(enemy,{x:-25,z:28,hp:1000,stun:999});sim.layout.obstacles.push({minX:-26,maxX:-24,minZ:28.5,maxZ:29,base:0,height:4});sim.equipped.ammo=5;assert.ok(sim.reload());assert.ok(sim.melee(0));assert.equal(sim.player.reloadTimer,0);sim.phase='paused';ticks(sim,60);assert.equal(enemy.hp,1000);assert.equal(sim.player.meleeWindup,MELEE_WEAPONS.sword.windup);sim.phase='playing';ticks(sim,20);assert.equal(enemy.hp,1000,'solid cover blocks the strike');
});

test('all gun effects use existing original RGBA textures, animate, and release their resources',async()=>{
 const fxCatalog=JSON.parse(await readFile('dist/assets/combat-fx-catalog.json','utf8')),textures=new Map();for(const record of Object.values(fxCatalog.textures)){const bytes=await readFile('dist/'+record.url);assert.equal(bytes.toString('ascii',1,4),'PNG');assert.ok((await stat('dist/'+record.url)).size>100);textures.set(record.url,new THREE.Texture())}
 const scene=new THREE.Scene(),fx=new CombatEffects(scene,{combatFxCatalog:fxCatalog,textures}),profiles=new Set();for(const id of Object.keys(WEAPONS)){const p=combatProfile(id);for(const key of ['muzzle','bullet','impact'])assert.ok(fxCatalog.textures[p[key]],id+' '+key);profiles.add(JSON.stringify(p));fx.shot({weapon:id,origin:{x:0,y:1,z:0},ends:[{x:0,y:1,z:-5,impact:true}]})}assert.ok(profiles.size>=17);assert.ok(scene.children.every(o=>o.material.map));for(let i=0;i<100;i++)fx.update(.016);assert.equal(scene.children.length,0);fx.clear();
});
