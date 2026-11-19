import {bunkerRoomAt} from './bunker-dressing-plan.js';
import { OutpostLayout, FlowField, SPAWNS, STATIONS, distance, zoneAt, groundHeight,activeMap,setActiveMap } from './layout.js';
import { NANOS, defaultLoadout, validateLoadout, resolveSquad } from './nanos.js';
export { NANOS } from './nanos.js';
import {loadFieldKit,validateFieldKit} from './field-kit.js';
import {WEAPONS,MELEE_WEAPONS,RARITIES,rollWeapon} from './weapons.js';
import {movementState,updateMovement} from './movement.js';
import {roundTuning} from './rounds.js';
export {WEAPONS,RARITIES};
import {ENEMY_TYPES} from './enemy-roster.js';
export {ENEMY_TYPES} from './enemy-roster.js';
import {planEnemyWave,takeEnemySpawn} from './enemy-director.js';
import {moveWithActors} from './actor-collision.js';
import {launchEnemyVolley,advanceEnemyProjectile,enemyWindup,enemyRecovery} from './enemy-attacks.js';

export class Survival {
  constructor(events={}){this.events=events;this.fieldKit=loadFieldKit();this.loadout=defaultLoadout();this.layout=new OutpostLayout();this.flow=new FlowField(this.layout);this.phase='menu';this.enemies=[];this.projectiles=[];this.drops=[];this.spawnQueue=[];this.wave=0;this.player=null;this.nextId=1;this.elapsed=0}
  selectMap(id){if(this.phase!=='menu')return false;setActiveMap(id);this.layout=new OutpostLayout();this.flow=new FlowField(this.layout);this.player=null;this.wave=0;this.enemies=[];this.spawnQueue=[];return true}
  start(){this.layout=new OutpostLayout();this.flow=new FlowField(this.layout);this.player={x:activeMap.start.x,z:activeMap.start.z,floorY:activeMap.start.floorY,y:0,vy:0,hp:100,maxHp:100,armor:0,invuln:0,hitAt:-10,credits:500,totalCredits:500,kills:0,energy:100,nano:0,cooldowns:[0,0,0],weapons:[this.createWeapon(this.fieldKit.gun)],meleeId:this.fieldKit.melee,meleeSerial:0,meleeWindup:0,weaponIndex:0,reloadTimer:0,reloadTotal:0,reloadSerial:0,...movementState(),isSprinting:false,sprintExhausted:false,moveSpeed:0,fireTimer:0,meleeTimer:0,sprint:1,revives:1,buffs:{speed:0,jump:0,stealth:0,shield:0,bonus:0,radar:0}};this.enemies=[];this.projectiles=[];this.drops=[];this.wave=0;this.nextId=1;this.elapsed=0;this.waveTime=0;this.spawnTimer=0;this.intermission=3;this.spawnQueue=[];this.power=false;this.extraction=false;this.box={phase:'idle',stationId:null,timer:0,offer:null};this.phase='playing';this.events.start?.();this.events.message?.('UPLINK ESTABLISHED · REACH WAVE 10 TO EXTRACT');}
  createWeapon(id,tier=0){const w=WEAPONS[id];return {id,tier,rarity:0,ammo:w.mag,reserve:w.reserve}}
  get equipped(){return this.player?.weapons[this.player.weaponIndex]}
  get weapon(){return WEAPONS[this.equipped?.id||'pistol']}
  addCredits(n){n=Math.round(n*(this.player.buffs?.bonus>0?1.5:1));this.player.credits+=n;this.player.totalCredits+=n;this.events.credits?.(n)}
  spend(n){if(this.player.credits<n){this.events.message?.(`NEED ${n-this.player.credits} MORE CREDITS`);return false}this.player.credits-=n;return true}
  beginWave(){this.wave++;this.waveTime=0;this.waveKind=this.wave%5===0?'ELITE BREACH':this.wave%4===0?'SURGE':this.wave>=3?'MIXED HORDE':'OUTBREAK';this.spawnQueue=planEnemyWave(this.wave,activeMap);this.spawnTimer=.1;this.events.wave?.(this.wave);}
  spawn(type){const cfg=ENEMY_TYPES[type],p=this.player;this.flow.update(p);const valid=SPAWNS.filter(s=>(s.zone===0||s.zone===1&&this.layout.unlocked.yard||s.zone===2&&this.layout.unlocked.garden)&&distance(s,p)>(activeMap.reference?7:15)&&!this.layout.blocked(s.x,s.z,.8,s)&&(!this.flow.reachable||this.flow.reachable(s)));let point=valid[Math.floor(Math.random()*valid.length)];if(!point){point=SPAWNS.filter(s=>s.zone===0&&(!this.flow.reachable||this.flow.reachable(s))).sort((a,b)=>distance(b,p)-distance(a,p))[0]}
    const tuning=roundTuning(this.wave),hp=Math.round(cfg.hp*tuning.health);const e={id:this.nextId++,type,x:point.x+(Math.random()-.5),z:point.z+(Math.random()-.5),floorY:point.floorY,y:0,hp,maxHp:hp,speed:cfg.speed+tuning.speed*(cfg.elite?.45:1),damage:Math.round(cfg.damage*tuning.damage),radius:Math.min(cfg.radius,activeMap.reference?.5:Infinity),height:Math.min(cfg.height,activeMap.enemyHeightCap||Infinity),hover:cfg.hover||0,state:'move',timer:0,stun:0,flash:0,attackCooldown:Math.random()*1.5,spawnTime:this.elapsed,pathTimer:0,dead:false};if(this.layout.blocked(e.x,e.z,.7,e)||Math.abs(this.layout.height(e.x,e.z,e)-this.layout.height(point.x,point.z,point))>.4){e.x=point.x;e.z=point.z}this.enemies.push(e);this.events.spawn?.(e);return e}
  update(dt,input={x:0,z:0,sprint:false,jump:false}){if(this.phase!=='playing')return;dt=Math.min(dt,.05);const p=this.player;this.elapsed+=dt;this.waveTime+=dt;p.invuln=Math.max(0,p.invuln-dt);p.fireTimer=Math.max(0,p.fireTimer-dt);p.meleeTimer=Math.max(0,p.meleeTimer-dt);this.updateMelee(dt);p.energy=Math.min(100,p.energy+dt*2.0);p.cooldowns=p.cooldowns.map(c=>Math.max(0,c-dt));for(const key of Object.keys(p.buffs))p.buffs[key]=Math.max(0,p.buffs[key]-dt);
    if(p.reloadTimer>0){p.reloadTimer-=dt;if(p.reloadTimer<=0){const w=this.equipped,mag=this.magSize(w),amount=Math.min(mag-w.ammo,w.reserve);w.ammo+=amount;w.reserve-=amount;p.reloadTimer=0;this.events.reloadEnd?.()}}
    if(this.elapsed-p.hitAt>6&&p.hp<p.maxHp)p.hp=Math.min(p.maxHp,p.hp+dt*6);
    updateMovement(p,input,this.layout,dt,this.events,this.enemies);this.updateBox(dt);
    this.flow.update(p);
    if(this.intermission>0){this.intermission-=dt;if(this.intermission<=0){this.intermission=0;this.beginWave()}}
    else if(this.spawnQueue.length&&this.enemies.filter(e=>!e.dead).length<22){this.spawnTimer-=dt;if(this.spawnTimer<=0){const type=takeEnemySpawn(this.spawnQueue,this.enemies);if(type)this.spawn(type);this.spawnTimer=roundTuning(this.wave).interval}}
    for(const e of this.enemies){e.timer+=dt;e.flash=Math.max(0,e.flash-dt);if(e.dead)continue;e.attackCooldown=Math.max(0,e.attackCooldown-dt);if(e.stun>0){e.stun-=dt;e.state='stunned';if(e.stun<=0){e.state='move';e.timer=0}continue}
      const cfg=ENEMY_TYPES[e.type],d=distance(e,p),altitude=Math.abs(groundHeight(e.x,e.z,e)-groundHeight(p.x,p.z,p)-p.y);if(e.slow>0)e.slow=Math.max(0,e.slow-dt);if(p.buffs.stealth>0){e.state='search';continue}
      if(e.state==='windup'){if(e.timer>=enemyWindup(cfg)){if(cfg.ranged&&d<23&&this.layout.clearSight(e,p,.1)){launchEnemyVolley(this,e,p);}else if(d<e.radius+(cfg.slam?3.1:1.6)&&altitude<1.8&&this.layout.clearSight(e,p,.05))this.hurt(e.damage,e);e.state='recover';e.timer=0;e.attackCooldown=enemyRecovery(cfg)}}
      else if(e.state==='recover'){if(e.timer>.6){e.state='move';e.timer=0}}
      else if((d<e.radius+(cfg.slam?2.7:1.15)&&altitude<1.8&&this.layout.clearSight(e,p,.05)||cfg.ranged&&d<18&&d>4&&this.layout.clearSight(e,p,.2))&&e.attackCooldown<=0){e.state='windup';e.timer=0;this.events.windup?.(e)}
      else{e.state='move';if(d>e.radius+.65||altitude>1.8){const dir=this.flow.direction(e,p);let sx=0,sz=0;for(const other of this.enemies){if(other===e||other.dead||Math.abs(groundHeight(other.x,other.z,other)-groundHeight(e.x,e.z,e))>1.5)continue;const dd=distance(other,e),limit=e.radius+other.radius;if(dd<limit&&dd>.01){sx+=(e.x-other.x)/dd*(limit-dd)*2;sz+=(e.z-other.z)/dd*(limit-dd)*2}}moveWithActors(this.layout,e,(dir.x*e.speed*(e.slow>0?.35:1)+sx)*dt,(dir.z*e.speed*(e.slow>0?.35:1)+sz)*dt,Math.min(e.radius,.65),false,[p])}}}
    for(const b of this.projectiles){if(b.dead)continue;const hit=advanceEnemyProjectile(b,dt,this.layout,[p]);if(hit)this.hurt(b.damage,b);if(b.dead)this.events.projectileImpact?.({...b})}this.projectiles=this.projectiles.filter(b=>!b.dead);
    for(const drop of this.drops){if(drop.dead)continue;drop.life-=dt;if(drop.life<=0)drop.dead=true;else if(distance(drop,p)<2&&Math.abs(groundHeight(drop.x,drop.z,drop)-groundHeight(p.x,p.z,p)-p.y)<1.5){drop.dead=true;this.pickup(drop)}}
    if(this.enemies.length>80)this.enemies=this.enemies.filter(e=>!e.dead||this.elapsed-e.deathTime<2);
    if(!this.intermission&&!this.spawnQueue.length&&!this.enemies.some(e=>!e.dead)){this.intermission=11;this.addCredits(150+this.wave*25);p.energy=Math.min(100,p.energy+22);if(this.wave>=10)this.extraction=true;this.events.waveClear?.(this.wave)}
  }
  magSize(w=this.equipped){return Math.round(WEAPONS[w.id].mag*(w.tier>0?1.4:1))}
  fire(){if(this.phase!=='playing'||this.player.reloadTimer>0||this.player.fireTimer>0||this.player.meleeTimer>Math.max(0,this.meleeWeapon.cooldown-this.meleeWeapon.duration))return null;const p=this.player,w=this.equipped,cfg=this.weapon;if(w.ammo<=0){this.reload();return null}w.ammo--;p.fireTimer=cfg.interval*(w.tier>0?.9:1);const shot={...cfg,damage:cfg.damage*(1+w.tier*.9)*RARITIES[w.rarity||0].damage,tier:w.tier};this.events.fire?.(shot);return shot}
  reload(){const p=this.player,w=this.equipped;if(this.phase!=='playing'||p.reloadTimer>0||w.ammo>=this.magSize(w)||w.reserve<=0)return false;p.reloadTimer=this.weapon.reload*(w.tier>1?.8:1);p.reloadTotal=p.reloadTimer;p.reloadSerial++;this.events.reload?.(p.reloadTimer);return true}
  switchWeapon(){const p=this.player;if(this.phase!=='playing'||p.weapons.length<2)return false;p.weaponIndex=(p.weaponIndex+1)%p.weapons.length;p.reloadTimer=0;p.fireTimer=.3;this.events.weapon?.(this.equipped);return true}
  damageEnemy(e,amount,critical=false,source='gun'){if(e.dead)return;if(e.sleep){e.sleep=false;e.stun=0}const actual=Math.round(amount*(critical?1.6:1));e.hp-=actual;e.flash=.12;if(source==='gun'){this.addCredits(8);this.player.energy=Math.min(100,this.player.energy+1)}this.events.hit?.(e,actual,critical);if(e.hp<=0)this.kill(e,critical);return actual}
  kill(e,critical=false){if(e.dead)return;e.dead=true;e.deathTime=this.elapsed;e.state='dead';this.player.kills++;const reward=ENEMY_TYPES[e.type].reward+(critical?25:0);this.addCredits(reward);this.player.energy=Math.min(100,this.player.energy+4);this.events.kill?.(e,reward);if(Math.random()<.1||ENEMY_TYPES[e.type].elite){const type=ENEMY_TYPES[e.type].elite?'ammo':Math.random()<.5?'health':'ammo';const drop={id:this.nextId++,x:e.x,z:e.z,floorY:e.floorY,type,life:22,dead:false};this.drops.push(drop);this.events.drop?.(drop)}}
  hurt(amount,source){const p=this.player;if(this.phase!=='playing'||p.invuln>0)return false;if(p.armor>0){const absorbed=Math.min(p.armor,amount*.6);p.armor-=absorbed;amount-=absorbed}if(p.buffs.shield>0)amount*=.5;p.hp=Math.max(0,p.hp-amount);p.hitAt=this.elapsed;p.invuln=.65;this.events.hurt?.(amount,source);if(p.hp<=0){if(p.revives>0){p.revives--;p.hp=55;p.invuln=5;for(const e of this.enemies){if(!e.dead&&distance(e,p)<10)e.stun=4}this.events.revive?.();this.events.message?.('NANO EMERGENCY REVIVE · LAST CHANCE')}else this.finish(false)}return true}
  get squad(){return resolveSquad(this.loadout)}
  setLoadout(entries){if(this.phase==='playing'||this.phase==='shopping')return false;this.loadout=validateLoadout(entries);this.events.loadout?.(this.squad);return true}
  useNano(yaw){
    if(this.phase!=='playing')return false;
    const p=this.player,index=p.nano,n=this.squad[index];
    if(p.cooldowns[index]>0){this.events.message?.(`${n.name.toUpperCase()} RECHARGING · ${Math.ceil(p.cooldowns[index])}s`);return false}
    if(p.energy<n.cost){this.events.message?.('INSUFFICIENT NANO ENERGY');return false}
    if(n.kind==='heal'&&p.hp>=p.maxHp){this.events.message?.('HEALTH ALREADY FULL');return false}
    p.energy-=n.cost;p.cooldowns[index]=n.cooldown;
    const targets=this.enemies.filter(e=>{
      if(e.dead)return false;const dx=e.x-p.x,dz=e.z-p.z,d=Math.hypot(dx,dz),dot=(dx*-Math.sin(yaw)+dz*-Math.cos(yaw))/(d||1);
      const aimed=n.targeting==='point'?d<40&&dot>.91:n.targeting==='cone'?d<16&&dot>.25:d<10;
      return aimed&&this.layout.clearSight(p,e,.1);
    }).sort((a,b)=>distance(a,p)-distance(b,p));
    if(n.targeting==='point')targets.splice(1);
    switch(n.kind){
      case 'stun':for(const e of targets){e.stun=ENEMY_TYPES[e.type].elite?2.5:5;this.damageEnemy(e,20,false,'nano')}break;
      case 'sleep':for(const e of targets){e.stun=ENEMY_TYPES[e.type].elite?3:8;e.sleep=true}break;
      case 'snare':for(const e of targets){e.slow=8;this.damageEnemy(e,30,false,'nano')}break;
      case 'damage':for(const e of targets)this.damageEnemy(e,125+this.wave*6,false,'nano');break;
      case 'drain':for(const e of targets){this.damageEnemy(e,85+this.wave*4,false,'nano');p.hp=Math.min(p.maxHp,p.hp+25)}break;
      case 'heal':p.hp=Math.min(p.maxHp,p.hp+65);break;
      case 'speed':p.buffs.speed=14;break;
      case 'jump':p.buffs.jump=18;break;
      case 'stealth':p.buffs.stealth=8;break;
      case 'shield':p.buffs.shield=12;p.armor=Math.min(100,p.armor+25);break;
      case 'recall':p.x=activeMap.start.x;p.z=activeMap.start.z;p.floorY=activeMap.start.floorY;p.y=0;p.vy=0;p.invuln=2;break;
      case 'revive':if(p.revives<1)p.revives=1;else p.hp=Math.min(p.maxHp,p.hp+45);break;
      case 'cleanse':p.invuln=2.5;p.hitAt=-10;p.hp=Math.min(p.maxHp,p.hp+20);break;
      case 'energy':p.energy=Math.min(100,p.energy+50);if(n.subtype==='bonus'||n.subtype==='scavenge')p.buffs.bonus=25;if(n.subtype==='radar'||n.subtype==='treasure')p.buffs.radar=30;break;
      default:p.buffs.shield=8;
    }
    this.events.nano?.(index,n);this.events.message?.(`${n.name} · ${n.power}`);return true;
  }
  selectNano(index){if(index<0||index>2||!this.player||this.player.nano===index)return;this.player.nano=index;this.events.nanoSelect?.(index)}
  get meleeWeapon(){return MELEE_WEAPONS[this.player?.meleeId]||MELEE_WEAPONS.fists}
  setFieldKit(value){if(this.phase==='playing'||this.phase==='shopping')return false;this.fieldKit=validateFieldKit(value);this.events.kit?.(this.fieldKit);return true}
  melee(yaw){const p=this.player;if(this.phase!=='playing'||p.meleeTimer>0||p.hp<=0)return false;const cfg=this.meleeWeapon;p.meleeTimer=cfg.cooldown;p.meleeWindup=cfg.windup;p.meleeYaw=yaw;p.meleeSerial++;p.reloadTimer=0;this.events.melee?.(p.meleeId);return true}
  updateMelee(dt){const p=this.player;if(!p||p.meleeWindup<=0)return;p.meleeWindup=Math.max(0,p.meleeWindup-dt);if(p.meleeWindup>0||p.hp<=0)return;const cfg=this.meleeWeapon,hits=[];for(const e of this.enemies){if(e.dead)continue;const d=distance(e,p),dot=((e.x-p.x)*-Math.sin(p.meleeYaw)+(e.z-p.z)*-Math.cos(p.meleeYaw))/(d||1);if(d<cfg.reach&&Math.abs(groundHeight(e.x,e.z,e)-groundHeight(p.x,p.z,p)-p.y)<2&&dot>cfg.arc&&this.layout.clearSight(p,e,.1)){this.damageEnemy(e,cfg.damage,false,'melee');e.stun=cfg.style==='heavy'?1.1:.55;hits.push({x:e.x,y:groundHeight(e.x,e.z,e)+e.height*.6,z:e.z})}}this.events.meleeImpact?.(p.meleeId,hits)}
  stationAvailable(s){if(s.zone===1&&!this.layout.unlocked.yard||s.zone===2&&!this.layout.unlocked.garden)return false;if(s.kind==='gate'&&this.layout.unlocked[s.unlock])return false;if(s.kind==='power'&&this.power)return false;return true}
  nearestStation(yaw){let near=null,d=3.2;for(const s of STATIONS){if(!this.stationAvailable(s))continue;const dd=distance(s,this.player);if(Math.abs(groundHeight(s.x,s.z,s)-groundHeight(this.player.x,this.player.z,this.player)-this.player.y)>1.7)continue;if(yaw!==undefined&&dd>.8&&((s.x-this.player.x)*-Math.sin(yaw)+(s.z-this.player.z)*-Math.cos(yaw))/dd<.45)continue;if(activeMap.reference&&!this.layout.clearSight(this.player,s,.01))continue;if(dd<d){d=dd;near=s}}return near}
  interact(s=this.nearestStation()){if(this.phase!=='playing'||!s||!this.stationAvailable(s))return false;
    if(s.kind==='ammo')return this.refillHeld();if(s.kind==='armor')return this.buySupply('armor');if(s.kind==='armory'){this.events.armory?.();return true}
    if(s.kind==='gate'){if(s.unlock==='garden'&&!this.power){this.events.message?.(`RESTORE POWER IN ${activeMap.zones[1]} FIRST`);return false}if(!this.spend(s.cost))return false;this.layout.unlock(s.unlock);this.events.unlock?.(s.unlock);this.events.message?.(`${activeMap.zones[s.unlock==='yard'?1:2]} ROUTES UNLOCKED`);return true}
    if(s.kind==='power'){this.power=true;this.events.power?.();this.events.message?.(`POWER ONLINE / ${activeMap.zones[2]} ACCESS AVAILABLE`);return true}
    if(s.kind==='wall'||s.kind==='weapon'){const offer=this.wallOffer(s),held=this.player.weapons.find(w=>w.id===s.weapon);if(offer.owned&&!offer.upgrade&&held.ammo===this.magSize(held)&&held.reserve===WEAPONS[s.weapon].reserve){this.events.message?.('WALL WEAPON AMMUNITION FULL');return false}if(!this.spend(offer.cost))return false;this.giveWeapon(s.weapon,offer.rarity);this.events.message?.(offer.owned?'WALL AMMUNITION REPLENISHED':WEAPONS[s.weapon].name.toUpperCase()+' ACQUIRED');return true}
    if(s.kind==='mystery')return this.interactBox(s);
    if(s.kind==='upgrade'){if(this.equipped.tier>=2){this.events.message?.('WEAPON FULLY UPGRADED');return false}if(!this.power){this.events.message?.('POWER REQUIRED');return false}if(!this.spend(s.cost))return false;this.equipped.tier++;this.equipped.ammo=this.magSize();this.equipped.reserve=this.weapon.reserve;this.events.weapon?.(this.equipped);this.events.upgrade?.();this.events.message?.(`WEAPON OVERCHARGED · TIER ${this.equipped.tier+1}`);return true}
    if(s.kind==='nano'){if(!this.spend(s.cost))return false;this.player.energy=100;this.player.cooldowns=[0,0,0];this.events.message?.('NANO SQUAD FULLY RECHARGED');return true}
    if(s.kind==='evac'){if(!this.extraction){this.events.message?.('HOLD UNTIL WAVE 10 IS CLEARED TO EXTRACT');return false}this.finish(true);return true}return false}
  wallOffer(s){const owned=this.player.weapons.find(w=>w.id===s.weapon),available=Math.min(3,Math.floor(this.wave/10)),rarity=Math.max(owned?.rarity||0,available),upgrade=!!owned&&rarity>(owned.rarity||0);return {owned:!!owned,upgrade,rarity,cost:owned&&!upgrade?Math.round(s.cost*.35):s.cost}}
  refillHeld(){const w=this.equipped,cost=Math.round(250*(1+w.tier*.4+(w.rarity||0)*.15));if(w.ammo===this.magSize(w)&&w.reserve===this.weapon.reserve){this.events.message?.('AMMUNITION ALREADY FULL');return false}if(!this.spend(cost))return false;w.ammo=this.magSize(w);w.reserve=this.weapon.reserve;this.player.reloadTimer=0;this.events.message?.('HELD WEAPON REPLENISHED');return true}
  interactBox(s){const box=this.box;if(box.phase==='rolling')return false;if(box.phase==='ready'){if(box.stationId!==s.id)return false;this.giveWeapon(box.offer.id,box.offer.rarity);this.events.message?.(RARITIES[box.offer.rarity].name+' / '+WEAPONS[box.offer.id].name);box.phase='idle';box.timer=0;box.offer=null;this.events.boxTake?.();return true}if(!this.spend(950))return false;box.stationId=s.id;box.offer=rollWeapon(this.wave,this.player.weapons.map(w=>w.id));box.phase='rolling';box.timer=3.1;this.events.boxRoll?.();return true}
  updateBox(dt){if(!this.box||this.box.phase==='idle')return;this.box.timer-=dt;if(this.box.timer<=0){if(this.box.phase==='rolling'){this.box.phase='ready';this.box.timer=12;this.events.boxReady?.(this.box.offer)}else{this.box.phase='idle';this.box.offer=null;this.box.timer=0;this.events.message?.('SUPPLY BOX OFFER EXPIRED')}}}
  stationPrompt(s){if(s.kind==='wall'||s.kind==='weapon'){const offer=this.wallOffer(s);return {title:WEAPONS[s.weapon].name,detail:offer.upgrade?`Upgrade to ${RARITIES[offer.rarity].name} / ${offer.cost} taros`:offer.owned?`Refill ammunition / ${offer.cost} taros`:`${RARITIES[offer.rarity].name} / ${offer.cost} taros`}}if(s.kind==='mystery'){const box=this.box;if(box.stationId===s.id&&box.phase==='rolling')return {title:'SUPPLY BOX ROLLING',detail:`Revealing in ${box.timer.toFixed(1)}s`};if(box.stationId===s.id&&box.phase==='ready')return {title:'TAKE '+WEAPONS[box.offer.id].name,detail:`${RARITIES[box.offer.rarity].name} / Replaces held slot / ${Math.ceil(box.timer)}s`};return {title:'ROLL SUPPLY BOX',detail:'Random weapon / 950 taros'}}if(s.kind==='ammo')return {title:'AMMO CACHE',detail:`Refill held weapon / ${Math.round(250*(1+this.equipped.tier*.4+(this.equipped.rarity||0)*.15))} taros`};return {title:s.label,detail:s.sub.replaceAll('credits','taros')}}
  buyWeapon(id,cost=WEAPONS[id].cost){if(!this.spend(cost))return false;this.giveWeapon(id);this.events.message?.(`${WEAPONS[id].name.toUpperCase()} ACQUIRED`);return true}
  giveWeapon(id,rarity=0){const p=this.player;let index=p.weapons.findIndex(w=>w.id===id);if(index>=0){p.weaponIndex=index;p.weapons[index].ammo=this.magSize(p.weapons[index]);p.weapons[index].reserve=WEAPONS[id].reserve;p.weapons[index].rarity=Math.max(p.weapons[index].rarity||0,rarity)}else if(p.weapons.length<2){p.weapons.push({...this.createWeapon(id),rarity});p.weaponIndex=p.weapons.length-1}else{p.weapons[p.weaponIndex]={...this.createWeapon(id),rarity}}p.reloadTimer=0;p.fireTimer=.3;this.events.weapon?.(this.equipped)}
  buySupply(kind){if(kind==='ammo'){if(!this.spend(250))return false;for(const w of this.player.weapons){w.ammo=this.magSize(w);w.reserve=WEAPONS[w.id].reserve}this.player.reloadTimer=0;this.events.message?.('ALL WEAPONS REPLENISHED');return true}if(kind==='armor'){if(this.player.armor>=75){this.events.message?.('ARMOR ALREADY FULL');return false}if(!this.spend(500))return false;this.player.armor=75;this.events.message?.('ARMOR PLATING EQUIPPED');return true}return false}
  pickup(drop){if(drop.type==='health'){this.player.hp=Math.min(this.player.maxHp,this.player.hp+35);this.events.message?.('HEALTH RECOVERED +35')}else{for(const w of this.player.weapons)w.reserve=Math.min(WEAPONS[w.id].reserve,w.reserve+Math.round(WEAPONS[w.id].reserve*.4));this.events.message?.('AMMUNITION RECOVERED')}this.events.pickup?.(drop)}
  finish(victory){if(this.phase==='result')return;this.phase='result';this.events.finish?.({victory,wave:this.wave,kills:this.player.kills,credits:this.player.totalCredits,time:this.elapsed})}
  get remaining(){return this.spawnQueue.length+this.enemies.filter(e=>!e.dead).length}
  get zone(){return activeMap.reference?bunkerRoomAt(this.player).name:activeMap.zones[zoneAt(this.player.x,this.player.z)]}
}
