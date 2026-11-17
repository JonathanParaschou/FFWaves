"""Export a playable, un-rearranged region from the original cached Unity scene.

The height field, layered terrain, placed art and mesh-collider footprints are all
source data. Only the crop, common origin, file format and navigation approximation
are authored here. The installed FusionFall cache is read-only.
"""
import collections
import collections.abc
import hashlib
import json
import math
import pathlib
import sys
for name in ('Mapping','MutableMapping','Sequence','Iterable','MutableSequence'):
    if not hasattr(collections,name):setattr(collections,name,getattr(collections.abc,name))
ROOT=pathlib.Path(__file__).resolve().parent.parent
DEPS=ROOT/'.tools'
if not (DEPS/'UnityPackFF').exists():DEPS=ROOT.parent/'fusionfall-survival/.tools'
sys.path[:0]=[str(DEPS/'UnityPackFF'),str(DEPS/'python-deps')]
import numpy as np
from PIL import Image,ImageOps,ImageDraw
from unitypack.environment import UnityEnvironment
from unitypack.export import MeshData,CompressedMeshData
CACHE=pathlib.Path.home()/'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
OUT=ROOT/'dist/assets/native-city';OUT.mkdir(parents=True,exist_ok=True);(OUT/'textures').mkdir(exist_ok=True)
QA=ROOT/'qa';QA.mkdir(exist_ok=True)
SOURCE='map_5f04_5f04_2eunity3d/BuildPlayer-Map_04_04'
env=UnityEnvironment(str(CACHE));asset=env.get_asset_by_filename(str(CACHE/SOURCE))
REFLECT=np.diag([-1,1,1,1])
CX,CZ=192.,384.
PLAY=64.;RENDER=80.;CELL=1.
def raw(x):return x._obj if hasattr(x,'_obj') else x
def read(p):return raw(p.resolve()) if p else None
def vec(d,keys='xyz'):return [d[k] for k in keys]
def matrix(t):
    p=vec(t['m_LocalPosition']);x,y,z,w=vec(t['m_LocalRotation'],'xyzw');s=vec(t['m_LocalScale'])
    m=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),p[0]],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),p[1]],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),p[2]],[0,0,0,1]],float);m[:3,:3]=m[:3,:3]@np.diag(s);return m
components={};transform_data={};terrain_data=None;terrain_gid=None
for ident,obj in asset.objects.items():
    try:typ=obj.type
    except Exception:continue
    if typ not in ('Transform','MeshRenderer','MeshFilter','MeshCollider','TerrainCollider'):continue
    d=raw(obj.read());gid=d['m_GameObject'].path_id;components.setdefault(gid,{})[typ]=d
    if typ=='Transform':transform_data[gid]=d
    if typ=='TerrainCollider':terrain_data=read(d['m_TerrainData']);terrain_gid=gid
assert terrain_data is not None,'Original terrain data missing'
terrain_transform=np.eye(4);ancestor=transform_data[terrain_gid]
while ancestor['m_Father']:
    terrain_transform=matrix(ancestor)@terrain_transform;parent=read(ancestor['m_Father']);ancestor=transform_data[parent['m_GameObject'].path_id]
TX,TY,TZ=terrain_transform[:3,3]
height_data=terrain_data['m_Heightmap'];W,H=height_data['m_Width'],height_data['m_Height'];SX,SY,SZ=vec(height_data['m_Scale']);source_heights=np.array(height_data['m_Heights'],float).reshape(H,W)/32767*SY+TY
def source_height(x,z):
    x=np.clip((np.asarray(x)-TX)/SX,0,W-1);z=np.clip((np.asarray(z)-TZ)/SZ,0,H-1);i=np.minimum(np.floor(x).astype(int),W-2);j=np.minimum(np.floor(z).astype(int),H-2);u=x-i;v=z-j
    return source_heights[j,i]*(1-u)*(1-v)+source_heights[j,i+1]*u*(1-v)+source_heights[j+1,i]*(1-u)*v+source_heights[j+1,i+1]*u*v
