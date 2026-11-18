import {referenceFixtures} from './reference-fixtures.js';
import {fixtureBlocksNode,dressedReferenceHeight,containsBrush,nearbyBrushes,brushRay} from './reference-geometry.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class ReferenceLayout{
 constructor(map){this.map=map;this.data=map.reference.data;this.bounds=map.bounds;this.unlocked={yard:true,garden:true};this.fixtures=referenceFixtures(map).boxes;this.navBlocked=new Uint8Array(this.data.nav.nodes.length);for(const [i,n]of this.data.nav.nodes.entries())this.navBlocked[i]=this.fixtures.some(b=>fixtureBlocksNode(b,n))?1:0;this.obstacles=[];this.revision=0;this.refresh()}
 refresh(){this.closed=new Set();for(const gate of this.map.gates)if(!this.unlocked[gate.unlock])for(const id of gate.brushIds)this.closed.add(id);this.closedBrushes=this.data.brushes.filter(b=>this.closed.has(b.id)).concat(this.fixtures);this.revision++}
 active(brush){return !brush.movable||this.closed.has(brush.id)}
 unlock(key){this.unlocked[key]=true;this.refresh()}
 height(x,z,level){return dressedReferenceHeight(this.map,x,z,level)}
 inBounds(x,z,pad=0){const b=this.bounds;return x>=b.minX+pad&&x<=b.maxX-pad&&z>=b.minZ+pad&&z<=b.maxZ-pad}
 bodyBlocked(x,z,floor,radius=.35,height=1.8){for(const b of [...nearbyBrushes(this.data,x,z,radius),...this.fixtures])if(this.active(b)&&b.max[1]>floor+.4501&&b.min[1]<floor+height-.015&&x>=b.min[0]-radius&&x<=b.max[0]+radius&&z>=b.min[2]-radius&&z<=b.max[2]+radius&&containsBrush(b,x,floor+(height+.45)/2,z,radius,(height-.45)/2,.004))return true;return false}
 blocked(x,z,pad=.4,level){const y=this.height(x,z,level);return !this.inBounds(x,z)||this.bodyBlocked(x,z,y,Math.min(.35,pad))}
 terrainBlocked(x,z,pad=0){return !this.inBounds(x,z,pad)}
 canStep(a,x,z,pad=.4,drop=false){const old=this.height(a.x,a.z,a.floorY),next=this.height(x,z,old+(a.y||0));return this.inBounds(x,z)&&next-old<=.36+(drop?(a.y||0):0)&&(drop||next-old>=-.4)&&!this.bodyBlocked(x,z,Math.max(next,old+(a.y||0)),Math.min(.35,pad),a.stance==='crouch'||a.stance==='slide'?1.05:1.8)}
 move(entity,dx,dz,radius=.4,drop=false){
  entity.floorY=this.height(entity.x,entity.z,entity.floorY);
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
  const step=(x,z)=>{const old=entity.floorY;if(!this.canStep(entity,x,z,radius,drop))return;const next=this.height(x,z,old+(entity.y||0));entity.x=x;entity.z=z;entity.floorY=next;if(drop&&next>old&&entity.y>0)entity.y=Math.max(0,entity.y-(next-old));else if(drop&&old-next>.4)entity.y=(entity.y||0)+old-next};
  for(let i=0;i<steps;i++){step(entity.x+dx/steps,entity.z);step(entity.x,entity.z+dz/steps)}
 }

 resolveVertical(p){if(p.y<=0)return;const height=p.stance==='stand'?1.8:1.05;if(!this.bodyBlocked(p.x,p.z,p.floorY+p.y,.35,height))return;let lo=0,hi=p.y;for(let i=0;i<9;i++){const mid=(lo+hi)/2;if(this.bodyBlocked(p.x,p.z,p.floorY+mid,.35,height))hi=mid;else lo=mid}p.y=lo;p.vy=Math.min(0,p.vy)}
 blockedAtHeight(x,y,z,pad=.01){if(!this.inBounds(x,z))return true;for(const b of [...nearbyBrushes(this.data,x,z,pad),...this.fixtures])if(this.active(b)&&containsBrush(b,x,y,z,pad))return true;return false}
 raycast(origin,dir,range){let nearest=range;for(const b of [...this.data.brushes,...this.fixtures])if(b.solid&&this.active(b)){const hit=brushRay(b,origin,dir,nearest);if(hit!==null)nearest=hit}return nearest}
 gateBlocks(a,b){for(const brush of this.closedBrushes){if(Math.min(a.x,b.x)>brush.max[0]+.36||Math.max(a.x,b.x)<brush.min[0]-.36||Math.min(a.z,b.z)>brush.max[2]+.36||Math.max(a.z,b.z)<brush.min[2]-.36||Math.min(a.y,b.y)+.45>brush.max[1]||Math.max(a.y,b.y)+1.8<brush.min[1])continue;for(const t of [0,.5,1])if(containsBrush(brush,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t+.9,a.z+(b.z-a.z)*t,.36,.8))return true}return false}
 clearSight(a,b,pad=.01){const ay=this.height(a.x,a.z,a)+(a.y||0)+(a.height||1.7)*.65,by=this.height(b.x,b.z,b)+(b.y||0)+(b.height||1.7)*.65,dx=b.x-a.x,dz=b.z-a.z,dy=by-ay,length=Math.hypot(dx,dy,dz);return length<.01||this.raycast({x:a.x,y:ay,z:a.z},{x:dx/length,y:dy/length,z:dz/length},length)>=length-.05}
 clearLine(a,b,pad=.05){return this.clearSight(a,b,pad)}
 clearWalk(a,b,pad=.38){const steps=Math.max(1,Math.ceil(dist(a,b)/.12));let y=this.height(a.x,a.z,a);for(let i=1;i<=steps;i++){const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,next=this.height(x,z,y);if(Math.abs(next-y)>.36||this.bodyBlocked(x,z,next,Math.min(.35,pad)))return false;y=next}return Math.abs(y-this.height(b.x,b.z,b))<.4}
}
export class ReferenceFlowField{
 constructor(layout){this.layout=layout;this.nodes=layout.data.nav.nodes;this.nav=layout.data.nav;this.bounds=layout.bounds;this.field=new Int32Array(this.nodes.length);this.revision=-1;this.target=-1;this.cell=this.nav.cell;this.columns=this.nav.columns;this.nearestCache=new Map()}
 index(x,z,level=0){const n=this.nav,ix=Math.floor((x-n.originX)/n.cell),iz=Math.floor((z-n.originZ)/n.cell);let best=-1,cost=Infinity;for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){const xx=ix+dx,zz=iz+dz;if(xx<0||zz<0||xx>=n.cols||zz>=n.rows)continue;for(const id of this.columns[zz*n.cols+xx]||[]){if(this.layout.navBlocked[id])continue;const p=this.nodes[id],d=Math.hypot(x-p.x,z-p.z)+Math.abs(p.y-level)*4;if(d<cost){best=id;cost=d}}}if(best>=0)return best;for(let i=0;i<this.nodes.length;i++){if(this.layout.navBlocked[i])continue;const p=this.nodes[i],d=dist(p,{x,z})+Math.abs(p.y-level)*4;if(d<cost){best=i;cost=d}}return best}
 center(i){const n=this.nodes[i];return {x:n.x,z:n.z,floorY:n.y}}
 update(player){const target=this.index(player.x,player.z,this.layout.height(player.x,player.z,player));if(this.revision===this.layout.revision&&this.target===target)return;if(this.revision!==this.layout.revision)this.links=this.nodes.map(a=>a.links.filter(id=>!this.layout.gateBlocks(a,this.nodes[id])));this.revision=this.layout.revision;this.target=target;this.field.fill(-1);const queue=new Int32Array(this.nodes.length);let head=0,tail=0;queue[tail++]=target;this.field[target]=0;while(head<tail){const i=queue[head++],a=this.nodes[i];for(const id of this.links[i]){if(this.field[id]>=0)continue;this.field[id]=this.field[i]+1;queue[tail++]=id}}}
 reachable(point){return this.field[this.index(point.x,point.z,this.layout.height(point.x,point.z,point))]>=0}
 direction(enemy,player){if(this.layout.clearWalk(enemy,player,.36)){const d=dist(enemy,player)||1;return {x:(player.x-enemy.x)/d,z:(player.z-enemy.z)/d}}const i=this.index(enemy.x,enemy.z,this.layout.height(enemy.x,enemy.z,enemy));let best=i,cost=this.field[i]<0?Infinity:this.field[i];for(const id of this.links[i])if(this.field[id]>=0&&this.field[id]<cost&&this.layout.clearWalk(enemy,this.center(id),.35)){best=id;cost=this.field[id]}if(best===i){for(const id of this.links[i]){if(this.field[id]<0||this.field[id]>=cost)continue;const next=this.nodes[id],length=dist(enemy,next)||1,probe={...enemy};this.layout.move(probe,(next.x-enemy.x)/length*.12,(next.z-enemy.z)/length*.12,.35);if(dist(probe,enemy)>.025){best=id;cost=this.field[id]}}}const p=this.nodes[best],d=dist(enemy,p)||1;return {x:(p.x-enemy.x)/d,z:(p.z-enemy.z)/d}}
}
