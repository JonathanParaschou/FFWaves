const images=new WeakMap();
export function drawNativeFootprint(ctx,map,x,y,w,h){
 if(!map.native)return;let image=images.get(map);
 if(!image){const grid=map.native.terrain,mask=grid.mask||grid,canvas=document.createElement('canvas');canvas.width=mask.cols;canvas.height=mask.rows;const pixels=canvas.getContext('2d'),data=pixels.createImageData(canvas.width,canvas.height);for(let i=0;i<grid.blocked.length;i++){const blocked=grid.blocked[i],level=grid.heights[Math.min(i,grid.heights.length-1)]||0,shade=Math.max(-12,Math.min(12,Math.round(level*2))),offset=i*4;data.data.set(blocked?[24,42,49,255]:[91+shade,121+shade,122+shade,255],offset)}pixels.putImageData(data,0,0);image=canvas;images.set(map,canvas)}
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,x,y,w,h);ctx.restore();
}