BASE=float(source_height(CX,CZ))
root_id=next(gid for gid,t in transform_data.items() if not t['m_Father']);source_anchor=vec(transform_data[root_id]['m_LocalPosition']);records=[];geometry_cache={};textures={};parts=[];colliders=[];placement_records=[]
def geometry(ptr):
    key=(ptr.asset.name,ptr.path_id)
    if key in geometry_cache:return geometry_cache[key]
    obj=ptr.resolve();md=CompressedMeshData(obj) if obj.mesh_compression else MeshData(obj)
    vertices=np.array([[v.x,v.y,v.z,1] for v in md.vertices],float);normals=np.array([[v.x,v.y,v.z] for v in md.normals],float);uv=np.array([[v.x,v.y] for v in md.uv1],float);indices=[];groups=[]
    for i,tris in enumerate(md.triangles):
        start=len(indices)
        for k in range(0,len(tris)-2,3):indices.extend([tris[k+2],tris[k+1],tris[k]])
        groups.append({'start':start,'count':len(indices)-start,'materialIndex':i})
    value=(vertices,normals,uv,indices,groups);geometry_cache[key]=value;return value
def transform_vertices(ptr,world):
    v,*_=geometry(ptr)
    if not len(v):return np.zeros((0,3))
    v=(world@v.T).T[:,:3];v-=np.array([-CX,BASE,CZ]);return v
def overlaps(lo,hi,r=RENDER):return lo[0]<=r and hi[0]>=-r and lo[2]<=r and hi[2]>=-r
def export_texture(ptr):
    if not ptr:return None
    key=str((ptr.asset.name,ptr.path_id))
    if key in textures:return textures[key]
    tex=ptr.resolve();d=raw(tex);ident=hashlib.sha1(key.encode()).hexdigest()[:12];im=ImageOps.flip(tex.image).convert('RGBA');im.thumbnail((1024,1024));dest=OUT/'textures'/f'{ident}.webp';im.save(dest,'WEBP',quality=92,method=5)
    value={'map':f'assets/native-city/textures/{ident}.webp','name':d.get('m_Name','texture'),'size':list(im.size),'alpha':im.getextrema()[3][0]<250};textures[key]=value;return value
def material(ptr):
    if not ptr:return {'name':'original fallback','color':[1,1,1],'opacity':1}
    d=read(ptr);p=d.get('m_SavedProperties',{});txs=p.get('m_TexEnvs',[]);selected=next((v for k,v in txs if k=='_MainTex'),txs[0][1] if txs else None);m={'name':d.get('m_Name',''),'color':[1,1,1],'opacity':1}
    if selected and selected['m_Texture']:
        tx=export_texture(selected['m_Texture']);m['map']=tx['map'];m['alphaTest']=.35 if tx['alpha'] else 0
    for k,v in p.get('m_Colors',[]):
        if k=='_Color':m['color']=vec(v,'rgb');m['opacity']=v.get('a',1)
    return m
def walk(tptr,parent=np.eye(4),path=[],active=True):
    t=read(tptr);gid=t['m_GameObject'].path_id;go=read(t['m_GameObject']);active=active and bool(go.get('m_IsActive',1));name=go.get('m_Name','');world=parent@matrix(t);rh=REFLECT@world@REFLECT;c=components[gid];newpath=path+[name] if name else path
    if active and 'MeshRenderer' in c and 'MeshFilter' in c and c['MeshRenderer'].get('m_Enabled',True):
        ptr=c['MeshFilter']['m_Mesh']
        try:
            vertices=transform_vertices(ptr,rh)
            if len(vertices):
                lo=vertices.min(axis=0);hi=vertices.max(axis=0)
                if overlaps(lo,hi):
                    v,n,uv,indices,groups=geometry(ptr)
                    if len(indices) and (hi[0]-lo[0]<200 and hi[2]-lo[2]<200):
                        renderer=c['MeshRenderer'];mats=[material(p) for p in renderer.get('m_Materials',[])] or [material(None)];normals=np.zeros_like(vertices)
                        if len(n)==len(vertices) and np.any(np.linalg.norm(n,axis=1)>.01):normals=(np.linalg.inv(rh[:3,:3]).T@n.T).T;normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),.00001)
                        elif indices:
                            for a,b,cidx in np.array(indices).reshape(-1,3):
                                cr=np.cross(vertices[b]-vertices[a],vertices[cidx]-vertices[a]);normals[a]+=cr;normals[b]+=cr;normals[cidx]+=cr
                            normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),.00001)
                        if len(uv)!=len(vertices):uv=np.zeros((len(vertices),2))
                        groups=[{**g,'materialIndex':min(g['materialIndex'],len(mats)-1)} for g in groups]
                        parts.append({'name':name or f'source-{gid}','positions':vertices.round(5).ravel().tolist(),'normals':normals.round(5).ravel().tolist() if np.all(np.linalg.norm(normals[np.unique(indices)],axis=1)>.01) else [],'uvs':uv.round(6).ravel().tolist(),'indices':indices,'groups':groups,'materials':mats})
                        placement_records.append({'id':gid,'name':name,'path':newpath,'matrix':rh.T.round(7).ravel().tolist(),'bounds':{'min':lo.round(4).tolist(),'max':hi.round(4).tolist()}})
        except Exception as error:print('RENDER SKIP',gid,str(error)[:90])
    if active and 'MeshCollider' in c:
        mc=c['MeshCollider'];ptr=mc.get('m_Mesh')
        if ptr and not mc.get('m_IsTrigger',False):
            try:
                vertices=transform_vertices(ptr,rh)
                if len(vertices):
                    lo=vertices.min(axis=0);hi=vertices.max(axis=0)
                    if overlaps(lo,hi,PLAY+2):colliders.append({'id':gid,'name':name,'path':newpath,'vertices':vertices,'lo':lo,'hi':hi,'indices':geometry(ptr)[3]})
            except Exception as error:print('COLLIDER SKIP',gid,str(error)[:90])
    for child in t['m_Children']:walk(child,world,newpath,active)
