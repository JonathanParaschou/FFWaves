import {randomBytes,randomUUID} from 'node:crypto';
import {CoopRoom,sanitizeProfile} from './coop-room.mjs';
import {inRoom,normalizeCode} from './matchmaker.mjs';
import {saveRoom,restoreRoom} from './room-checkpoint.mjs';
const code=()=>Array.from(randomBytes(8),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
const validToken=token=>typeof token==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(token);
export class VercelRooms{
 constructor(store,{now=Date.now}={}){this.store=store;this.now=now}
 lobby(record,room,id){const data={...room.lobby(),online:true,roomId:record.id};if(id===room.hostId)data.invite={code:record.code.slice(0,4)+'-'+record.code.slice(4),expiresAt:record.inviteExpires};return data}
 wire(record,room,events){room.broadcast=data=>{if(data.type==='lobby'){for(const m of room.members.values())events.push({to:m.id,data:this.lobby(record,room,m.id)})}else events.push({data})};room.direct=(to,data)=>events.push({to,data})}
 advance(record,room){const now=this.now();for(const m of room.members.values())if(m.connected&&now-(m.seenAt||now)>5000){room.disconnect(m.id);m.expiresAt=(m.seenAt||now)+20000}record.remainder=(record.remainder||0)+Math.min(.15,Math.max(0,(now-record.updatedAt)/1000));record.updatedAt=now;let steps=0;while(record.remainder>=1/60&&steps++<9){room.tick(1/60);record.remainder-=1/60}}
 finish(record,room,events,value){const changes=[],now=this.now();record.checkpoint=saveRoom(room);
  if(record.oldCode&&record.oldCode!==record.code)changes.push({key:this.store.key('invite',record.oldCode)});
  if(record.code!==record.oldCode&&room.members.size)changes.push({key:this.store.key('invite',record.code),value:record.id,ttl:Math.max(1,record.inviteExpires-now),unique:true});
  for(const m of room.members.values())changes.push({key:this.store.tokenKey(m.token),value:record.id,ttl:1800000});
  delete record.oldCode;
  if(!room.members.size){changes.push({key:this.store.key('invite',record.code)});return {state:null,events,changes,value}}
  return {state:record,events,changes,value};
 }
 async create(token,profile,map){if(!validToken(token))throw Error('Invalid session token.');const existing=await this.store.lookupToken(token),saved=existing&&await this.store.read(existing);if(saved?.checkpoint.members.some(m=>m.token===token&&(m.connected||m.expiresAt>this.now())))throw Error('You already have a party. Reconnect or leave first.');const id=randomUUID();return this.store.transact(id,previous=>{if(previous)throw Error('Party collision. Retry.');const now=this.now(),record={version:1,id,code:code(),inviteExpires:now+600000,updatedAt:now,lastSnapshot:0,remainder:0},room=new CoopRoom(),events=[];return inRoom(room,()=>{const member=room.add({token,profile,create:true,map});member.seenAt=now;member.connectionId=randomUUID();this.wire(record,room,events);return this.finish(record,room,events,{id:member.id,connectionId:member.connectionId,lobby:this.lobby(record,room,member.id)})})})}
 async update(id,operation,before=()=>{}){return this.store.transact(id,record=>{if(!record||record.version!==1)throw Error('Party expired. Create or join a new party.');record.oldCode=record.code;const room=restoreRoom(record.checkpoint),events=[];this.wire(record,room,events);return inRoom(room,()=>{before(room,record);this.advance(record,room);const value=operation(room,record,events);if(room.tickNumber-record.lastSnapshot>=3){record.lastSnapshot=room.tickNumber;events.push({data:room.snapshot()})}return this.finish(record,room,events,value)})})}
 async join(message){if(!validToken(message.token))throw Error('Invalid session token.');const reconnect=message.type==='reconnect',key=normalizeCode(message.code),id=reconnect?message.roomId:await this.store.lookupCode(key);if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('That code expired or was used. Ask the host for a fresh code.');return this.update(id,(room,record)=>{const now=this.now(),old=[...room.members.values()].find(m=>m.token===message.token);if(reconnect){if(!old||old.connected||old.expiresAt<=now)throw Error('Reconnect is not ready or has expired. Try again shortly.')}else if(key!==record.code||record.inviteExpires<=now)throw Error('That code expired or was used. Ask the host for a fresh code.');const m=room.add({token:message.token,profile:message.profile});m.seenAt=now;m.connectionId=randomUUID();if(!reconnect){record.code=code();record.inviteExpires=now+600000}room.broadcast(room.lobby());return {id:m.id,connectionId:m.connectionId,lobby:this.lobby(record,room,m.id),state:room.phase==='lobby'?null:room.snapshot()}})}
 async flush(id,commands,touches=[]){return this.update(id,(room,record,events)=>{
  record.receipts||=[];
  for(const command of commands){const m=room.members.get(command.memberId),p=command.packet;if(!m?.connected||command.connectionId!==m.connectionId)continue;if(command.id&&record.receipts.includes(command.id))continue;m.seenAt=this.now();try{switch(p.type){
   case 'input':if(p.matchId===room.matchId)room.input(m.id,p.seq,p.input);break;
   case 'action':if(p.matchId===room.matchId)room.action(m.id,p.action,p);break;
   case 'start':room.start(m.id);room.broadcast(room.lobby());events.push({data:room.snapshot()});break;
   case 'map':room.chooseMap(m.id,p.map);room.broadcast(room.lobby());break;
   case 'profile':if(room.phase==='playing')throw Error('Change loadout between matches.');m.profile=sanitizeProfile(p.profile);room.broadcast(room.lobby());break;
   case 'invite':if(m.id!==room.hostId)throw Error('Only the host can generate invites.');record.code=code();record.inviteExpires=this.now()+600000;room.broadcast(room.lobby());break;
   case 'disconnect':room.disconnect(m.id);room.broadcast(room.lobby());break;
   case 'leave':room.leave(m.id);events.push({to:m.id,data:{type:'left'}});room.broadcast(room.lobby());break;
   default:break;
  }}catch(error){events.push({to:m.id,data:{type:'error',message:error.message}})}if(command.id)record.receipts.push(command.id)}record.receipts=record.receipts.slice(-512);
 },room=>{for(const t of touches){const m=room.members.get(t.id);if(m?.connected&&m.connectionId===t.connectionId)m.seenAt=this.now()}})}
}
