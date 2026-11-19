import {ENEMY_TYPES} from './enemy-roster.js';
import {groundHeight} from './layout.js';
export const HOSTILE_SHOTS={
 toxic:{color:'#baff65',texture:'mega-projectile',impact:'impact-burst'},
 electric:{color:'#8ceaff',texture:'energy-bolt',impact:'impact-ring'},
 plasma:{color:'#b5b5ff',texture:'energy-plasma',impact:'impact-ring'},
 fire:{color:'#ffb46a',texture:'nano-fire',impact:'impact-burst'},
 void:{color:'#ed9dff',texture:'energy-bolt',impact:'impact-ring'}
};
export const enemyWindup=cfg=>cfg.projectile?.windup??(cfg.slam?1.05:cfg.runner?.45:.65);
export const enemyRecovery=cfg=>cfg.projectile?.cooldown??1.3;
export function enemyMuzzle(enemy,target){
 let dx=target.x-enemy.x,dz=target.z-enemy.z,length=Math.hypot(dx,dz);if(length<.001){dx=Math.sin(enemy.yaw||0);dz=Math.cos(enemy.yaw||0);length=1}
 return {x:enemy.x+dx/length*(enemy.radius+.14),y:groundHeight(enemy.x,enemy.z,enemy)+enemy.height*.65+(enemy.hover??ENEMY_TYPES[enemy.type]?.hover??0),z:enemy.z+dz/length*(enemy.radius+.14)};
}
export function launchEnemyVolley(sim,enemy,target){
 const cfg=ENEMY_TYPES[enemy.type],profile=cfg.projectile||{},kind=profile.kind||'toxic',muzzle=enemyMuzzle(enemy,target),count=profile.count||1,speed=profile.speed||9;
 const center={x:enemy.x,y:muzzle.y,z:enemy.z},offset=Math.hypot(muzzle.x-center.x,muzzle.z-center.z),direction={x:(muzzle.x-center.x)/offset,y:0,z:(muzzle.z-center.z)/offset};
 if(sim.layout.raycast){const clear=sim.layout.raycast(center,direction,offset);if(clear<offset){muzzle.x=center.x+direction.x*Math.max(0,clear-.04);muzzle.z=center.z+direction.z*Math.max(0,clear-.04)}}
 const dx=target.x-muzzle.x,dy=groundHeight(target.x,target.z,target)+(target.y||0)+(target.eyeHeight||1.68)*.6-muzzle.y,dz=target.z-muzzle.z;
 const length=Math.hypot(dx,dy,dz)||1;
 for(let i=0;i<count;i++){
  const angle=(i-(count-1)/2)*(profile.spread||.12),c=Math.cos(angle),s=Math.sin(angle);
  const shot={id:sim.nextId++,sourceId:enemy.id,kind,...muzzle,spawnX:muzzle.x,spawnY:muzzle.y,spawnZ:muzzle.z,dx:(dx*c+dz*s)/length*speed,dy:dy/length*speed,dz:(dz*c-dx*s)/length*speed,life:0,damage:Math.round(enemy.damage/Math.pow(count,.65)),color:HOSTILE_SHOTS[kind].color,size:profile.size||.38,radius:.11};
  sim.projectiles.push(shot);sim.events.projectile?.({...shot});
 }
}
function actorHit(origin,delta,player,radius){
 const bottom=groundHeight(player.x,player.z,player)+(player.y||0),height=player.stance==='crouch'||player.stance==='slide'?1.05:1.8;
 const lo=[player.x-.35-radius,bottom-radius,player.z-.35-radius],hi=[player.x+.35+radius,bottom+height+radius,player.z+.35+radius];let entry=0,exit=1;
 for(const [a,key]of ['x','y','z'].entries()){if(Math.abs(delta[key])<1e-8){if(origin[key]<lo[a]||origin[key]>hi[a])return null;continue}let t0=(lo[a]-origin[key])/delta[key],t1=(hi[a]-origin[key])/delta[key];if(t0>t1)[t0,t1]=[t1,t0];entry=Math.max(entry,t0);exit=Math.min(exit,t1);if(entry>exit)return null}return entry;
}
export function advanceEnemyProjectile(shot,dt,layout,players){
 if(shot.dead)return null;
 const origin={x:shot.x,y:shot.y,z:shot.z},delta={x:shot.dx*dt,y:shot.dy*dt,z:shot.dz*dt},length=Math.hypot(delta.x,delta.y,delta.z);
 let fraction=1,hit=null,wall=false;
 if(length&&layout.raycast){const distance=layout.raycast(origin,{x:delta.x/length,y:delta.y/length,z:delta.z/length},length);if(distance<length){fraction=Math.max(0,(distance-.015)/length);wall=true}}
 else if(length){const steps=Math.ceil(length/.035);for(let i=1;i<=steps;i++){const t=i/steps;if(layout.blockedAtHeight(origin.x+delta.x*t,origin.y+delta.y*t,origin.z+delta.z*t,.05)){fraction=(i-1)/steps;wall=true;break}}}
 for(const player of players){if(player.hp<=0)continue;const t=actorHit(origin,delta,player,shot.radius||.11);if(t!==null&&t<fraction){fraction=t;hit=player;wall=false}}
 shot.x+=delta.x*fraction;shot.y+=delta.y*fraction;shot.z+=delta.z*fraction;shot.life+=dt;
 if(hit||wall||shot.life>4.5||!layout.raycast&&layout.blockedAtHeight(shot.x,shot.y,shot.z,.05))shot.dead=true;
 return hit;
}
