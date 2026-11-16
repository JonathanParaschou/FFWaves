import * as THREE from './vendor/three.module.js';
import {buildMapSpaces,routeCurve} from './map-spaces.js';
import {addMapDetails} from './map-details.js';
import {buildWeaponStation} from './weapon-stations.js';
import { activeMap,heightAt } from './layout.js';
const TAU=Math.PI*2;
export function buildEnvironment(scene,assets,glow,map=activeMap){
 const hitObjects=[],stations=[],gateMeshes=new Map(),pools=[],animated=[],ownedGeometry=new Set(),ownedMaterial=new Set(),ownedTextures=new Set(),weaponStations=[];
 const h=(x,z)=>heightAt(map,x,z),forest=map.id==='camp-kidney',waste=map.id==='salvage-yard';
 function material(color,mapName,tileX=1,tileZ=1){const texture=mapName?assets.surface(mapName,tileX,tileZ):null;if(texture)ownedTextures.add(texture);const m=new THREE.MeshStandardMaterial({color,map:texture,roughness:.88});ownedMaterial.add(m);return m}
 const stone=material(waste?'#726358':forest?'#6e7661':'#9ca9ab',waste?'waste-rock':forest?'wild-stone':'concrete',3,3),edge=material(waste?'#b58b55':forest?'#7e9574':'#a9c1c5'),dark=material('#33494b'),accent=material(map.palette.accent);
 function mesh(geo,mat,x=0,y=0,z=0,solid=true){ownedGeometry.add(geo);ownedMaterial.add(mat);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;scene.add(m);if(solid)hitObjects.push(m);return m}
 function box(x,y,z,w,hh,d,mat=stone,solid=true){return mesh(new THREE.BoxGeometry(w,hh,d),mat,x,y+hh/2,z,solid)}
 function flat(x,z,w,d,mat,y=.035){const m=mesh(new THREE.PlaneGeometry(w,d),mat,x,y,z,false);m.rotation.x=-Math.PI/2;return m}
 function ground(name,x,z,w,d,color,tile=6){const m=flat(x,z,w,d,material(color,name,w/tile,d/tile),-.025);hitObjects.push(m);return m}
 function place(id,x,z,opts={}){const m=assets.model(id,opts);m.position.set(x,h(x,z)+(opts.y||0),z);m.rotation.y=opts.rotation||0;scene.add(m);if(opts.solid!==false)m.traverse(o=>{if(o.isMesh)hitObjects.push(o)});return m}
 function ribbon(points,width,mat,{closed=false,linear=false,y=.05}={}){const curve=routeCurve({points,closed,linear}),count=Math.max(24,Math.ceil(curve.getLength()*2)),pos=[],uv=[],indices=[];for(let i=0;i<=count;i++){const t=i/count,p=curve.getPoint(t),v=curve.getTangent(t),n=new THREE.Vector3(-v.z,0,v.x).normalize();for(const side of [-1,1]){const q=p.clone().addScaledVector(n,width/2*side);pos.push(q.x,h(q.x,q.z)+y,q.z);uv.push(side===-1?0:1,t*curve.getLength()/5)}}for(let i=0;i<count;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(g,mat,0,0,0,false)}
 const baseSurface=forest?'wild-grass':waste?'ground':'grass';ground(baseSurface,0,0,400,380,map.palette.ground,7);
 if(!forest){ground(waste?'ground':'concrete',-25,7,56,70,waste?'#a7997c':'#bdc5c4',5);ground('ground',29,7,46,70,waste?'#b39b78':'#aaa99c',5)}
 for(const district of map.districts){flat(district.x,district.z,district.w,district.d,material(district.color,district.surface,district.w/4,district.d/4),.01)}
 // Every raised surface and inclined connector is shared with movement and enemy navigation.
 for(const p of map.platforms){box(p.x,0,p.z,p.w,p.h,p.d,stone);flat(p.x,p.z,p.w,p.d,material(forest?'#92a18a':waste?'#a5a18a':'#d0d4cc',p.surface,p.w/4,p.d/4),p.h+.018);
  for(const side of [-1,1]){box(p.x,0,p.z+side*(p.d/2-.15),p.w,.25,.3,edge);box(p.x,p.h+.025,p.z+side*(p.d/2-.12),p.w,.035,.14,accent,false)}
  for(let x=p.x-p.w/2+2;x<p.x+p.w/2;x+=5){box(x,0,p.z+p.d/2+.015,.24,p.h,.16,dark,false);if(p.d>15)box(x,0,p.z-p.d/2-.015,.24,p.h,.16,dark,false)}
 }
 for(const r of map.ramps){const x0=r.x-r.w/2,x1=r.x+r.w/2,z0=r.z-r.d/2,z1=r.z+r.d/2,ys=r.axis==='x'?[r.from,r.to,r.to,r.from]:[r.from,r.from,r.to,r.to],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([x0,ys[0],z0,x1,ys[1],z0,x1,ys[2],z1,x0,ys[3],z1,x0,0,z0,x1,0,z0,x1,0,z1,x0,0,z1],3));g.setIndex([0,2,1,0,3,2,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);g.computeVertexNormals();mesh(g,stone);
  const length=r.axis==='x'?r.w:r.d,angle=Math.atan2(r.to-r.from,length);for(let i=1;i<length;i+=1.6){const t=i/length,x=r.x+(r.axis==='x'?(t-.5)*r.w:0),z=r.z+(r.axis==='z'?(t-.5)*r.d:0),m=box(x,r.from+(r.to-r.from)*t+.025,z,r.axis==='x'?.16:r.w-.2,.025,r.axis==='z'?.16:r.d-.2,edge,false);if(r.axis==='x')m.rotation.z=angle;else m.rotation.x=-angle}
 }
 const path=material(forest?'#9aa17b':waste?'#8e938d':'#a2aeb4',forest?'wild-ground':waste?'concrete':'road',1,1),curb=material(forest?'#526f59':waste?'#635e54':'#c3cfcc');
 for(const route of map.paths){ribbon(route.points,route.width+1,curb,route);ribbon(route.points,route.width,path,{...route,y:.065})}
 for(const b of [...map.buildings,...map.cover]){const r=b.rotation||0;place(b.asset,b.x,b.z,{dimensions:Math.abs(Math.sin(r))>.7?[b.d,b.h,b.w]:[b.w,b.h,b.d],rotation:r})}
 // Covered interiors have two opposite doorways and usable supplies inside.
 const interiorWall=material(forest?'#7b785a':waste?'#7c837b':'#9aadb6',forest?'wild-stone':'concrete',2,2);
 for(const w of map.walls)box(w.x,h(w.x,w.z),w.z,w.w,w.h,w.d,interiorWall);
 for(const r of map.rooms){const base=h(r.x,r.z);flat(r.x,r.z,r.w,r.d,material(forest?'#ad9d77':'#93a5a5',forest?'wild-ground':'concrete',r.w/3,r.d/3),base+.025);box(r.x,base+r.h,r.z,r.w+.7,.25,r.d+.7,stone);for(const side of [-1,1]){const x=r.x+(r.axis==='x'?side*r.w/2:0),z=r.z+(r.axis==='z'?side*r.d/2:0);box(x,base+r.h-.35,z,r.axis==='z'?r.door:.35,.35,r.axis==='x'?r.door:.35,edge);if(side===-1){const lamp=new THREE.PointLight(forest?'#f2d2a0':'#b8e7e7',5,13,2);lamp.position.set(r.x,base+r.h-.6,r.z);scene.add(lamp)}}place(forest?'forest-picnic-table':waste?'waste-cabinet':'crate',r.x+r.w/2-2,r.z+r.d/2-2,{height:1.05,solid:false});}
 for(const d of map.dividers){box(d.x,h(d.x,d.z),d.z,d.w,d.h,d.d,forest?interiorWall:stone);const horizontal=d.w>d.d,length=Math.max(d.w,d.d),n=Math.ceil(length/5);for(let i=0;i<=n;i++){const offset=i*length/n-length/2;box(d.x+(horizontal?offset:0),h(d.x,d.z),d.z+(horizontal?0:offset),horizontal?.22:d.w+.12,d.h+.15,horizontal?d.d+.12:.22,edge,false)}box(d.x,h(d.x,d.z)+d.h,d.z,d.w+.12,.16,d.d+.12,edge,false)}
 for(const g of map.gates){const group=new THREE.Group();group.position.set(g.x,h(g.x,g.z),g.z);const horizontal=g.w>g.d,mat=new THREE.MeshBasicMaterial({color:map.palette.accent,transparent:true,opacity:.12,depthWrite:false});ownedMaterial.add(mat);const panel=new THREE.Mesh(new THREE.BoxGeometry(g.w,g.h,g.d),mat);ownedGeometry.add(panel.geometry);panel.position.y=g.h/2;group.add(panel);for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(horizontal?g.w:.12,.055,horizontal?.12:g.d),accent);ownedGeometry.add(m.geometry);m.position.y=.4+i*.48;group.add(m)}scene.add(group);gateMeshes.set(g.id,{group,data:g});for(const side of [-1,1])box(g.x+(horizontal?side*g.w/2:0),h(g.x,g.z),g.z+(horizontal?0:side*g.d/2),.35,3.7,.35,edge)}
 function label(text,color='#c9f557',small=''){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#092430ee';ctx.fillRect(0,0,512,128);ctx.strokeStyle=map.palette.accent;ctx.lineWidth=3;ctx.strokeRect(2,2,508,124);ctx.textAlign='center';ctx.fillStyle=color;ctx.font='bold 28px Arial';ctx.fillText(text,256,small?55:77);if(small){ctx.fillStyle='#d6edee';ctx.font='17px Arial';ctx.fillText(small,256,98)}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;ownedTextures.add(t);const mat=new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false});ownedMaterial.add(mat);const m=new THREE.Sprite(mat);m.scale.set(5,1.25,1);return m}
 for(const s of map.stations){if(s.kind==='wall'||s.kind==='mystery'){const station=buildWeaponStation(scene,assets,s,h);weaponStations.push(station);hitObjects.push(...station.hitObjects);stations.push({data:s,object:station.root,marker:new THREE.Object3D(),ring:new THREE.Object3D()});stations.at(-1).ring.material={opacity:0};continue}const object=place(s.asset,s.x,s.z,{height:s.kind==='evac'?3:s.kind==='mystery'?1.1:1.6,solid:false}),marker=label(s.label);marker.position.set(s.x,h(s.x,s.z)+2.7,s.z);marker.scale.set(3.2,.8,1);marker.visible=false;scene.add(marker);const mat=new THREE.MeshBasicMaterial({color:map.palette.accent,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false});ownedMaterial.add(mat);const ring=mesh(new THREE.RingGeometry(.85,.93,40),mat,s.x,h(s.x,s.z)+.055,s.z,false);ring.rotation.x=-Math.PI/2;ring.visible=false;stations.push({data:s,object,marker,ring})}
 // Fenced embankments close the space beside the elevated approach ramps.
 const northDeck=map.platforms.find(p=>p.w>=100),gapRamps=map.ramps.filter(r=>r.z<map.north);for(const r of gapRamps)for(const side of [-1,1]){const x=r.x+side*(r.w/2+.2),z=(map.north+northDeck.z+northDeck.d/2)/2,length=map.north-(northDeck.z+northDeck.d/2);place(forest?'fence':'yard-fence',x,z,{dimensions:[length,1.8,.12],rotation:Math.PI/2,solid:false});}
 const invisible=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false});ownedMaterial.add(invisible);for(const tree of map.trees){place(tree.asset,tree.x,tree.z,{height:tree.height,rotation:tree.x*.15,solid:false});const trunk=mesh(new THREE.CylinderGeometry(.32,.38,3,8),invisible,tree.x,h(tree.x,tree.z)+1.5,tree.z);trunk.castShadow=trunk.receiveShadow=false;}
 // A visible perimeter and distant silhouettes enclose each biome.
 for(const [x,z,w,d]of [[-53,-2,1.5,96],[53,-2,1.5,96],[0,45,108,1.5],[0,-49,108,1.5]])box(x,0,z,w,forest?1.4:2,d,stone);
 function glowSprite(x,y,z,color,size=2){const mat=new THREE.SpriteMaterial({map:glow,color,transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending});ownedMaterial.add(mat);const s=new THREE.Sprite(mat);s.scale.set(size,size,1);s.position.set(x,y,z);scene.add(s);return s}
 function sign(text,x,z,rotation=0){const sprite=label(text,'#e8e6c5'),mat=new THREE.MeshBasicMaterial({map:sprite.material.map,side:THREE.DoubleSide});ownedMaterial.add(mat);const sign=mesh(new THREE.PlaneGeometry(3.6,.9),mat,x,h(x,z)+2.6,z,false);sign.rotation.y=rotation;for(const side of [-1,1])box(x+side*1.45,h(x,z),z,.12,2.65,.12,dark,false)}

 if(!forest&&!waste){
  place('yard-garage',-29.5,-8.5,{dimensions:[24.8,3.55,8.8],y:-3.6,solid:false});
  place('original-city-block',20,-150,{scale:.65,solid:false});
  for(let i=0;i<4;i++){place('town-monorail',-44+i*30,-53,{dimensions:[30,3,4.6],y:11,solid:false});box(-44+i*30,0,-53,1.25,11,1.25,edge,false)}
  for(const [x,z]of [[-34,31],[-34,-23],[41,32]]){place('town-busstop',x,z,{height:2.8,solid:false});place('town-trash',x+3,z,{height:.7,solid:false})}
  for(const [x,z]of [[-30,10],[-16,10],[-30,-5],[-16,-5],[-17,-43],[19,-43]]){place('bench',x,z,{height:.85,rotation:Math.PI/2,solid:false});place('town-planter',x+1,z+2,{height:.65,solid:false})}

  for(const [x,z]of [[-35,25],[-10,29],[-40,-23],[-7,-23],[13,26],[44,21],[15,-20],[44,-21],[-31,-40],[31,-40]]){place('streetlight',x,z,{height:6,solid:false});glowSprite(x,h(x,z)+5.5,z,'#ffd49a',1.6)}
  for(const [x,z]of [[-38,26],[-8,26],[11,25],[29,-14]])for(let i=0;i<5;i++)flat(x,z-2+i*.9,4,.45,edge,h(x,z)+.08);
  for(const [x,z]of [[-40,30],[-41,-18],[17,33],[44,6],[20,-7],[21,-6],[-38,-10],[-22,-7]]){place('barrel',x,z,{height:.95,solid:false});place('crate',x+1.2,z+1,{height:.7,solid:false})}
  sign('SECTOR V TRANSIT',-35,35);sign('REACTOR ACCESS',15,19);sign('SKYWALK / TWO RAMPS',-9,-41);
  const waterMat=new THREE.MeshPhysicalMaterial({color:'#72c4cf',roughness:.15,metalness:.3,transparent:true,opacity:.72});ownedMaterial.add(waterMat);const water=mesh(new THREE.CylinderGeometry(3.25,3.25,.035,48),waterMat,-23,.66,3,false);animated.push({type:'water',object:water,base:.66});
 }else if(forest){
  const creekMat=material('#335e67');creekMat.metalness=.4;creekMat.roughness=.18;ribbon([[-3,51],[-1,31],[-5,12],[-2,-6],[0,-27],[-8,-55]],5,creekMat,{y:.085});
  for(const [x,z]of [[-2,25],[-4,-8]])place('forest-bridge',x,z,{dimensions:[11,2.7,4],rotation:Math.PI/2,y:-2.3,solid:false});
  for(let i=0;i<74;i++){const angle=i*2.39996,r=58+(i%4)*7,x=Math.cos(angle)*r,z=Math.sin(angle)*r;place(i%3?'forest-tree-creek':'forest-tree-twisted',x,z,{height:10+(i%6)*2,rotation:angle,solid:false})}


  for(const [x,z]of [[-24,23],[32,16]]){const s=glowSprite(x,h(x,z)+.9,z,'#ffd18a',3);animated.push({type:'fire',object:s,base:h(x,z)+.9});const light=new THREE.PointLight('#ffb65b',3,8);light.position.copy(s.position);scene.add(light);animated.push({type:'light',object:light})}
  for(const [x,z]of [[-17,25],[-32,15],[15,24],[44,20],[-29,-37],[28,-37]]){place('forest-sign',x,z,{height:1.7,solid:false});glowSprite(x,h(x,z)+1.8,z,'#abead8',1)}
  sign('CAMP KIDNEY',-31,36);sign('CREEK WATCH',18,21);sign('CANOPY RIDGE',-6,-42);
  for(let i=0;i<20;i++){const s=glowSprite(Math.sin(i*2.1)*45,1+(i%5)*.5,Math.cos(i*1.3)*40,'#b6f4b0',.12);animated.push({type:'firefly',object:s,base:s.position.y,phase:i})}
 }else{
  for(let i=0;i<36;i++){const angle=i*2.39996,r=63+(i%3)*8;place(i%4?'waste-rock':'waste-metal-tree',Math.cos(angle)*r,Math.sin(angle)*r,{height:i%4?10+(i%5)*3:14,rotation:angle,solid:false})}


  for(const [x,z]of [[-38,4],[-17,5],[9,30],[46,5],[-28,-42],[23,-44]]){place('waste-drum',x,z,{height:1.15,solid:false});place('waste-tv',x+.8,z+.7,{height:.5,solid:false});const steam=glowSprite(x,h(x,z)+2.5,z,'#c4c1b2',2.2);animated.push({type:'steam',object:steam,base:steam.position.y,phase:x});}
  for(const [x,z]of [[16,-17],[26,-18],[45,-13]]){const sp=glowSprite(x,10,z,'#b2ed6b',4);pools.push(sp)}
  for(const [x,z]of [[-12,-54],[15,-54]])place('yard-cylinder',x,z,{height:14,solid:false});
  place('waste-bridge',0,-53,{dimensions:[22,2,4],y:8,solid:false});
  sign('SALVAGE EXCHANGE',-31,36);sign('CRUSHER WORKS',15,19);sign('FURNACE GANTRY',-8,-42);
  // Pipe runs, warning stripes and cable supports make the plant read as a connected facility.
  for(const z of [-18,-14]){box(29,8,z,29,.35,.35,dark,false);for(const x of [16,30,43])box(x,0,z,.24,8,.24,edge,false)}
  for(const r of map.ramps)if(r.from>4||r.to>4)for(let i=0;i<r.d;i+=2){const z=r.z-r.d/2+i;box(r.x,h(r.x,z)+.04,z,r.w-.3,.03,.2,accent,false)}
 }
 function instances(mat,matrices){const geo=new THREE.BoxGeometry(1,1,1);ownedGeometry.add(geo);const group=new THREE.InstancedMesh(geo,mat,matrices.length);matrices.forEach((matrix,i)=>group.setMatrixAt(i,matrix));group.castShadow=group.receiveShadow=true;scene.add(group)}
 buildMapSpaces(map,{box,flat,material,mesh,place,label,h,instances});
 const details=addMapDetails(scene,assets,map,glow);
 return {hitObjects,stations,gateMeshes,pools,label,place,update(dt,time,sim){weaponStations.forEach(s=>s.update(sim?.box,time,sim?.wave||0));for(const a of animated){if(a.type==='water')a.object.position.y=a.base+Math.sin(time*1.6)*.012;if(a.type==='fire'){a.object.material.opacity=.2+Math.sin(time*8)*.035;a.object.scale.setScalar(2.8+Math.sin(time*12)*.15)}if(a.type==='light')a.object.intensity=2.6+Math.sin(time*9)*.25;if(a.type==='steam'){a.object.position.y=a.base+(time*.6+a.phase)%2;a.object.material.opacity=.08+(1-(time*.6+a.phase)%2/2)*.08}if(a.type==='firefly'){a.object.position.y=a.base+Math.sin(time+a.phase)*.3;a.object.material.opacity=.1+Math.sin(time*1.5+a.phase)**2*.4}}},dispose(){details.dispose();weaponStations.forEach(s=>s.dispose());for(const g of ownedGeometry)g.dispose();for(const m of ownedMaterial)m.dispose();for(const t of ownedTextures)t.dispose();scene.clear()}};
}
