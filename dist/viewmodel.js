const lerp=(a,b,t)=>a+(b-a)*t;
const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
function sample(keys,t){if(t<=keys[0][0])return keys[0].slice(1);for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const a=keys[i-1],b=keys[i],u=ease((t-a[0])/(b[0]-a[0]));return b.slice(1).map((v,j)=>lerp(a[j+1],v,u))}return keys.at(-1).slice(1)}
export function reloadPose(progress,weapon='rifle'){
 const p=Math.max(0,Math.min(1,progress));
 const gun=sample([[0,0,0,0,0,0,0],[.13,-.055,-.045,.045,.08,-.1,-.38],[.32,-.07,-.055,.07,.12,-.16,-.48],[.58,-.06,-.045,.055,.1,-.13,-.44],[.76,-.05,-.025,.045,.08,-.08,-.3],[.88,-.025,.005,.015,-.05,.025,-.12],[1,0,0,0,0,0,0]],p);
 const grip=weapon==='pistol'?[-.28,-.55,.08]:[-.075,.09,-.21];
 const hand=sample([[0,...grip],[.14,-.035,.025,.1],[.27,-.06,-.12,.13],[.42,-.28,-.55,.08],[.56,-.15,-.28,.13],[.72,-.025,.045,.09],[.84,-.035,.23,.12],[1,...grip]],p);
 return {position:gun.slice(0,3),rotation:gun.slice(3),hand,cellVisible:p>.24&&p<.73,phase:p<.15?'lower':p<.43?'remove':p<.73?'insert':p<.9?'chamber':'ready'};
}
export class ViewModelMotion {
 constructor(){this.reset()}
 reset(){this.move=0;this.run=0;this.aim=0;this.phase=0;this.recoil=0;this.recoilVelocity=0;this.swayX=0;this.swayY=0;this.melee=0;this.landing=0;this.lastAirborne=false;this.swap=0}
 fire(weapon){this.recoilVelocity+=weapon==='shotgun'?2.8:weapon==='cannon'?3.2:1.55}
 strike(){this.melee=1}
 switchWeapon(){this.swap=1}
 update(dt,{weapon='pistol',moving=false,sprinting=false,aiming=false,reloadTimer=0,reloadTotal=1,lookX=0,lookY=0,airborne=false,motion=1,weaponTop=.4,crouch=0,slide=0}={}){
  dt=Math.min(dt,.05);const reloading=reloadTimer>0;
  this.move=damp(this.move,moving?1:0,8,dt);this.run=damp(this.run,sprinting&&!reloading&&!aiming?1:0,9,dt);this.aim=damp(this.aim,aiming&&!reloading&&!sprinting?1:0,14,dt);this.phase+=dt*lerp(8.5,12,this.run);
  this.swayX=damp(this.swayX,Math.max(-.025,Math.min(.025,-lookX*.0005)),10,dt);this.swayY=damp(this.swayY,Math.max(-.018,Math.min(.018,lookY*.0004)),10,dt);
  this.recoilVelocity+=(-this.recoil*160-this.recoilVelocity*22)*dt;this.recoil+=this.recoilVelocity*dt;
  this.melee=Math.max(0,this.melee-dt*3.5);this.swap=Math.max(0,this.swap-dt*4);if(this.lastAirborne&&!airborne)this.landing=.04;this.lastAirborne=airborne;this.landing=damp(this.landing,0,11,dt);
  const bob=this.move*(airborne?.15:1)*(1-this.aim*.9)*(1+this.run*.8)*motion;
  const x=lerp(.28,0,this.aim)+Math.sin(this.phase)*.009*bob+this.swayX*motion;
  const y=lerp(-.44,-weaponTop-.045,this.aim)+Math.cos(this.phase*2)*.009*bob+this.swayY*motion-this.landing*motion;
  const position=[x+this.run*.1,y-this.run*.12-this.swap*.2,-.67+this.run*.09+this.recoil*.85-this.melee*.28];
  position[0]+=slide*.08;position[1]-=crouch*.025+slide*.1;const rotation=[-this.recoil*1.2-this.run*.12+Math.cos(this.phase*2)*.012*bob,this.run*.28-this.swayX*1.5*motion,-this.run*.37+Math.sin(this.phase)*.025*bob-slide*.22];
  const progress=reloading?1-Math.max(0,Math.min(1,reloadTimer/Math.max(.01,reloadTotal))):1;
  const reload=reloadPose(progress,weapon);if(reloading)for(let i=0;i<3;i++){position[i]+=reload.position[i];rotation[i]+=reload.rotation[i]}
  return {position,rotation,aim:this.aim,run:this.run,move:this.move,reload:reloading?reload:null,reloadProgress:reloading?progress:0,muzzleOpacity:Math.min(1,Math.max(0,this.recoil*7))};
 }
}
