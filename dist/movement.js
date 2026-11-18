import {PLAYER_SCALE as P} from './player-scale.js';
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
export function movementState(){return {stance:'stand',eyeHeight:P.eye,locomotionSpeed:0,crouchBlend:0,slideBlend:0,slideTimer:0,slideCooldown:0,slideAge:0,slideX:0,slideZ:-1,sprintAge:0,sprintHeld:false,jumpHeld:false}}
export function updateMovement(p,input,layout,dt,events={}){
 const len=Math.hypot(input.x||0,input.z||0),nx=(input.x||0)/Math.max(1,len),nz=(input.z||0)/Math.max(1,len),grounded=p.y<.03,jump=!!input.jump&&!p.jumpHeld;
 const sprintRequested=!!(input.sprintRequested??input.sprint),sprintPressed=sprintRequested&&!p.sprintHeld;p.sprintHeld=sprintRequested;
 p.jumpHeld=!!input.jump;p.slideCooldown=Math.max(0,p.slideCooldown-dt);p.slideAge+=dt;
 if(input.crouchPressed){
  if(p.stance==='slide'){p.stance='stand';p.slideTimer=0;p.slideCooldown=.2;events.slideCancel?.()}
  else if(p.stance==='crouch')p.stance='stand';
  else if(grounded&&p.isSprinting&&p.sprintAge>=.12&&p.slideCooldown===0&&p.sprint>.16){p.stance='slide';p.slideTimer=P.slideDuration;p.slideAge=0;p.slideX=nx;p.slideZ=nz;p.sprint=Math.max(0,p.sprint-.12);events.slide?.()}
  else p.stance='crouch';
 }
 if(sprintPressed&&!input.crouchPressed&&p.stance==='crouch'){p.stance='stand';p.slideTimer=0}
 if(jump&&grounded){if(p.stance==='slide'){p.stance='stand';p.slideTimer=0;p.slideCooldown=.2;events.slideCancel?.()}else p.stance='stand';p.vy=p.buffs.jump>0?7.4:P.jumpVelocity;events.jump?.()}
 if(p.sprint<.04)p.sprintExhausted=true;if(p.sprint>.35)p.sprintExhausted=false;
 const sprinting=!!input.sprint&&len>0&&!p.sprintExhausted&&p.reloadTimer<=0&&p.stance==='stand'&&!input.ads;
 const beforeX=p.x,beforeZ=p.z,buff=p.buffs.speed>0?1.4:1;
 if(p.stance==='slide'){
  p.slideTimer=Math.max(0,p.slideTimer-dt);const t=1-p.slideTimer/P.slideDuration,speed=(P.slideStart+(P.slideEnd-P.slideStart)*t)*buff;
  if(len>0){p.slideX=damp(p.slideX,nx,1.4,dt);p.slideZ=damp(p.slideZ,nz,1.4,dt);const n=Math.hypot(p.slideX,p.slideZ)||1;p.slideX/=n;p.slideZ/=n}
  layout.move(p,p.slideX*speed*dt,p.slideZ*speed*dt,P.radius,true);
  if(p.slideTimer===0){p.stance='crouch';p.slideCooldown=.18}
  else if(Math.hypot(p.x-beforeX,p.z-beforeZ)<speed*dt*.25||!grounded){p.stance='stand';p.slideTimer=0;p.slideCooldown=.2}
 }else{const target=(p.stance==='crouch'?P.crouch:sprinting?P.sprint:input.ads?P.aim:P.walk)*buff;p.locomotionSpeed=damp(p.locomotionSpeed||0,len>0?target:0,18,dt);const speed=p.locomotionSpeed;if(len>0)layout.move(p,nx*speed*dt,nz*speed*dt,P.radius,true)}
 p.moveSpeed=Math.hypot(p.x-beforeX,p.z-beforeZ)/Math.max(dt,.001);p.isSprinting=sprinting&&p.moveSpeed>.25&&p.stance==='stand';p.sprintAge=p.isSprinting?p.sprintAge+dt:0;p.sprint=Math.max(0,Math.min(1,p.sprint+(p.isSprinting?-dt*.23:p.stance==='slide'?0:dt*.32)));
 p.vy-=P.gravity*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0)p.vy=0;layout.resolveVertical?.(p);
 p.eyeHeight=damp(p.eyeHeight,p.stance==='slide'?.78:p.stance==='crouch'?1.08:P.eye,15,dt);p.crouchBlend=damp(p.crouchBlend,p.stance==='crouch'?1:0,12,dt);p.slideBlend=damp(p.slideBlend,p.stance==='slide'?1:0,16,dt);
}
