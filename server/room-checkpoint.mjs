import {CoopRoom} from './coop-room.mjs';
import {inRoom} from './matchmaker.mjs';
import {FlowField} from '../dist/layout.js';
const transient=new Set(['room','events','layout','flow','player']);
export function saveRoom(room){
 return {mapId:room.mapId,phase:room.phase,hostId:room.hostId,matchId:room.matchId,tickNumber:room.tickNumber,result:room.result||null,
  unlocked:{...room.sim.layout.unlocked},members:[...room.members.values()].map(({flow,...m})=>m),
  sim:Object.fromEntries(Object.entries(room.sim).filter(([key])=>!transient.has(key)))};
}
export function restoreRoom(checkpoint){
 const room=new CoopRoom();room.mapId=checkpoint.mapId;
 return inRoom(room,()=>{room.sim.selectMap(room.mapId);
  for(const key of ['phase','hostId','matchId','tickNumber','result'])room[key]=checkpoint[key];
  Object.assign(room.sim,checkpoint.sim);room.sim.room=room;
  room.sim.layout.unlocked={...checkpoint.unlocked};room.sim.layout.refresh();room.sim.flow=new FlowField(room.sim.layout);
  room.members=new Map(checkpoint.members.map(m=>[m.id,{...m,flow:new FlowField(room.sim.layout)}]));room.sim.player=room.active[0]?.player||room.members.values().next().value?.player||null;room.contextId=null;return room;
 });
}
