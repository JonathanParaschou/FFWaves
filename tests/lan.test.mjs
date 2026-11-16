import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createLanServer} from '../server.mjs';
import {sanitizeInput} from '../server/coop-room.mjs';
import {MAPS,groundHeight} from '../dist/layout.js';
import {WEAPONS} from '../dist/weapons.js';
import {roundTuning} from '../dist/rounds.js';
import {fireAuthoritative,worldRay} from '../server/combat.mjs';
import {LanClient} from '../dist/lan-client.js';
import {Survival} from '../dist/simulation.js';

let ping=0;
async function fixture(t,options={}){
 const app=await createLanServer({port:0,host:'127.0.0.1',autoTick:false,...options});
 const port=await app.listen(),clients=[];
 t.after(async()=>{for(const c of clients)c.ws.terminate();await app.close()});
 async function client(token){
  const ws=new WebSocket(`ws://127.0.0.1:${port}/lan`),packets=[],waiters=[];
  ws.on('message',bytes=>{const p=JSON.parse(bytes);const i=waiters.findIndex(w=>w.predicate(p));if(i>=0){const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(p)}else packets.push(p)});
  const next=predicate=>{const i=packets.findIndex(predicate);if(i>=0)return Promise.resolve(packets.splice(i,1)[0]);return new Promise((resolve,reject)=>{const item={predicate,resolve,timer:setTimeout(()=>{waiters.splice(waiters.indexOf(item),1);reject(Error('Timed out waiting for a LAN packet'))},3000)};waiters.push(item)})};
  const c={ws,next,send:packet=>ws.send(JSON.stringify(packet)),async sync(packet){if(packet)this.send(packet);const time=++ping;this.send({type:'ping',time});await next(p=>p.type==='pong'&&p.time===time)},async join(mode='join',map='sector-v'){this.send({type:mode,token,profile:{name:token.slice(0,6),operative:{hero:'samuraijack'}},map});const packet=await next(p=>p.type==='joined'||p.type==='error');if(packet.type==='joined')this.id=packet.id;return packet}};
  clients.push(c);await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});await next(p=>p.type==='hello');return c;
 }
 return {app,port,client};
}
async function duo(t){const f=await fixture(t),host=await f.client('host-session-00000001'),guest=await f.client('guest-session-0000002');await host.join('create');await guest.join();await host.sync({type:'start'});const snapshot=await host.next(p=>p.type==='state');return {...f,host,guest,snapshot,room:f.app.room}}
const ticks=(room,n)=>{for(let i=0;i<n;i++)room.tick(1/60)};

test('LAN HTTP discovery, host permissions, map choice and four-player capacity use real sockets',async t=>{
 const {app,port,client}=await fixture(t);const response=await fetch(`http://127.0.0.1:${port}/api/lan`),info=await response.json();assert.equal(info.protocol,1);assert.equal(info.maxPlayers,4);assert.equal(info.port,port);assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status,200);
 const host=await client('host-session-00000001');await host.join('create','camp-kidney');const guests=[];for(let i=0;i<3;i++){const c=await client(`guest-session-000000${i}`);assert.equal((await c.join()).type,'joined');guests.push(c)}
 const fifth=await client('fifth-session-0000001');assert.match((await fifth.join()).message,/four players/);
 await guests[0].sync({type:'map',map:'salvage-yard'});assert.equal(app.room.mapId,'camp-kidney');assert.match((await guests[0].next(p=>p.type==='error')).message,/host/);
 await host.sync({type:'map',map:'salvage-yard'});assert.equal(app.room.mapId,'salvage-yard');await guests[0].sync({type:'start'});assert.equal(app.room.phase,'lobby');await host.sync({type:'start'});
 for(const c of [host,...guests]){const state=await c.next(p=>p.type==='state');assert.equal(state.map,'salvage-yard');assert.equal(state.players.length,4);assert.equal(state.matchId,app.room.matchId);assert.equal(state.players.find(p=>p.id===c.id).profile.operative.hero,'samuraijack')}
 assert.equal(app.room.sim.phase,'playing');app.room.sim.beginWave();assert.equal(app.room.sim.spawnQueue.length,Math.round(roundTuning(1).count*2.65));
 for(let i=0;i<20;i++){const enemy=app.room.sim.spawn('spawn');assert.equal(enemy.maxHp,Math.round(64*roundTuning(1).health*1.48));assert.ok(app.room.active.every(m=>Math.hypot(m.player.x-enemy.x,m.player.z-enemy.z)>12),'entrances stay clear of every operative')}
 const rejected=new WebSocket(`ws://127.0.0.1:${port}/lan`,{origin:'http://another-site.example'});const status=await new Promise(resolve=>{rejected.on('unexpected-response',(_,res)=>{res.resume();rejected.terminate();resolve(res.statusCode)});rejected.on('error',()=>{})});assert.equal(status,403);
});

