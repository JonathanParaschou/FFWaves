import {randomBytes,randomUUID} from 'node:crypto';
import {CoopRoom} from './coop-room.mjs';
import {activeMap,setActiveMap} from '../dist/layout.js';
// Shared legacy layout exports are scoped for every synchronous room operation. Never await inside this guard.
export function inRoom(room,operation){const previous=activeMap.id;setActiveMap(room.mapId);try{return operation()}finally{setActiveMap(previous)}}
export function normalizeCode(value){return String(value||'').toUpperCase().replace(/[\s-]/g,'')}
export class Matchmaker{
 constructor({now=Date.now,maxRooms=8,inviteTTL=600000}={}){this.now=now;this.maxRooms=Number.isInteger(maxRooms)?Math.max(1,Math.min(32,maxRooms)):8;this.inviteTTL=inviteTTL;this.rooms=new Map();this.codes=new Map()}
 create(token){this.prune();if(this.rooms.size>=this.maxRooms)throw Error('Server is full. Try again shortly.');for(const e of this.rooms.values())if([...e.room.members.values()].some(m=>m.token===token))throw Error('You already have a party. Reconnect or leave it first.');const e={id:randomUUID(),room:new CoopRoom(),connections:new Map(),lastActive:this.now(),code:null,expiresAt:0};this.rooms.set(e.id,e);this.rotate(e);return e}
 rotate(e){if(e.code)this.codes.delete(e.code);let code;do{code=Array.from(randomBytes(8),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('')}while(this.codes.has(code));e.code=code;e.expiresAt=this.now()+this.inviteTTL;this.codes.set(code,e.id);return code}
 find(code){const key=normalizeCode(code),e=this.rooms.get(this.codes.get(key));if(!/^[A-HJ-NP-Z2-9]{8}$/.test(key)||!e||e.expiresAt<=this.now())throw Error('That code has expired or was already used. Ask the host for a fresh code.');return e}
 reconnect(id,token){const e=this.rooms.get(id),m=e&&[...e.room.members.values()].find(m=>m.token===token);if(!m||m.connected||m.expiresAt<=this.now())throw Error('Reconnect window expired. Ask the host for a new code.');return e}
 consume(e){this.rotate(e);e.lastActive=this.now()}
 remove(e){if(e.code)this.codes.delete(e.code);this.rooms.delete(e.id)}
 lobby(e,viewer){const data={...e.room.lobby(),online:true,roomId:e.id};if(viewer===e.room.hostId)data.invite={code:e.code.slice(0,4)+'-'+e.code.slice(4),expiresAt:e.expiresAt};return data}
 prune(){for(const e of this.rooms.values()){inRoom(e.room,()=>e.room.prune());if(!e.room.members.size||!e.connections.size&&this.now()-e.lastActive>30000)this.remove(e);else if(e.room.phase==='lobby'&&this.now()-e.lastActive>1800000){for(const ws of e.connections.values())ws.close(1000,'Party expired after 30 minutes idle.');this.remove(e)}}}
}
