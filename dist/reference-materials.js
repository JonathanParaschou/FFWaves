// Original FusionFall textures substitute surfaces, never the measured architecture.
export function referenceMaterial(name=''){
 const n=name.toLowerCase();
 if(n.includes('ground'))return {surface:'ground',color:'#697a77'};
 if(n.includes('debris'))return {surface:'waste-rock',color:'#849192'};
 if(n.includes('tiles'))return {surface:'concrete',color:'#a0b5b7'};
 if(n.includes('wall'))return {map:'assets/native-city/textures/084463fa87ca.webp',color:'#c0cdd0'};
 if(n.startsWith('{chk')||n==='{clfnd')return {color:'#98b9bd',hidden:true};
 if(n.startsWith('{'))return {map:'assets/textures/66a79f240e3a.webp',color:'#9baeb2',alphaTest:.45};
 if(n.includes('cupb'))return {map:'assets/textures/479010711d2f.webp',color:'#c9d5d3'};
 if(n.includes('wood')||n.includes('box'))return {map:'assets/textures/b6c6ab64998c.webp',color:'#b0bec1'};
 return {surface:'concrete',color:'#9bafb5'};
}

// Keep the original polygons and UVs; classify their orientation before texturing.
export function referenceSurfaceGroups(part,geometry,baseMaterial,makeMaterial){
 const name=(part.sourceMaterial||'').toLowerCase();
 if(name.includes('ground')||name.includes('debris')||name.startsWith('{'))return [baseMaterial];
 const floor=makeMaterial({surface:'road',color:'#b2c0c5',contrast:.52,seams:true}),ceiling=makeMaterial({color:'#819194'}),riser=makeMaterial({surface:'concrete',color:'#9babb0',contrast:.45}),frame=makeMaterial({color:'#91a4aa'}),indices=part.indices,positions=part.positions,normals=part.normals;
 const bins=[[],[],[],[],[]];let role=-1,start=0;
 for(let i=0;i<indices.length;i+=3){const verts=indices.slice(i,i+3),ny=verts.reduce((s,v)=>s+normals[v*3+1],0)/3,center=[0,1,2].map(a=>verts.reduce((s,v)=>s+positions[v*3+a],0)/3),width=Math.max(...verts.map(v=>positions[v*3]))-Math.min(...verts.map(v=>positions[v*3])),depth=Math.max(...verts.map(v=>positions[v*3+2]))-Math.min(...verts.map(v=>positions[v*3+2])),stairs=(center[0]>2.5&&center[0]<4.7&&center[2]>5&&center[2]<11.5||center[0]>-3&&center[0]<2.8&&center[2]>-19&&center[2]<-16)&&center[1]<4.2,next=ny>.55?1:ny<-.55?2:stairs?3:name.includes('wall')&&Math.max(width,depth)<1.25?4:0;
  const uv=geometry.getAttribute?.('uv');if(uv)for(const v of verts){const x=positions[v*3],y=positions[v*3+1],z=positions[v*3+2];if(next===1)uv.setXY(v,x/1.2,z/1.2);else if(next===0&&name.includes('wall'))uv.setXY(v,Math.abs(normals[v*3])>.5?z/3:x/3,y/2.8)}
  bins[next].push(...verts);if(role!==next){if(role>=0)geometry.addGroup(start,i-start,role);start=i;role=next}
 }
 if(indices.length)geometry.addGroup(start,indices.length-start,role);
 if(geometry.setIndex){geometry.clearGroups();let offset=0;for(let i=0;i<bins.length;i++){if(bins[i].length)geometry.addGroup(offset,bins[i].length,i);offset+=bins[i].length}geometry.setIndex(bins.flat())}
 return [baseMaterial,floor,ceiling,riser,frame];
}