test('movement, stale packets, aim, ammunition and shared hits are server authoritative',async t=>{
 const {room,host,guest,snapshot}=await duo(t),m=room.members.get(host.id),other=room.members.get(guest.id);room.sim.intermission=999;
 const before={x:m.player.x,z:m.player.z};await host.sync({type:'input',matchId:snapshot.matchId,seq:1,input:{x:0,z:-1,sprint:true,yaw:.6,pitch:0}});ticks(room,12);assert.ok(Math.hypot(m.player.x-before.x,m.player.z-before.z)>.5);assert.equal(other.player.x,room.makePlayer('unused',1).x);
 await host.sync({type:'input',matchId:snapshot.matchId,seq:1,input:{x:1,z:0}});assert.equal(m.input.z,-1);await host.sync({type:'input',matchId:'previous-run',seq:2,input:{x:1,z:0}});assert.equal(m.receivedSeq,1);
 m.player.stance='crouch';m.player.sprintHeld=false;await host.sync({type:'input',matchId:snapshot.matchId,seq:2,input:{x:0,z:0,sprint:false,sprintRequested:true,ads:true}});room.tick();assert.equal(m.player.stance,'stand','Shift stands the authoritative LAN player even while ADS prevents sprinting');
 const clean=sanitizeInput({x:Infinity,z:9,pitch:999,yaw:NaN,sprint:'yes'});assert.deepEqual([clean.x,clean.z,clean.pitch,clean.yaw,clean.sprint],[0,1,1.35,0,false]);
 m.player.x=-25;m.player.z=30;m.player.y=0;m.player.eyeHeight=1.68;m.player.fireTimer=0;m.player.weapons[0].ammo=12;
 const e=room.withMember(m,()=>room.sim.spawn('spawn'));e.x=m.player.x;e.z=m.player.z-5;e.height=2.5;e.radius=.7;e.hp=e.maxHp=1000;e.stun=999;const health=e.hp,ammo=other.player.weapons[0].ammo;
 await host.sync({type:'action',matchId:snapshot.matchId,action:'fire',yaw:0,pitch:0,ads:true,damage:999999,credits:999999});const shot=await guest.next(p=>p.type==='shot');assert.equal(shot.playerId,host.id);assert.ok(e.hp<health);assert.ok(e.hp>health-100);assert.equal(m.player.weapons[0].ammo,11);assert.equal(other.player.weapons[0].ammo,ammo);
 await host.sync({type:'action',matchId:snapshot.matchId,action:'fire',yaw:0});assert.equal(m.player.weapons[0].ammo,11,'cooldown prevents rapid duplicate fire');
 m.player.fireTimer=0;const hp=e.hp,block={minX:-26,maxX:-24,minZ:27,maxZ:28,base:0,height:4};room.sim.layout.obstacles.push(block);room.withMember(m,()=>fireAuthoritative(room.sim,{yaw:0,pitch:0,ads:true},m.id,()=>.5));assert.equal(e.hp,hp,'walls block server hits');room.sim.layout.obstacles.pop();
 const fake={obstacles:[block],blockedAtHeight:()=>false};assert.equal(worldRay(fake,{x:-25,y:1.7,z:30},{x:0,y:0,z:-1},50),2);
 await host.sync({type:'action',matchId:snapshot.matchId,action:'reload'});assert.ok(m.player.reloadTimer>0);ticks(room,90);assert.equal(m.player.weapons[0].ammo,12);assert.equal(m.player.weapons[0].reserve,106);
});