for child in transform_data[root_id]['m_Children']:walk(child)
print('SOURCE',len(parts),'visible mesh parts',len(colliders),'nearby colliders',flush=True)

# Original layered terrain, composited using source splat textures and layer tiling.
TEX=1024
u=(np.arange(TEX)+.5)/TEX;gx,gz=np.meshgrid(CX+RENDER-u*RENDER*2,CZ-RENDER+u*RENDER*2)
def sample(im,x,z,repeat=False):
    arr=np.asarray(im.convert('RGBA'),float)/255
    if repeat:x=x%1;z=z%1
    else:x=np.clip(x,0,1);z=np.clip(z,0,1)
    ix=np.clip(np.floor(x*(im.width-1)).astype(int),0,im.width-1);iz=np.clip(np.floor(z*(im.height-1)).astype(int),0,im.height-1);return arr[iz,ix]
splat=terrain_data['m_SplatDatabase'];layers=splat['m_Splats'];controls=[ImageOps.flip(p.resolve().image) for p in splat['m_AlphaTextures']];out=np.zeros((TEX,TEX,3),float);layer_info=[]
for group in range(math.ceil(len(layers)/4)):
    weights=sample(controls[group],gx/512,gz/512);mixed=np.zeros_like(out);coverage=np.zeros((TEX,TEX),float)
    for j in range(4):
        k=group*4+j
        if k>=len(layers):break
        layer=layers[k];tex=layer['texture'].resolve();im=ImageOps.flip(tex.image);tile=vec(layer['tileSize'],'xy');color=sample(im,gx/tile[0],gz/tile[1],True)[:,:,:3];weight=weights[:,:,j];mixed+=color*weight[:,:,None];coverage+=weight;layer_info.append({'index':k,'name':raw(tex).get('m_Name',''),'tileSize':tile})
    mixed/=np.maximum(coverage[:,:,None],.0001);coverage=np.clip(coverage,0,1);out=out*(1-coverage[:,:,None])+mixed*coverage[:,:,None]
# The original terrain lightmap contributes its baked shade without replacing material color.
lm=ImageOps.flip(terrain_data['m_Lightmap'].resolve().image);shade=sample(lm,gx/512,gz/512)[:,:,:3];out*=np.clip(shade*.6+.4,.4,1)
ground_image=Image.fromarray(np.uint8(np.clip(out,0,1)*255));ground_image.save(OUT/'ground.webp','WEBP',quality=94,method=6);ground_image.save(QA/'native-city-ground.png')
textures['terrain']={'map':'assets/native-city/ground.webp','name':'Original TerrainData_04_04 splat layers/lightmap baked for this crop','size':[TEX,TEX],'alpha':False}


