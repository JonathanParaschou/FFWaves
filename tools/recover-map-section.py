"""Recover original placed static-map hierarchy and one bounded mesh section.

Uses the cached built Unity scene, not newly authored prop placements. It never
changes the shared game asset manifest. Output coordinates use local tile origin,
right-handed Y-up, and retain original object matrices.
"""
import collections
import collections.abc
import hashlib
import json
import pathlib
import sys
for name in ('Mapping', 'MutableMapping', 'Sequence', 'Iterable', 'MutableSequence'):
    if not hasattr(collections, name):
        setattr(collections, name, getattr(collections.abc, name))
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT / '.tools/UnityPackFF'), str(ROOT / '.tools/python-deps')]
import numpy as np
from PIL import ImageOps
from unitypack.environment import UnityEnvironment
from unitypack.export import MeshData, CompressedMeshData
CACHE = pathlib.Path.home() / 'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
OUT = ROOT / 'dist/assets/map-sections'
OUT.mkdir(parents=True, exist_ok=True)
env = UnityEnvironment(str(CACHE))
source = 'map_5f04_5f04_2eunity3d/BuildPlayer-Map_04_04'
asset = env.get_asset_by_filename(str(CACHE / source))
def raw(value):
    return value._obj if hasattr(value, '_obj') else value
def read(ptr):
    return raw(ptr.resolve()) if ptr else None
def vec(value, keys='xyz'):
    return [value[k] for k in keys]
def matrix(t):
    p=vec(t['m_LocalPosition']);x,y,z,w=vec(t['m_LocalRotation'],'xyzw');s=vec(t['m_LocalScale'])
    m=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),p[0]],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),p[1]],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),p[2]],[0,0,0,1]],dtype=float)
    m[:3,:3]=m[:3,:3]@np.diag(s)
    return m
components={};transforms={};types=collections.Counter()
for ident, obj in asset.objects.items():
    try:
        typ=obj.type
    except Exception:
        continue
    types[typ]+=1
    if typ not in ('MeshRenderer','MeshFilter','MeshCollider','Transform'):
        continue
    data=raw(obj.read());go=data['m_GameObject']
    components.setdefault(go.path_id,{})[typ]=data
    if typ=='Transform':
        transforms[go.path_id]=(ident,data)
root_id=next(ident for ident,(tid,t) in transforms.items() if not t['m_Father'])
root_transform=transforms[root_id][1]
reflection=np.diag([-1,1,1,1]);records=[];nodes=[]
def walk(tptr,parent=np.eye(4),ancestry=[]):
    t=read(tptr);go=read(t['m_GameObject']);name=go.get('m_Name','');world=parent@matrix(t);path=ancestry+[name] if name else ancestry
    c=components[t['m_GameObject'].path_id]
    nodes.append({'id':t['m_GameObject'].path_id,'name':name,'path':path,'position':(reflection@world@reflection)[:3,3].round(5).tolist(),'children':len(t['m_Children'])})
    if 'MeshRenderer' in c and 'MeshFilter' in c and c['MeshRenderer'].get('m_Enabled',True):
        renderer=c['MeshRenderer'];mesh=c['MeshFilter']['m_Mesh']
        record={'id':t['m_GameObject'].path_id,'name':name,'path':path,'matrix':(reflection@world@reflection).T.round(7).ravel().tolist(),'meshRef':{'asset':mesh.asset.name,'id':mesh.path_id},'position':(reflection@world@reflection)[:3,3].round(5).tolist(),'materialCount':len(renderer.get('m_Materials',[]))}
        records.append((record,mesh,renderer,reflection@world@reflection))
    for child in t['m_Children']:
        walk(child,world,path)
# Root translation is omitted: its original world anchor is retained in metadata.
for child in root_transform['m_Children']:
    walk(child)