test('gate costs, wall guns and supply box ownership preserve personal inventory and shared progress',async t=>{
 const {room,host,guest,snapshot}=await duo(t),a=room.members.get(host.id),b=room.members.get(guest.id),sim=room.sim;sim.intermission=999;a.player.credits=5000;b.player.credits=5000;
 const gate=MAPS[0].stations.find(s=>s.kind==='gate'&&s.unlock==='yard');assert.ok(room.withMember(a,()=>sim.interact(gate)));assert.equal(a.player.credits,4250);assert.equal(b.player.credits,5000);assert.ok(room.snapshot().unlocked.yard);
 const wall=MAPS[0].stations.find(s=>s.kind==='wall');assert.ok(room.withMember(b,()=>sim.interact(wall)));assert.equal(a.player.weapons.length,1);assert.equal(b.player.weapons.length,2);
 const box=MAPS[0].stations.find(s=>s.kind==='mystery');assert.ok(room.withMember(a,()=>sim.interact(box)));assert.equal(sim.box.ownerId,a.id);assert.equal(room.withMember(b,()=>sim.interact(box)),false);sim.updateBox(3.2);assert.equal(sim.box.phase,'ready');assert.equal(room.withMember(b,()=>sim.interact(box)),false);const offer=sim.box.offer.id;assert.ok(room.withMember(a,()=>sim.interact(box)));assert.equal(a.player.weapons[a.player.weaponIndex].id,offer);assert.equal(sim.box.ownerId,null);
 await host.sync({type:'action',matchId:snapshot.matchId,action:'nanoSelect',index:2});assert.equal(a.player.nano,2);assert.equal(b.player.nano,0);const energy=a.player.energy;await host.sync({type:'action',matchId:snapshot.matchId,action:'nano',yaw:0});assert.ok(a.player.energy<energy);assert.ok(a.player.cooldowns[2]>0);assert.equal(b.player.energy,100);
});

test('downed players can be revived with held F; enemies select living targets; team wipes end the run',async t=>{
 const {room,host,guest,snapshot}=await duo(t),a=room.members.get(host.id),b=room.members.get(guest.id);room.sim.intermission=999;a.player.x=-25;a.player.z=30;b.player.x=-24;b.player.z=30;b.player.revives=0;b.player.invuln=0;room.hurt(b,1000,{x:0,z:0});assert.equal(room.phase,'playing');assert.equal(b.player.hp,0);assert.ok(b.player.downed);
 const e=room.withMember(a,()=>room.sim.spawn('spawn'));e.x=-22;e.z=30;assert.equal(room.target(e).id,a.id);e.dead=true;e.deathTime=room.sim.elapsed;
 await host.sync({type:'input',matchId:snapshot.matchId,seq:1,input:{interactHeld:true,yaw:0}});ticks(room,90);assert.equal(b.player.hp,0);assert.ok(a.reviveProgress>1.4);await host.sync({type:'input',matchId:snapshot.matchId,seq:2,input:{interactHeld:false}});room.tick();assert.equal(a.reviveProgress,0);
 await host.sync({type:'input',matchId:snapshot.matchId,seq:3,input:{interactHeld:true}});ticks(room,181);assert.equal(b.player.downed,false);assert.ok(b.player.hp>=50);assert.ok(b.player.invuln>3);assert.equal((await guest.next(p=>p.type==='revived')).playerId,b.id);
 for(const m of [a,b]){m.player.invuln=0;m.player.revives=0;room.hurt(m,1000,{})}assert.equal(room.phase,'result');assert.equal(room.sim.phase,'result');assert.equal(room.snapshot().result.victory,false);
});

