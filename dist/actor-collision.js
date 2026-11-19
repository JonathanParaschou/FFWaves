import {PLAYER_SCALE} from './player-scale.js';
const live=actor=>!actor.dead&&(actor.hp===undefined||actor.hp>0);
export function actorBody(actor,layout,radius=actor.radius??PLAYER_SCALE.radius){
 const floor=layout.height(actor.x,actor.z,actor),bottom=floor+(actor.y||0)+(actor.hover||0);
 return {radius,bottom,top:bottom+(actor.height??(actor.stance==='crouch'||actor.stance==='slide'?1.05:PLAYER_SCALE.height))};
}
export function bodiesOverlap(a,b,layout,radius){
 if(!live(b)||a===b)return false;
 const aa=actorBody(a,layout,radius),bb=actorBody(b,layout);
 return aa.bottom<bb.top-.05&&aa.top>bb.bottom+.05&&Math.hypot(a.x-b.x,a.z-b.z)<aa.radius+bb.radius-.001;
}
// Sweep small steps, project contacts onto the body boundary, and let map
// collision resolve the tangent. Actors never push the player through a wall.
export function moveWithActors(layout,actor,dx,dz,radius,drop,blockers=[]){
 const others=blockers.filter(b=>b!==actor&&live(b));
 if(!others.length){layout.move(actor,dx,dz,radius,drop);return}
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
 for(let i=0;i<steps;i++){
  const before={x:actor.x,z:actor.z,floorY:actor.floorY,y:actor.y};
  layout.move(actor,dx/steps,dz/steps,radius,drop);
  for(let pass=0;pass<3;pass++)for(const other of others){
   if(!bodiesOverlap(actor,other,layout,radius))continue;
   let nx=actor.x-other.x,nz=actor.z-other.z,length=Math.hypot(nx,nz);
   if(length<.00001){nx=before.x-other.x;nz=before.z-other.z;length=Math.hypot(nx,nz);if(length<.00001){nx=-dx||1;nz=-dz;length=Math.hypot(nx,nz)}}
   const limit=radius+(other.radius??PLAYER_SCALE.radius)+.001;
   layout.move(actor,other.x+nx/length*limit-actor.x,other.z+nz/length*limit-actor.z,radius,drop);
  }
  if(others.some(b=>bodiesOverlap(actor,b,layout,radius)))Object.assign(actor,before);
 }
}