# A street plaza can be an original mesh over excavated TerrainData. Recover its
# actual near-ground upper faces instead of making an operative stand below it.
def walk_surface(axis):
    gx,gz=np.meshgrid(axis,axis);base=source_height(CX-gx,CZ+gz)-BASE;result=base.copy();covered=np.zeros_like(base,dtype=bool);count=0
    step=float(axis[1]-axis[0]);origin=float(axis[0]);size=len(axis)
    for part in parts:
        pv=np.array(part['positions']).reshape(-1,3)
        for tri in np.array(part['indices']).reshape(-1,3):
            pts=pv[tri];a,b,c=pts;cross=np.cross(b-a,c-a);length=np.linalg.norm(cross)
            if length<1e-8 or cross[1]/length<.65 or pts[:,1].min()<-1 or pts[:,1].max()>2.4:continue
            den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2])
            if abs(den)<.05:continue
            if part['name']!='Original TerrainData_04_04 ground':part['floorOverlay']=True
            c0=max(0,int(math.floor((pts[:,0].min()-origin)/step)));c1=min(size-1,int(math.ceil((pts[:,0].max()-origin)/step)));r0=max(0,int(math.floor((pts[:,2].min()-origin)/step)));r1=min(size-1,int(math.ceil((pts[:,2].max()-origin)/step)))
            if c1<c0 or r1<r0:continue
            x=gx[r0:r1+1,c0:c1+1];z=gz[r0:r1+1,c0:c1+1];wa=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den;wb=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;wc=1-wa-wb;y=wa*a[1]+wb*b[1]+wc*c[1];mask=(wa>=-1e-5)&(wb>=-1e-5)&(wc>=-1e-5)&(y>result[r0:r1+1,c0:c1+1]+.005)
            result[r0:r1+1,c0:c1+1][mask]=y[mask];covered[r0:r1+1,c0:c1+1][mask]=True
            if mask.any():count+=1
    return base,result,covered,count

# Rendering and navigation use exactly the same one-metre resampling and diagonal.
N=int(RENDER*2)+1;axis=np.linspace(-RENDER,RENDER,N);xx,zz=np.meshgrid(axis,axis);yy=source_height(CX-xx,CZ+zz)-BASE;vertices=np.stack([xx,yy,zz],axis=-1);normals=np.zeros_like(vertices);normals[:,:,1]=1
dz,dx=np.gradient(yy,CELL);normals[:,:,0]=-dx;normals[:,:,2]=-dz;normals/=np.linalg.norm(normals,axis=2)[:,:,None];uv=np.stack([(xx+RENDER)/(RENDER*2),(zz+RENDER)/(RENDER*2)],axis=-1);indices=[]
for row in range(N-1):
    for col in range(N-1):
        a=row*N+col;b=a+1;c=a+N;d=c+1;indices.extend([a,c,b,b,c,d])
parts.insert(0,{'name':'Original TerrainData_04_04 ground','positions':vertices.round(5).ravel().tolist(),'normals':normals.round(5).ravel().tolist(),'uvs':uv.round(7).ravel().tolist(),'indices':indices,'groups':[{'start':0,'count':len(indices),'materialIndex':0}],'materials':[{'name':'Original terrain splat bake','color':[1,1,1],'opacity':1,'map':'assets/native-city/ground.webp'}]})

PN=int(PLAY*2)+1;pa=np.linspace(-PLAY,PLAY,PN);px,pz=np.meshgrid(pa,pa);terrain_ph,ph,floor_mask,floor_triangles=walk_surface(pa);blocked=np.zeros((PN,PN),np.uint8);obstacles=[]
for c in colliders:
    lo,hi=c['lo'],c['hi'];cx=(lo[0]+hi[0])/2;cz=(lo[2]+hi[2])/2;floor=float(ph[int(np.clip(round(cz+PLAY),0,PN-1)),int(np.clip(round(cx+PLAY),0,PN-1))])
    # Floors and overhead zipline/platform pieces must not create ground-level walls.
    if hi[1]<floor+.7 or lo[1]>floor+2.0:continue
    w,d=hi[0]-lo[0],hi[2]-lo[2]
    if w>150 or d>150:continue
    o={'id':f'source-{c["id"]}','sourceObjectId':c['id'],'sourceName':c['name'],'x':round(cx,5),'z':round(cz,5),'w':round(max(w,.12),5),'d':round(max(d,.12),5),'h':round(hi[1]-lo[1],5),'base':round(float(lo[1]),5),'baseOffset':round(float(lo[1]-floor),5)};obstacles.append(o)
    mask=(px>=lo[0]-.48)&(px<=hi[0]+.48)&(pz>=lo[2]-.48)&(pz<=hi[2]+.48)&(ph+1.8>lo[1])&(ph+.15<hi[1]);blocked[mask]=1