test('late joining, host migration, reconnect and redeployment retain a coherent match',async t=>{
 const {room,host,guest,client,snapshot}=await duo(t);room.sim.wave=7;room.sim.intermission=999;room.members.get(host.id).player.credits=3210;const third=await client('late-session-00000003');await third.join();const joined=await third.next(p=>p.type==='state');assert.equal(joined.wave,7);assert.equal(joined.matchId,snapshot.matchId);assert.equal(joined.players.length,3);
 host.ws.close();await new Promise(resolve=>host.ws.once('close',resolve));await guest.sync();assert.equal(room.hostId,guest.id);assert.equal(room.phase,'playing');const reconnected=await client('host-session-00000001');await reconnected.join();assert.equal(reconnected.id,host.id);assert.equal(room.members.get(host.id).player.credits,3210);assert.equal(room.hostId,guest.id);
 room.withMember(room.members.get(guest.id),()=>room.sim.finish(true));assert.equal(room.phase,'result');await guest.sync({type:'start'});assert.notEqual(room.matchId,snapshot.matchId);assert.equal(room.sim.wave,0);assert.ok(room.active.every(m=>m.player.hp===100&&m.player.credits===500));
});

test('native client joins, initializes once, reconciles snapshots and resumes after loss',async t=>{
 const {app,port,client}=await fixture(t);globalThis.WebSocket=WebSocket;globalThis.location={protocol:'http:',host:`127.0.0.1:${port}`};globalThis.sessionStorage={getItem:()=>null,setItem:()=>{}};
 const host=await client('host-session-00000001');await host.join('create');let matches=0,states=0,results=0,disconnects=0;const sim=new Survival(),world={addEnemy(){},addProjectile(){},addDrop(){},weapon(){},nano(){},setPeers(){}};
 const lan=new LanClient({onMatch:async snapshot=>{matches++;sim.phase='menu';sim.selectMap(snapshot.map);sim.start();sim.phase='paused';lan.apply(snapshot,sim,world)},onState:snapshot=>{states++;lan.apply(snapshot,sim,world)},onResult:()=>results++,onDisconnect:()=>disconnects++});
 t.after(()=>{clearInterval(lan.pingTimer);lan.leave();delete globalThis.location;delete globalThis.sessionStorage});await lan.connect('join',{name:'Browser client',kit:{gun:'bracer',melee:'hammer'}},'sector-v');await host.sync({type:'start'});await new Promise(resolve=>setTimeout(resolve,30));assert.equal(matches,1);assert.equal(sim.player.id,lan.id);assert.equal(sim.equipped.id,'bracer');assert.equal(sim.player.meleeId,'hammer');assert.equal(lan.isHost,false);
 app.room.sim.intermission=999;app.room.broadcast(app.room.snapshot());await new Promise(resolve=>setTimeout(resolve,20));assert.ok(states>=1);assert.equal(matches,1);
 lan.action('nanoSelect',{index:1});await new Promise(resolve=>setTimeout(resolve,20));assert.equal(app.room.members.get(lan.id).player.nano,1);app.room.broadcast(app.room.snapshot());await new Promise(resolve=>setTimeout(resolve,20));assert.equal(sim.player.nano,1);
 app.room.withMember(app.room.members.get(host.id),()=>app.room.sim.finish(true));app.room.broadcast(app.room.snapshot());app.room.broadcast(app.room.snapshot());await new Promise(resolve=>setTimeout(resolve,20));assert.equal(results,1);
 lan.socket.close();await new Promise(resolve=>setTimeout(resolve,20));assert.equal(disconnects,1);assert.ok(lan.joined);await lan.connect('join',{name:'Browser client'});assert.equal(app.room.members.size,2);assert.equal(lan.connected,true);
});
