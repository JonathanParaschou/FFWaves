import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import MockRedis from 'ioredis-mock';
import {WebSocket} from 'ws';
import {RedisRoomStore} from '../server/redis-room-store.mjs';
import {VercelRooms} from '../server/vercel-rooms.mjs';
import {createVercelGateway} from '../server/vercel-gateway.mjs';
import {loadServerCatalogs} from '../server/catalogs.mjs';
import {saveRoom,restoreRoom} from '../server/room-checkpoint.mjs';
import {inRoom} from '../server/matchmaker.mjs';
import {LanClient} from '../dist/lan-client.js';
await loadServerCatalogs();
const clone=v=>JSON.parse(JSON.stringify(v));
function store(t,namespace=randomUUID(),real=false){const s=new RedisRoomStore(real?process.env.FFWAVES_TEST_REDIS_URL:'redis://localhost:6398',{namespace,...(!real?{RedisClient:MockRedis}:{})});t.after(()=>s.close());return s}
test('checkpoints restore complete match state, player inventory and both floor contexts',async t=>{
 const s=store(t),service=new VercelRooms(s),h=await service.create('checkpoint-host-00001',{name:'Host'},'dexlabs-bunker');await service.flush(h.lobby.roomId,[{id:'start',memberId:h.id,connectionId:h.connectionId,packet:{type:'start'}}]);const record=await s.read(h.lobby.roomId),room=restoreRoom(record.checkpoint);inRoom(room,()=>{const m=room.members.get(h.id);m.player.credits=4321;m.player.reloadTimer=.7;m.player.nano=2;room.sim.intermission=999;room.sim.spawn('robo');room.sim.layout.unlock('yard');const saved=clone(saveRoom(room)),restored=restoreRoom(saved);assert.deepEqual(clone(saveRoom(restored)),saved);assert.equal(restored.sim.room,restored);const hp=restored.members.get(h.id).player.hp;restored.hurt(restored.members.get(h.id),1,{x:0,z:0});assert.equal(restored.members.get(h.id).player.hp,hp,'invulnerability still applies');assert.equal(restored.sim.layout.map.id,'dexlabs-bunker');assert.equal(restored.sim.enemies.length,1)});
});
test('separate Vercel instances share one-use invitations, serialized joins and role permissions',async t=>{
 const namespace=randomUUID(),a=store(t,namespace),b=store(t,namespace),one=new VercelRooms(a),two=new VercelRooms(b),h=await one.create('distributed-host-00001',{name:'Host'},'camp-kidney');const results=await Promise.allSettled([two.join({type:'join',token:'distributed-guest-001',code:h.lobby.invite.code,profile:{name:'Guest'}}),one.join({type:'join',token:'distributed-guest-002',code:h.lobby.invite.code,profile:{name:'Replay'}})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const g=results.find(r=>r.status==='fulfilled').value;assert.equal(g.lobby.invite,undefined);let record=await b.read(h.lobby.roomId);assert.equal(record.checkpoint.members.length,2);assert.notEqual(record.code.replace('-',''),h.lobby.invite.code.replace('-',''));
 const events=[];const off=await a.subscribe(h.lobby.roomId,e=>events.push(...e));await two.flush(h.lobby.roomId,[{id:'bad-start',memberId:g.id,connectionId:g.connectionId,packet:{type:'start'}},{id:'start',memberId:h.id,connectionId:h.connectionId,packet:{type:'start'}}]);await new Promise(r=>setTimeout(r,5));record=await a.read(h.lobby.roomId);assert.equal(record.checkpoint.phase,'playing');assert.ok(events.some(e=>e.to===g.id&&e.data.type==='error'));assert.ok(events.some(e=>e.data.type==='state'&&e.data.players.length===2));await off();
});
test('shared checkpoints survive gateway migration and reject stale connections and duplicated controls',async t=>{
 const s=store(t),service=new VercelRooms(s),h=await service.create('migration-host-000001',{name:'Host'},'dexlabs-bunker'),id=h.lobby.roomId;await service.flush(id,[{id:'start',memberId:h.id,connectionId:h.connectionId,packet:{type:'start'}}]);const before=(await s.read(id)).checkpoint.matchId;await service.flush(id,[{id:'disconnect',memberId:h.id,connectionId:h.connectionId,packet:{type:'disconnect'}}]);const restarted=new VercelRooms(s),r=await restarted.join({type:'reconnect',roomId:id,token:'migration-host-000001'});assert.equal(r.id,h.id);assert.equal(r.state.matchId,before);assert.notEqual(r.connectionId,h.connectionId);
 await restarted.flush(id,[{id:'stale-disconnect',memberId:h.id,connectionId:h.connectionId,packet:{type:'disconnect'}},{id:'fresh-invite',memberId:h.id,connectionId:r.connectionId,packet:{type:'invite'}}]);const code=(await s.read(id)).code;await restarted.flush(id,[{id:'fresh-invite',memberId:h.id,connectionId:r.connectionId,packet:{type:'invite'}}]);const record=await s.read(id);assert.equal(record.code,code,'control retries are idempotent');assert.equal(record.checkpoint.members[0].connected,true);
});
test('storage commits enforce room capacity and rollback failures without leaking invite keys',async t=>{
 const s=store(t);s.maxRooms=1;const service=new VercelRooms(s),h=await service.create('capacity-host-0000001',{},'sector-v');await assert.rejects(service.create('capacity-host-0000002',{},'sector-v'),/full/);await assert.rejects(s.transact(h.lobby.roomId,()=>{throw Error('Abort')}),/Abort/);assert.ok(await s.lookupCode(h.lobby.invite.code.replace('-','')));await service.flush(h.lobby.roomId,[{id:'leave',memberId:h.id,connectionId:h.connectionId,packet:{type:'leave'}}]);assert.equal(await s.read(h.lobby.roomId),null);assert.equal(await s.lookupCode(h.lobby.invite.code.replace('-','')),null);
});
test('an expired writer cannot save or delete the replacement writer lock',async t=>{
 const s=store(t),id=randomUUID();await assert.rejects(s.transact(id,()=>{void s.redis.set(s.key('lock',id),'replacement-writer','PX',5000);return {state:{id,version:1}}}),/changed while saving/);assert.equal(await s.read(id),null);assert.equal(await s.redis.get(s.key('lock',id)),'replacement-writer');
});
async function socket(port,token){const ws=new WebSocket(`ws://127.0.0.1:${port}/api/online`),packets=[],waiters=[];ws.on('message',b=>{const p=JSON.parse(b),w=waiters.find(w=>w.filter(p));if(w){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(p)}else packets.push(p)});await new Promise((r,j)=>{ws.on('open',r);ws.on('error',j)});return {ws,next(filter){const i=packets.findIndex(filter);if(i>=0)return Promise.resolve(packets.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={filter,resolve,timer:setTimeout(()=>reject(Error('Vercel socket timeout')),4000)};waiters.push(w)})},send(p){ws.send(JSON.stringify(p))},async join(type,extra={}){ws.send(JSON.stringify({type,token,profile:{name:'Operative'},map:'dexlabs-bunker',...extra}));return this.next(p=>p.type==='joined'||p.type==='error')}}}
async function crossGateway(t,real=false){const namespace='test-'+randomUUID(),a=store(t,namespace,real),b=store(t,namespace,real),ga=await createVercelGateway({store:a}),gb=await createVercelGateway({store:b});await Promise.all([ga,gb].map(g=>new Promise(r=>g.server.listen(0,'127.0.0.1',r))));t.after(async()=>{await ga.close();await gb.close()});const h=await socket(ga.server.address().port,'cross-gateway-host-01'),hr=await h.join('create'),guest=await socket(gb.server.address().port,'cross-gateway-guest-1'),gr=await guest.join('join',{code:hr.lobby.invite.code});t.after(()=>{h.ws.terminate();guest.ws.terminate()});assert.equal(gr.type,'joined');assert.equal(gr.lobby.roomId,hr.lobby.roomId);h.send({type:'start'});const hs=await h.next(p=>p.type==='state'&&p.tick>=3),gs=await guest.next(p=>p.type==='state'&&p.tick>=3);assert.equal(hs.matchId,gs.matchId);assert.equal(gs.players.length,2);assert.ok(gs.elapsed>0);guest.send({type:'action',matchId:gs.matchId,action:'nanoSelect',index:2});const changed=await h.next(p=>p.type==='state'&&p.players.some(p=>p.id===gr.id&&p.nano===2));assert.equal(changed.players.find(p=>p.id===gr.id).nano,2);h.ws.terminate();guest.ws.terminate()}
test('two actual WebSocket gateways share the Lua-backed mock store and advance one match',async t=>crossGateway(t));
test('real Redis integration across two Vercel gateways',{skip:!process.env.FFWAVES_TEST_REDIS_URL},async t=>crossGateway(t,true));
test('Vercel discovery reports the missing Redis connection explicitly',async t=>{const g=await createVercelGateway();await new Promise(r=>g.server.listen(0,'127.0.0.1',r));t.after(()=>g.close());const r=await fetch(`http://127.0.0.1:${g.server.address().port}/api/matchmaking`);assert.equal(r.status,503);assert.equal((await r.json()).code,'STORAGE_NOT_CONFIGURED')});
test('browser reconnects automatically to a replacement function while preserving its match',{timeout:10000},async t=>{
 const namespace=randomUUID(),a=store(t,namespace),b=store(t,namespace);
 const ga=await createVercelGateway({store:a}),gb=await createVercelGateway({store:b});
 await Promise.all([ga,gb].map(g=>new Promise(r=>g.server.listen(0,'127.0.0.1',r))));
 const created=await new VercelRooms(a).create('autoreconnect-host-01',{name:'Host'},'dexlabs-bunker');
 const initial=Promise.withResolvers(),restored=Promise.withResolvers(),disconnected=Promise.withResolvers();
 const originalGlobals=new Map(['WebSocket','location','sessionStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 globalThis.WebSocket=WebSocket;
 globalThis.location={protocol:'http:',origin:'http://game.example',host:'game.example'};
 const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 let matches=0,closed=false;
 const browser=new LanClient({onMatch(packet){(++matches===1?initial:restored).resolve(packet)},onDisconnect(){disconnected.resolve()}});
 t.after(async()=>{
  clearInterval(browser.pingTimer);browser.leave();
  try{if(!closed)await ga.close();await gb.close()}
  finally{for(const [key,descriptor]of originalGlobals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
 });
 await browser.connect('join',{name:'Guest'},'dexlabs-bunker',{online:true,endpoint:`http://127.0.0.1:${ga.server.address().port}`,code:created.lobby.invite.code});
 const identity=browser.id;
 await new VercelRooms(a).flush(created.lobby.roomId,[{id:'start',memberId:created.id,connectionId:created.connectionId,packet:{type:'start'}}]);
 const match=(await initial.promise).matchId,previousSocket=browser.socket;
 const replacement=`http://127.0.0.1:${gb.server.address().port}`;
 // Server shutdown can resolve before the client's close event is delivered.
 // Select the replacement first, then await actual client lifecycle events.
 browser.connectionOptions.endpoint=replacement;
 const socketClosed=once(previousSocket,'close');
 await ga.close();closed=true;
 await socketClosed;await disconnected.promise;
 const resumed=await restored.promise;
 assert.notEqual(browser.socket,previousSocket);
 assert.equal(new URL(browser.socket.url).origin,replacement.replace('http:','ws:'));
 assert.equal(browser.socket.readyState,WebSocket.OPEN);
 assert.equal(browser.connected,true);assert.equal(browser.joined,true);assert.equal(browser.running,true);
 assert.equal(browser.id,identity);assert.equal(browser.roomId,created.lobby.roomId);
 assert.equal(browser.matchId,match);assert.equal(resumed.matchId,match);
 assert.ok(resumed.players.some(p=>p.id===identity&&p.connected),'the replacement restores the same player');
});
