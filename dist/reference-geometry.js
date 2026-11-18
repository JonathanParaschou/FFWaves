import {referenceFixtures} from './reference-fixtures.js';
// The source brush model is shared by collision, floor selection, LOS and the map reader.
const indexes=new WeakMap(),bucketSize=2;
const key=(x,z)=>Math.floor(x/bucketSize)+','+Math.floor(z/bucketSize);
function index(data){
 if(indexes.has(data))return indexes.get(data);
 const brushes=new Map(),floors=new Map(),faces=new Map(data.faces.map(f=>[f.id,f]));
 function add(table,item,min,max){for(let z=Math.floor(min[2]/bucketSize);z<=Math.floor(max[2]/bucketSize);z++)for(let x=Math.floor(min[0]/bucketSize);x<=Math.floor(max[0]/bucketSize);x++){const k=x+','+z;if(!table.has(k))table.set(k,[]);table.get(k).push(item)}}
 for(const b of data.brushes)if(b.solid)add(brushes,b,b.min,b.max);
 for(const id of data.floors){const f=typeof id==='object'?id:faces.get(id);if(!f)continue;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const v of f.vertices)for(let a=0;a<3;a++){min[a]=Math.min(min[a],v[a]);max[a]=Math.max(max[a],v[a])}add(floors,f,min,max)}
 const result={brushes,floors};indexes.set(data,result);return result;
}
export function floorHeights(data,x,z){
 const heights=[];
 for(const f of index(data).floors.get(key(x,z))||[]){let positive=false,negative=false;const vertices=f.vertices;for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],cross=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);positive||=cross>1e-5;negative||=cross< -1e-5}if(positive&&negative)continue;const n=f.normal,p=vertices[0],y=p[1]-(n[0]*(x-p[0])+n[2]*(z-p[2]))/n[1];if(!heights.some(h=>Math.abs(h-y)<.02))heights.push(y)}
 return heights.sort((a,b)=>a-b);
}
export function referenceHeight(data,x,z,level){
 const hint=typeof level==='object'?level?.floorY:level,heights=floorHeights(data,x,z),target=Number.isFinite(hint)?hint:0;
 if(!heights.length)return target;
 const below=heights.filter(h=>h<=target+.36);return below.length?Math.max(...below):heights[0];
}
export function containsBrush(brush,x,y,z,radius=0,halfHeight=0,skin=0){return brush.planes.every(([nx,ny,nz,d])=>nx*x+ny*y+nz*z<=d+radius*Math.hypot(nx,nz)+Math.abs(ny)*halfHeight-skin+1e-6)}
export function nearbyBrushes(data,x,z,radius=0){const result=new Set(),i=index(data);for(const dx of [-radius,0,radius])for(const dz of [-radius,0,radius])for(const b of i.brushes.get(key(x+dx,z+dz))||[])result.add(b);return result}
export function brushRay(brush,origin,dir,range){let enter=0,leave=range;for(const [nx,ny,nz,d]of brush.planes){const at=nx*origin.x+ny*origin.y+nz*origin.z-d,rate=nx*dir.x+ny*dir.y+nz*dir.z;if(Math.abs(rate)<1e-9){if(at>0)return null;continue}const t=-at/rate;if(rate<0)enter=Math.max(enter,t);else leave=Math.min(leave,t);if(enter>leave)return null}return leave<0||enter>range?null:Math.max(0,enter)}

// Added equipment uses the same measured tops for rendering, actors and authority.
export function dressedReferenceHeight(map,x,z,level){const base=referenceHeight(map.reference.data,x,z,level);let result=base;for(const surface of referenceFixtures(map).surfaces){const dx=Math.max(surface.min[0]-x,0,x-surface.max[0]),dz=Math.max(surface.min[2]-z,0,z-surface.max[2]);if(Math.abs(surface.floorY-base)<.4&&dx*dx+dz*dz<.35*.35)result=Math.max(result,surface.max[1])}return result}

export function fixtureBlocksNode(box,p,pad=.35){return p.x>box.min[0]-pad&&p.x<box.max[0]+pad&&p.z>box.min[2]-pad&&p.z<box.max[2]+pad&&box.max[1]>p.y+.45&&box.min[1]<p.y+1.8}
