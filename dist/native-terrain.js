// The source terrain and its navigation samples share the exported coordinate space.
export function sampleNativeHeight(grid,x,z){
 const cell=grid.cell,cols=grid.cols,rows=grid.rows,fx=Math.max(0,Math.min(cols-1,(x-grid.originX)/cell)),fz=Math.max(0,Math.min(rows-1,(z-grid.originZ)/cell)),ix=Math.min(cols-2,Math.floor(fx)),iz=Math.min(rows-2,Math.floor(fz)),u=fx-ix,v=fz-iz,at=(a,b)=>grid.heights[b*cols+a],a=at(ix,iz),b=at(ix+1,iz),c=at(ix,iz+1),d=at(ix+1,iz+1);
 // Exported triangles [a,c,b], [b,c,d] split each cell from NE to SW.
 return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}
export function nativeBlocked(grid,x,z,pad=0){
 if(!grid.blocked)return false;const mask=grid.mask||grid,cell=mask.cell,cols=mask.cols,rows=mask.rows,ox=mask.originX??grid.originX,oz=mask.originZ??grid.originZ;
 const sample=(xx,zz)=>{const ix=Math.floor((xx-ox)/cell),iz=Math.floor((zz-oz)/cell);return ix<0||iz<0||ix>=cols||iz>=rows||!!grid.blocked[iz*cols+ix]};
 return sample(x,z)||pad>0&&[[-pad,0],[pad,0],[0,-pad],[0,pad],[-pad*.7,-pad*.7],[pad*.7,-pad*.7],[-pad*.7,pad*.7],[pad*.7,pad*.7]].some(([dx,dz])=>sample(x+dx,z+dz));
}