# The source terrain's very steep edges are impassable; gradients remain source-derived.
dyz,dyx=np.gradient(ph);blocked[np.maximum(np.abs(dyx),np.abs(dyz))>.7]=1
blocked[[0,-1],:]=1;blocked[:,[0,-1]]=1

# Keep the largest walkable component; source interiors outside it remain non-spawnable.
def component(start):
    seen=set([start]);queue=collections.deque([start])
    while queue:
        r,c=queue.popleft()
        for rr,cc in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)):
            if 0<=rr<PN and 0<=cc<PN and not blocked[rr,cc] and (rr,cc) not in seen:seen.add((rr,cc));queue.append((rr,cc))
    return seen
remaining=set(map(tuple,np.argwhere(blocked==0)));largest=set()
while remaining:
    group=component(next(iter(remaining)));remaining-=group
    if len(group)>len(largest):largest=group
reachable=np.zeros_like(blocked)
for r,c in largest:reachable[r,c]=1
blocked[reachable==0]=1
def clearance(r,c,max_radius=12):
    for radius in range(1,max_radius+1):
        if r-radius<0 or c-radius<0 or r+radius>=PN or c+radius>=PN:return radius-1
        if blocked[r-radius:r+radius+1,c-radius:c+radius+1].any():return radius-1
    return max_radius
candidates=[]
for r in range(4,PN-4,2):
    for c in range(4,PN-4,2):
        if not blocked[r,c]:candidates.append((clearance(r,c),r,c))
candidates.sort(reverse=True);chosen=[]
for clear,r,c in candidates:
    if clear<2:continue
    if all(math.hypot(r-rr,c-cc)>17 for _,rr,cc in chosen):chosen.append((clear,r,c))
    if len(chosen)>=18:break
def point(value):
    clear,r,c=value;return {'x':float(pa[c]),'z':float(pa[r]),'y':round(float(ph[r,c]),5),'clearance':clear,'sourcePosition':[round(CX-pa[c],5),round(float(ph[r,c]+BASE),5),round(CZ+pa[r],5)]}
assert len(chosen)>=9,'Original crop has insufficient connected clear areas'
points=[point(v) for v in chosen]
spawn_values=[]
for vx,vz in [(-1,-.6),(0,-1),(1,-.6),(1,.5),(-1,.5),(0,1)]:
    pool=[v for v in candidates if v[0]>=2 and math.hypot(v[1]-chosen[0][1],v[2]-chosen[0][2])>20 and all(math.hypot(v[1]-b[1],v[2]-b[2])>18 for b in spawn_values)]
    if pool:spawn_values.append(max(pool,key=lambda v:(pa[v[2]]*vx+pa[v[1]]*vz)+min(v[0],5)*.4))
spawn_points=[point(v) for v in spawn_values]
station_points=[point(v) for v in chosen[1:] if all(math.hypot(pa[v[2]]-p['x'],pa[v[1]]-p['z'])>7 for p in spawn_points)]