result={'format':'fusionfall-placed-map-v1','source':source,'sourceWorldAnchor':vec(root_transform['m_LocalPosition']),'coordinateSystem':'Right-handed Y-up. X reflected from source; scene root translation omitted. Matrices are column-major.','sourceTypes':dict(types),'nodes':nodes,'meshes':[r[0] for r in records]}
(OUT/'map-04-04-placements.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
print('PLACEMENTS',len(nodes),'nodes',len(records),'renderable meshes')
counts=collections.Counter('/'.join(r[0]['path'][:2]) for r in records)
print('TOP PATHS',counts.most_common(25))

# The optional crop is a literal section of the placed map, normalized as one model.
if '--crop' not in sys.argv:
    sys.exit(0)
crop=tuple(map(float,sys.argv[sys.argv.index('--crop')+1].split(',')))
if len(crop)!=4:
    raise ValueError('Crop is x0,z0,x1,z1 in ORIGINAL tile-local coordinates before X reflection.')
x0,z0,x1,z1=crop;parts=[];texture_cache={};selected=[]
(OUT/'textures').mkdir(exist_ok=True)
def texture(ptr):
    if not ptr:
        return None
    key=(ptr.asset.name,ptr.path_id)
    if key in texture_cache:
        return texture_cache[key]
    tex=ptr.resolve();data=raw(tex);name=data.get('m_Name','texture');ident=hashlib.sha1((str(key)+name).encode()).hexdigest()[:12];image=ImageOps.flip(tex.image).convert('RGBA');image.thumbnail((1024,1024));image.save(OUT/'textures'/f'{ident}.png',optimize=True)
    value={'map':f'assets/map-sections/textures/{ident}.png','alpha':image.getextrema()[3][0]<250,'name':name,'size':list(image.size)};texture_cache[key]=value;return value
def material(ptr):
    if not ptr:
        return {'color':[1,1,1]}
    data=read(ptr);props=data.get('m_SavedProperties',{});textures=props.get('m_TexEnvs',[]);tx=next((v for k,v in textures if k=='_MainTex'),textures[0][1] if textures else None);res={'name':data.get('m_Name',''),'color':[1,1,1],'opacity':1}
    if tx and tx['m_Texture']:
        image=texture(tx['m_Texture']);res['map']=image['map'];res['alphaTest']=.35 if image['alpha'] else 0
    for key,value in props.get('m_Colors',[]):
        if key=='_Color':res['color']=vec(value,'rgb');res['opacity']=value.get('a',1)
    return res
for record,ptr,renderer,world in records:
    x,y,z=record['position']
    if not (x0<=-x<=x1 and z0<=z<=z1):
        continue
    try:
        mesh=ptr.resolve();md=CompressedMeshData(mesh) if mesh.mesh_compression else MeshData(mesh);vertices=np.array([[v.x,v.y,v.z,1] for v in md.vertices],float)
        if not len(vertices):continue
        vertices=(world@vertices.T).T[:,:3]
        if np.ptp(vertices[:,0])>150 or np.ptp(vertices[:,2])>150:continue
        normals=np.array([[v.x,v.y,v.z] for v in md.normals],float)
        if len(normals)==len(vertices):normals=(np.linalg.inv(world[:3,:3]).T@normals.T).T;normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),.0001)
        else:normals=np.zeros_like(vertices)
        indices=[];groups=[]
        for i,tris in enumerate(md.triangles):
            start=len(indices)
            for j in range(0,len(tris)-2,3):indices.extend([tris[j+2],tris[j+1],tris[j]])
            groups.append({'start':start,'count':len(indices)-start,'materialIndex':i})
        if not indices:continue
        uv=np.array([[v.x,v.y] for v in md.uv1],float)
        if len(uv)!=len(vertices):uv=np.zeros((len(vertices),2))
        mats=[material(p) for p in renderer.get('m_Materials',[])] or [material(None)]
        for g in groups:g['materialIndex']=min(g['materialIndex'],len(mats)-1)
        parts.append({'name':record['name'] or str(record['id']),'positions':vertices,'normals':normals,'uvs':uv,'indices':indices,'groups':groups,'materials':mats});selected.append(record)
    except Exception as error:
        print('SKIP',record['id'],str(error)[:120])
if not parts:
    raise RuntimeError('Crop contained no exportable meshes')
all_vertices=np.concatenate([p['positions'] for p in parts]);lo=all_vertices.min(axis=0);hi=all_vertices.max(axis=0);origin=np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2]);bounds={'min':(lo-origin).round(5).tolist(),'max':(hi-origin).round(5).tolist(),'size':(hi-lo).round(5).tolist()}
for part in parts:
    part['positions']=(part['positions']-origin).round(5).ravel().tolist();part['normals']=part['normals'].round(5).ravel().tolist();part['uvs']=part['uvs'].round(6).ravel().tolist()
model={'id':'original-city-block','source':source,'bounds':bounds,'parts':parts,'sourceCrop':list(crop),'normalizationOrigin':origin.round(5).tolist()}
(OUT/'original-city-block.json').write_text(json.dumps(model,separators=(',',':')),encoding='utf-8')
entry={'id':model['id'],'url':'assets/map-sections/original-city-block.json','source':source,'crop':list(crop),'bounds':bounds,'parts':len(parts),'triangles':sum(len(p['indices'])//3 for p in parts),'textures':list(texture_cache.values()),'placements':selected,'authenticity':'Mesh positions, scales and rotations come from the original cached built map. Crop and normalization only; no authored prop arrangement.'}
(OUT/'catalog.json').write_text(json.dumps(entry,indent=2),encoding='utf-8')
print('SECTION',len(parts),'parts',entry['triangles'],'triangles',len(texture_cache),'textures','bounds',bounds['size'])
