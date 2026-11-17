import { groundHeight } from './layout.js';
export function updateCompanion(entry,{player:p,selected,yaw,time,dt,moving,layout,flow,aiming=false,pitch=0}){
 if(entry.index!==selected){entry.object.visible=false;entry.initialized=false;entry.cast=0;return null}
 entry.object.visible=true;
 const i=entry.index,position=entry.object.position;
 entry.cast=Math.max(0,entry.cast-dt);
 const identity=Number(entry.personality)||i+1,energy=.8+(identity%7)*.08,phase=time*1.4*energy+i;
 if(!entry.initialized){entry.gesture=['nano','event1','point'];entry.gestureAt=time+9+identity%8}
 if(entry.reaction){entry.gesture=entry.reaction==='cheer'?['event1','talkexclamation','point']:['observe','talk','stand2'];entry.reaction=null;entry.gestureAt=time+12}
 if(time>(entry.gestureAt||Infinity)&&!moving&&!aiming&&entry.cast<=0){entry.gesture=(Math.floor(time/10)+identity)%2?['observe','talk','stand2']:['event2','stand3','point'];entry.gestureAt=time+12+identity%9}
 entry.bank=Math.sin(phase*1.2)*.045+(moving?-.08:0);entry.tilt=moving?.09:Math.sin(phase*.8)*.025;entry.summon=Math.max(0,(entry.summon||0)-dt);
 let side=(aiming?-1.45:-1.05)+Math.sin(phase)*.06,depth=(aiming?-2.9:-2.35)+Math.cos(phase*.7)*.07;
 if(entry.cast>0){side=-1.1;depth=-2.1}
 const dx=side*Math.cos(yaw)+depth*Math.sin(yaw),dz=-side*Math.sin(yaw)+depth*Math.cos(yaw);
 let tx=p.x+dx,tz=p.z+dz;
 if(layout.blocked(tx,tz,.2,p)){tx=p.x+dx*.65;tz=p.z+dz*.65}
 const targetY=Math.max(groundHeight(tx,tz,p)+.25,groundHeight(p.x,p.z,p)+(p.y||0)+(p.eyeHeight||1.68)-.38+Math.sin(pitch)*1.2+Math.sin(time*2.2*energy+i*2)*.10);
 if(!entry.initialized||Math.hypot(position.x-tx,position.z-tz)>12){position.set(tx,targetY,tz);entry.initialized=true}
 else{const factor=1-Math.exp(-dt*(moving?13:9));position.x+=(tx-position.x)*factor;position.z+=(tz-position.z)*factor;position.y+=(targetY-position.y)*factor}
 const relativeX=position.x-p.x,relativeZ=position.z-p.z,forward=-relativeX*Math.sin(yaw)-relativeZ*Math.cos(yaw),sideways=relativeX*Math.cos(yaw)-relativeZ*Math.sin(yaw);if(forward<.4||Math.abs(sideways)<forward*.26){position.x=tx;position.z=tz;position.y=targetY}
 const glance=!moving&&!aiming&&Math.sin(time*.24+identity)>-.35;return entry.cast>0||!glance?yaw+Math.PI:Math.atan2(p.x-position.x,p.z-position.z);
}
export function selectCompanion(entries,index){for(const entry of entries){const active=entry.index===index;entry.object.visible=active;entry.cast=0;entry.initialized=false;entry.summon=active?1.1:0}return entries.find(e=>e.index===index)||null}
