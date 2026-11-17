"""Software review of actual runtime meshes/materials/props and first-person models.

This does not open a browser. GPU shadows, animation and postprocessing remain
unverified. It exists to inspect objects omitted from the old shell-only review.
"""
from pathlib import Path
import sys,json,math,base64,subprocess,importlib.util
ROOT=Path(__file__).resolve().parent.parent
for p in (ROOT/'.tools/python-deps',ROOT.parent/'fusionfall-survival/.tools/python-deps'):
    if p.exists():sys.path.insert(0,str(p))
import numpy as np
from PIL import Image,ImageDraw,ImageFont
spec=importlib.util.spec_from_file_location('reference_review',ROOT/'tools/review-reference-geometry.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
W,H=800,450

def textures(scene):
    result={}
    for i,m in enumerate(scene['materials']):
        path=m.get('map');inline=scene.get('textures',{}).get(path)
        if inline:im=Image.frombytes('RGBA',(inline['width'],inline['height']),base64.b64decode(inline['rgba']))
        elif path:im=Image.open(ROOT/'dist'/path).convert('RGBA')
        else:im=Image.new('RGBA',(1,1),'white')
        levels=[]
        while True:
            a=np.asarray(im,dtype=np.float64)/255;levels.append(np.concatenate([base.linear(a[:,:,:3]),a[:,:,3:4]],axis=2))
            if im.width<=2 or im.height<=2:break
            im=im.resize((max(1,im.width//2),max(1,im.height//2)),Image.Resampling.BOX)
        result[i]=levels
    return result

def illumination(scene,normal,position,unlit):
    if unlit:return np.ones(3)
    light=np.zeros(3)
    for l in scene['lights']:
        color=np.array(l['color']);intensity=l['intensity']
        if l['type']=='HemisphereLight':light+=(color*(normal[1]*.5+.5)+np.array(l['ground'])*(1-(normal[1]*.5+.5)))*intensity/math.pi
        elif l['type']=='DirectionalLight':
            direction=np.array(l['position'],dtype=float);direction/=max(1e-8,np.linalg.norm(direction));shade=max(0,float(normal@direction))
            # Source roof occlusion is approximated here. This is not a GPU shadow test.
            if l['position'][1]>40 and -7<position[0]<27 and -20<position[2]<33:shade*=.17
            light+=color*intensity*shade/math.pi
        elif l['type']=='PointLight':
            direction=np.array(l['position'],dtype=float)-position;distance=float(np.linalg.norm(direction));direction/=max(distance,.01);cutoff=l.get('distance')or 100
            attenuation=max(0,1-(distance/cutoff)**4)**2/max(distance**2,.15)
            light+=color*intensity*max(0,float(normal@direction))*attenuation/math.pi
    return light

def raster(frame,depth,vertices,mips,material,light,fov):
    focal=H/(2*math.tan(math.radians(fov)/2));inv=1/vertices[:,2];screen=np.stack([W/2+focal*vertices[:,0]*inv,H/2-focal*vertices[:,1]*inv],axis=1)
    x0=max(0,math.floor(screen[:,0].min()));x1=min(W-1,math.ceil(screen[:,0].max()));y0=max(0,math.floor(screen[:,1].min()));y1=min(H-1,math.ceil(screen[:,1].max()))
    if x1<x0 or y1<y0:return
    a,b,c=screen;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if abs(den)<1e-8:return
    yy,xx=np.mgrid[y0:y1+1,x0:x1+1];xx=xx+.5;yy=yy+.5
    w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w2=1-w0-w1;iz=w0*inv[0]+w1*inv[1]+w2*inv[2]
    z=np.divide(1,iz,out=np.full_like(iz,np.inf),where=iz>0);mask=(w0>=-1e-6)&(w1>=-1e-6)&(w2>=-1e-6)&(z<depth[y0:y1+1,x0:x1+1])
    if not mask.any():return
    weights=np.stack([w0[mask],w1[mask],w2[mask]],axis=1);uvz=vertices[:,3:5]*inv[:,None];numerator=weights@uvz;denominator=iz[mask];uv=numerator/denominator[:,None]
    dx=np.array([(b[1]-c[1])/den,(c[1]-a[1])/den,(a[1]-b[1])/den]);dy=np.array([(c[0]-b[0])/den,(a[0]-c[0])/den,(b[0]-a[0])/den]);dudx=((dx@uvz)[None,:]*denominator[:,None]-numerator*(dx@inv))/denominator[:,None]**2;dudy=((dy@uvz)[None,:]*denominator[:,None]-numerator*(dy@inv))/denominator[:,None]**2
    size=np.array([mips[0].shape[1],mips[0].shape[0]]);tx=np.linalg.norm(dudx*size,axis=1);ty=np.linalg.norm(dudy*size,axis=1);rho=np.maximum(np.minimum(tx,ty),np.maximum(tx,ty)/8);lod=np.clip(np.floor(np.log2(np.maximum(1,rho))).astype(np.int32),0,len(mips)-1)
    sampled=np.empty((len(uv),4))
    for level in np.unique(lod):
        selected=lod==level;tex=mips[int(level)];hh,ww=tex.shape[:2];u=(uv[selected,0]%1)*ww-.5;v=(uv[selected,1]%1)*hh-.5;ix=np.floor(u).astype(np.int32);iy=np.floor(v).astype(np.int32);fx=(u-ix)[:,None];fy=(v-iy)[:,None]
        sampled[selected]=(tex[iy%hh,ix%ww]*(1-fx)+tex[iy%hh,(ix+1)%ww]*fx)*(1-fy)+(tex[(iy+1)%hh,ix%ww]*(1-fx)+tex[(iy+1)%hh,(ix+1)%ww]*fx)*fy
    opacity=sampled[:,3]*material.get('opacity',1);keep=opacity>=material.get('alphaTest',0)
    albedo=np.array(material['linearColor'])*((1-material.get('contrast',1))+sampled[:,:3]*material.get('contrast',1))
    if material.get('seams'):
        edge=np.max(np.abs((uv%1)-.5),axis=1);t=np.clip((edge-.487)/(.498-.487),0,1);albedo*=1-.16*(t*t*(3-2*t))[:,None]
    color=albedo*light+np.array(material.get('emissive',[0,0,0]))*material.get('emissiveIntensity',0)
    target=frame[y0:y1+1,x0:x1+1];old=target[mask];alpha=opacity[:,None];old[keep]=color[keep]*alpha[keep]+old[keep]*(1-alpha[keep]);target[mask]=old
    if material.get('depthWrite',True):oldz=depth[y0:y1+1,x0:x1+1][mask];oldz[keep]=z[mask][keep];depth[y0:y1+1,x0:x1+1][mask]=oldz

def render(scene,camera,label,background='#283d47'):
    eye=np.array(camera['eye'],dtype=float);forward=np.array(camera['target'],dtype=float)-eye;forward/=np.linalg.norm(forward);right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward);basis=np.array([right,up,forward]);frame=np.tile(base.linear(base.rgb(background)),(H,W,1));depth=np.full((H,W),np.inf);maps=textures(scene);opaque=[];transparent=[]
    for part in scene['parts']:
        p=np.array(part['positions']).reshape(-1,3);n=np.array(part['normals']).reshape(-1,3);uv=np.array(part['uvs']).reshape(-1,2);transformed=(p-eye)@basis.T;material=scene['materials'][part['material']]
        for ids in np.array(part['indices']).reshape(-1,3):
            vertices=p[ids];normal=np.mean(n[ids],axis=0);normal/=max(1e-9,np.linalg.norm(normal));toward=eye-vertices.mean(axis=0);front=float(normal@toward)>0
            if material.get('side')==0 and not front:continue
            if not front:normal=-normal
            polygon=base.near_clip(np.concatenate([transformed[ids],uv[ids]],axis=1))
            if len(polygon)<3:continue
            light=illumination(scene,normal,vertices.mean(axis=0),material.get('unlit'));collection=transparent if material.get('opacity',1)<.99 else opaque
            for i in range(1,len(polygon)-1):tri=np.array([polygon[0],polygon[i],polygon[i+1]]);collection.append((float(tri[:,2].mean()),tri,maps[part['material']],material,light))
    for _,tri,mips,m,light in sorted(opaque,key=lambda p:p[0]):raster(frame,depth,tri,mips,m,light,camera['fov'])
    for _,tri,mips,m,light in sorted(transparent,key=lambda p:-p[0]):raster(frame,depth,tri,mips,m,light,camera['fov'])
    im=Image.fromarray(np.clip(base.srgb(base.aces(frame*1.1))*255,0,255).astype(np.uint8));draw=ImageDraw.Draw(im)
    try:font=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',15);small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',11)
    except OSError:font=small=ImageFont.load_default()
    draw.rectangle((0,0,W,45),fill='#10212d');draw.text((12,5),label,font=font,fill='#e2f3f5');draw.text((12,27),'ACTUAL RUNTIME MESHES + MATERIALS / SOFTWARE LIGHTING / GPU OUTPUT UNVERIFIED',font=small,fill='#97b9c4');return im

def main():
    closed='--doors-closed' in sys.argv;suffix='-closed' if closed else '';subprocess.run(['node','tools/export-scene-review.mjs']+(['--doors-closed']if closed else []),cwd=ROOT,check=True);data=json.loads((ROOT/'qa/runtime-scene-review.json').read_text());images=[]
    if '--weapons-only' not in sys.argv:
        for view in data['views']:
            im=render(data['environment'],view,view['name'].upper());im.save(ROOT/f'qa/{view["id"]}.png');images.append(im);print(view['name'],flush=True)
        sheet=Image.new('RGB',(W*2,H*3));
        for i,im in enumerate(images):sheet.paste(im,((i%2)*W,(i//2)*H))
        sheet.save(ROOT/f'qa/runtime-room-review{suffix}.jpg',quality=90);
        if not closed:
            sheet.save(ROOT/'docs/reference/NZP-Nacht/runtime-room-review.jpg',quality=90);sheet.save(ROOT/'docs/reference/NZP-Nacht/eye-review.jpg',quality=90)
    images=[]
    for id,scene in data['weapons'].items():
        im=render(scene,scene['camera'],id.upper()+' / FIRST PERSON',background='#344650');im.save(ROOT/f'qa/viewmodel-{id}.png');images.append(im)
    sheet=Image.new('RGB',(W*2,H*math.ceil(len(images)/2)));
    for i,im in enumerate(images):sheet.paste(im,((i%2)*W,(i//2)*H))
    sheet.save(ROOT/'qa/viewmodel-review.jpg',quality=90);print('Runtime room and ten-weapon reviews saved (software lighting; live WebGL unverified).',flush=True)
if __name__=='__main__':main()