nav={'format':'fusionfall-native-navigation-v1','id':'original-city','name':'Original City / Fountain District','source':SOURCE,'sourceTerrain':'generateddongs/terraindata_04_04.asset','coordinateNote':'One source unit remains one game metre. Source local (X,Y,Z) becomes (192-X,Y-baseY,Z-384). No placed model is rearranged or rescaled. Bounds restrict play; render crop extends16m beyond each playable edge.','sourceWorldAnchor':source_anchor,'sourceCrop':{'minX':CX-PLAY,'maxX':CX+PLAY,'minZ':CZ-PLAY,'maxZ':CZ+PLAY},'normalization':{'sourceCenterX':CX,'sourceCenterZ':CZ,'baseY':BASE,'reflectX':True},'bounds':{'minX':-PLAY,'maxX':PLAY,'minZ':-PLAY,'maxZ':PLAY},'renderBounds':{'minX':-RENDER,'maxX':RENDER,'minZ':-RENDER,'maxZ':RENDER},'originX':-PLAY,'originZ':-PLAY,'cell':CELL,'cols':PN,'rows':PN,'indexing':'row-major: row=floor((z-originZ)/cell), column=floor((x-originX)/cell), index=row*cols+column; samples at grid vertices.','triangulation':'NE-SW: [a,c,b],[b,c,d], a=NW,b=NE,c=SW,d=SE.','heightSource':{'terrainOrigin':[float(TX),float(TY),float(TZ)],'width':W,'height':H,'spacing':[SX,SZ],'scaleY':SY,'terrainTranslationY':float(TY),'integerNormalization':32767,'resampling':'bilinear original height field at one-metre vertices'},'heights':ph.round(5).ravel().tolist(),'terrainHeights':terrain_ph.round(5).ravel().tolist(),'sourceFloorMask':floor_mask.astype(int).ravel().tolist(),'floorHeightNote':'heights is original TerrainData plus original near-street upward-facing mesh floors <=2.4m above the source street datum; terrainHeights is unchanged TerrainData. Visible original floor meshes remain at their original coordinates above the terrain mesh.','blocked':blocked.ravel().tolist(),'obstacles':obstacles,'points':{'start':{**points[0],'yaw':0},'spawns':spawn_points,'stations':station_points},'statistics':{'connectedWalkableCells':int((blocked==0).sum()),'totalCells':int(blocked.size),'visibleSourceMeshes':len(placement_records),'sourceColliders':len(colliders),'floorOverlayParts':sum(bool(p.get('floorOverlay')) for p in parts),'navigationObstacles':len(obstacles),'sourceFloorSamples':int(floor_mask.sum()),'sourceFloorTriangles':floor_triangles}}
(OUT/'navigation.json').write_text(json.dumps(nav,separators=(',',':')),encoding='utf-8');(OUT/'navigation.js').write_text('export default '+json.dumps(nav,separators=(',',':'))+';\n',encoding='utf-8')
allv=np.concatenate([np.array(p['positions']).reshape(-1,3) for p in parts]);lo=allv.min(axis=0);hi=allv.max(axis=0);bounds={'min':lo.round(5).tolist(),'max':hi.round(5).tolist(),'size':(hi-lo).round(5).tolist()}
model={'id':'original-city','source':SOURCE,'bounds':bounds,'parts':parts,'coordinateNote':'Coordinates already match navigation.js exactly. Render at scale1 and position(0,0,0); do not recenter or ground the model again.'}
(OUT/'scene.json').write_text(json.dumps(model,separators=(',',':')),encoding='utf-8')
catalog={'format':'fusionfall-native-region-v1','id':'original-city','name':nav['name'],'url':'assets/native-city/scene.json','bounds':bounds,'source':SOURCE,'triangles':sum(len(p['indices'])//3 for p in parts),'parts':len(parts),'textures':list(textures.values()),'navigation':'assets/native-city/navigation.json','coordinateNote':model['coordinateNote'],'terrainLayers':layer_info,'placements':placement_records,'provenance':'Original cached built-scene geometry/transforms, TerrainData heights, terrain splat layers and lightmap. Crop and common-origin format conversion only. Collision is a documented conservative approximation of original MeshCollider bounds.'}
(OUT/'catalog.json').write_text(json.dumps(catalog,indent=2),encoding='utf-8')

# Ground + original collision plan: this is an inspection artifact, not new game art.
preview=ground_image.copy().resize((800,800));draw=ImageDraw.Draw(preview,'RGBA');P=800/(RENDER*2)
def xy(x,z):return ((x+RENDER)*P,(z+RENDER)*P)
for o in obstacles:
    a=xy(o['x']-o['w']/2,o['z']-o['d']/2);b=xy(o['x']+o['w']/2,o['z']+o['d']/2);draw.rectangle((*a,*b),fill=(25,28,39,150),outline=(230,213,161,200))
draw.rectangle((*xy(-PLAY,-PLAY),*xy(PLAY,PLAY)),outline=(232,250,255,255),width=3)
for i,p in enumerate(points):
    x,z=xy(p['x'],p['z']);draw.ellipse((x-5,z-5,x+5,z+5),fill=(118,255,154,255));draw.text((x+7,z-5),'START' if i==0 else str(i),fill=(255,255,255,255))
preview.save(QA/'native-city-plan.png')
print('COMPLETE',json.dumps({'bounds':nav['bounds'],'statistics':nav['statistics'],'triangles':catalog['triangles'],'parts':catalog['parts'],'textures':len(textures),'start':nav['points']['start']}),flush=True)
