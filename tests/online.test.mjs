import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createLanServer} from '../server.mjs';
import {inRoom} from '../server/matchmaker.mjs';
import {LanClient} from '../dist/lan-client.js';
import {discoverOnlineService} from '../dist/online-service.js';
async function fixture(t,options={}){
 const app=await createLanServer({port:0,host:'127.0.0.1',autoTick:false,...options}),port=await app.listen(),clients=[];
 t.after(async()=>{clients.forEach(c=>c.ws.terminate());await app.close()});
 async function client(token){const ws=new WebSocket(`ws://127.0.0.1:${port}/online`),packets=[],waiters=[];ws.on('message',b=>{const p=JSON.parse(b),i=waiters.findIndex(w=>w.predicate(p));if(i<0)packets.push(p);else{const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(p)}});const next=predicate=>{const i=packets.findIndex(predicate);if(i>=0)return Promise.resolve(packets.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={predicate,resolve,timer:setTimeout(()=>reject(Error('Online packet timeout')),3000)};waiters.push(w)})};await new Promise((resolve,reject)=>{ws.on('open',resolve);ws.on('error',reject)});const c={ws,next,send:p=>ws.send(JSON.stringify(p)),async join(type='join',extra={}){this.send({type,token,profile:{name:token.slice(0,10)},map:'dexlabs-bunker',...extra});return next(p=>p.type==='joined'||p.type==='error')}};clients.push(c);return c}
 return {app,port,client};
}
test('private codes admit one guest, rotate atomically, hide invitations from guests and isolate other parties',async t=>{
 const {app,client}=await fixture(t),host=await client('host-session-00000001'),a=await host.join('create'),guest=await client('guest-session-0000001');assert.match(a.lobby.invite.code,/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);assert.ok(a.lobby.roomId);const joined=await guest.join('join',{code:a.lobby.invite.code.toLowerCase()});assert.equal(joined.lobby.players.length,2);assert.equal(joined.lobby.invite,undefined);const updated=await host.next(p=>p.type==='lobby'&&p.players.length===2);assert.notEqual(updated.invite.code,a.lobby.invite.code);
 const replay=await client('replay-session-000001');assert.equal((await replay.join('join',{code:a.lobby.invite.code})).type,'error');assert.equal(app.matchmaker.rooms.get(a.lobby.roomId).room.members.size,2);
 const other=await client('other-host-session-0001'),b=await other.join('create',{map:'salvage-yard'});assert.notEqual(b.lobby.roomId,a.lobby.roomId);assert.equal(b.lobby.players.length,1);assert.equal(app.room.members.size,0,'legacy LAN room independent');
 host.send({type:'start'});const state=await host.next(p=>p.type==='state');assert.equal(state.players.length,2);assert.equal(state.map,'dexlabs-bunker');other.send({type:'start'});const otherState=await other.next(p=>p.type==='state');assert.equal(otherState.map,'salvage-yard');
 for(const e of app.matchmaker.rooms.values()){inRoom(e.room,()=>{e.room.sim.intermission=999;for(let i=0;i<5;i++)e.room.tick();assert.equal(e.room.sim.layout.map.id,e.room.mapId);assert.equal(e.room.snapshot().map,e.room.mapId)})}
 assert.equal(app.matchmaker.rooms.get(a.lobby.roomId).room.sim.layout.map.id,'dexlabs-bunker');
});
test('invite refresh revokes old codes, expires codes and only the host may regenerate',async t=>{
 const {app,client}=await fixture(t),host=await client('host-session-00000002'),a=await host.join('create'),e=app.matchmaker.rooms.get(a.lobby.roomId);host.send({type:'invite'});const b=await host.next(p=>p.type==='lobby'&&p.invite?.code!==a.lobby.invite.code);assert.throws(()=>app.matchmaker.find(a.lobby.invite.code));const g=await client('guest-session-0000002');assert.equal((await g.join('join',{code:b.invite.code})).type,'joined');g.send({type:'invite'});assert.match((await g.next(p=>p.type==='error')).message,/host/);e.expiresAt=Date.now()-1;const later=await client('later-session-0000002');assert.match((await later.join('join',{code:e.code})).message,/expired/);
});
test('four seats, reconnect reservations, host migration and final leave close the room',async t=>{
 const {app,client}=await fixture(t),people=[];const h=await client('host-session-00000003'),a=await h.join('create'),e=app.matchmaker.rooms.get(a.lobby.roomId);people.push({c:h,id:a.id});for(let i=0;i<3;i++){const c=await client('guest-session-000003'+i),r=await c.join('join',{code:e.code});assert.equal(r.type,'joined');people.push({c,id:r.id})}const fifth=await client('fifth-session-0000003');assert.match((await fifth.join('join',{code:e.code})).message,/four/);
 const closed=new Promise(resolve=>h.ws.once('close',resolve));h.ws.close();await closed;await people[1].c.next(p=>p.type==='lobby'&&p.players.some(p=>!p.connected));assert.equal(e.room.hostId,people[1].id);
 const re=await client('host-session-00000003');const r=await re.join('reconnect',{roomId:e.id});assert.equal(r.id,a.id);assert.equal(e.room.members.size,4);assert.equal(r.lobby.invite,undefined,'reconnecting former host stays a teammate');
 for(const {c}of [...people.slice(1),{c:re}]){c.send({type:'leave'});await new Promise(resolve=>c.ws.once('close',resolve))}assert.equal(app.matchmaker.rooms.size,0);assert.throws(()=>app.matchmaker.find(e.code));
});
test('origin allowlist permits configured hosted clients and blocks arbitrary sites',async t=>{
 const {port}=await fixture(t,{allowedOrigins:['https://game.example']});const info=await fetch(`http://127.0.0.1:${port}/api/matchmaking`,{headers:{Origin:'https://game.example'}});assert.equal(info.status,200);assert.equal(info.headers.get('access-control-allow-origin'),'https://game.example');assert.equal((await info.json()).lobby,undefined);assert.equal((await fetch(`http://127.0.0.1:${port}/api/matchmaking`,{headers:{Origin:'https://evil.example'}})).status,403);
 const rejected=new WebSocket(`ws://127.0.0.1:${port}/online`,{origin:'https://evil.example'});const status=await new Promise(resolve=>{rejected.on('unexpected-response',(_,r)=>{r.resume();rejected.terminate();resolve(r.statusCode)});rejected.on('error',()=>{})});assert.equal(status,403);assert.equal((await fetch(`http://127.0.0.1:${port}/healthz`)).status,200);
});
test('capacity, join throttling and expired reconnect seats are enforced',async t=>{
 const {app,client}=await fixture(t,{maxRooms:1}),h=await client('host-session-00000004'),a=await h.join('create');const c=await client('other-session-0000004');assert.match((await c.join('create')).message,/full/);for(let i=0;i<30;i++){const r=await c.join('join',{code:'NOTACODE'});if(i===29)assert.match(r.message,/Too many/)}
 const e=app.matchmaker.rooms.get(a.lobby.roomId);const close=new Promise(resolve=>h.ws.once('close',resolve));h.ws.close();await close;for(const m of e.room.members.values()){m.connected=false;m.expiresAt=Date.now()-1}app.matchmaker.prune();assert.equal(app.matchmaker.rooms.size,0);
});
test('browser client uses public endpoint, saves room identity and reconnects without reusing an invite',async t=>{
 const {client,port}=await fixture(t),host=await client('host-session-00000005'),a=await host.join('create');const saved=new Map();globalThis.WebSocket=WebSocket;globalThis.location={protocol:'http:',host:'front-end.example',origin:'http://front-end.example'};globalThis.sessionStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};const browser=new LanClient();t.after(()=>{clearInterval(browser.pingTimer);browser.leave();delete globalThis.location;delete globalThis.sessionStorage});await browser.connect('join',{name:'Browser'},'dexlabs-bunker',{online:true,endpoint:`http://127.0.0.1:${port}`,code:a.lobby.invite.code});assert.equal(browser.roomId,a.lobby.roomId);assert.equal(JSON.parse(saved.get('fusionfall-online-room')).roomId,a.lobby.roomId);const id=browser.id;const closed=new Promise(resolve=>browser.socket.once('close',resolve));browser.socket.close();await closed;await host.next(p=>p.type==='lobby'&&p.players.some(p=>!p.connected));await browser.connect('reconnect',{name:'Browser'},'dexlabs-bunker',{online:true,endpoint:`http://127.0.0.1:${port}`,roomId:browser.roomId});assert.equal(browser.id,id);assert.equal(browser.connected,true);browser.leave();assert.equal(saved.has('fusionfall-online-room'),false);
});
test('live server clock advances separate rooms and disabled public LAN stays closed',async t=>{
 const {client,port}=await fixture(t,{autoTick:true,enableLan:false});const a=await client('clock-host-session-01'),b=await client('clock-host-session-02');await a.join('create',{map:'dexlabs-bunker'});await b.join('create',{map:'camp-kidney'});a.send({type:'start'});b.send({type:'start'});const first=await a.next(p=>p.type==='state'&&p.tick>=6),second=await b.next(p=>p.type==='state'&&p.tick>=6);assert.equal(first.map,'dexlabs-bunker');assert.equal(second.map,'camp-kidney');assert.ok(first.elapsed>0&&second.elapsed>0);assert.notEqual(first.matchId,second.matchId);assert.equal((await fetch(`http://127.0.0.1:${port}/api/lan`)).status,404);
});
test('discovery identifies missing static-host configuration, blocked origins and unavailable servers',async()=>{
 const origin='https://game.example',remote='https://rooms.example';
 const probe=(config,response)=>discoverOnlineService({origin,fetchImpl:async url=>{if(url.endsWith('/net-config.json'))return Response.json(config);if(response instanceof Error)throw response;return response;}});
 await assert.rejects(probe({matchmakingUrl:''},new Response('Not found',{status:404})),/has not been connected/);
 await assert.rejects(probe({matchmakingUrl:''},new Response('<html>Game</html>')),/has not been connected/);
 await assert.rejects(probe({matchmakingUrl:remote},new Response('',{status:403})),/has not allowed connections/);
 await assert.rejects(probe({matchmakingUrl:remote},new Response('',{status:503})),/starting or temporarily unavailable/);
 await assert.rejects(probe({matchmakingUrl:remote},new TypeError('Failed to fetch')),/offline.*blocking/);
 await assert.rejects(probe({matchmakingUrl:remote},new DOMException('Timeout','TimeoutError')),/waking up/);
 await assert.rejects(probe({matchmakingUrl:remote},new Response('<html/>')),/webpage instead/);
 await assert.rejects(probe({matchmakingUrl:'http://rooms.example'},Response.json({})),/secure HTTPS/);
});
test('discovery supports the full local server and an explicitly configured remote service',async t=>{
 const {port}=await fixture(t);const local=await discoverOnlineService({origin:`http://127.0.0.1:${port}`});assert.equal(local.info.online,true);
 const urls=[];const remote=await discoverOnlineService({origin:'https://game.example',fetchImpl:async url=>{urls.push(url);return url.endsWith('net-config.json')?Response.json({matchmakingUrl:'https://rooms.example'}):Response.json({ok:true,protocol:1,online:true,maxPlayers:4})}});assert.equal(remote.endpoint,'https://rooms.example');assert.deepEqual(urls,['https://game.example/net-config.json','https://rooms.example/api/matchmaking']);
});
