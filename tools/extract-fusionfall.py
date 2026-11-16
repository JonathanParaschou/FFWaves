import sys,pathlib,json,collections,collections.abc,hashlib,traceback,math
for n in ('Mapping','MutableMapping','Sequence','Iterable','MutableSequence'):
 if not hasattr(collections,n):setattr(collections,n,getattr(collections.abc,n))
ROOT=pathlib.Path(__file__).resolve().parent.parent/'.tools'
sys.path[:0]=[str(ROOT/'UnityPackFF'),str(ROOT/'python-deps')]
import numpy as np
from PIL import ImageOps
from unitypack.environment import UnityEnvironment
from unitypack.export import MeshData,CompressedMeshData
CACHE=pathlib.Path.home()/'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
OUT=ROOT.parent/'dist/assets';(OUT/'models').mkdir(parents=True,exist_ok=True);(OUT/'textures').mkdir(exist_ok=True)
env=UnityEnvironment(str(CACHE));catalog=json.loads((ROOT/'catalog.json').read_text())
texture_cache={};manifest={'format':'fusionfall-mesh-v1','source':'Local original FusionFall Unity Web Player cache; read-only extraction via UnityPackFF','assets':{},'textures':{}}
def raw(o):return o._obj if hasattr(o,'_obj') else o
def readptr(p):return raw(p.resolve()) if p else None
def fvalues(vec,keys):return [vec[k] for k in keys]
def tmat(t):
 p=fvalues(t['m_LocalPosition'],'xyz');x,y,z,w=fvalues(t['m_LocalRotation'],'xyzw');s=fvalues(t['m_LocalScale'],'xyz')
 m=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),p[0]],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),p[1]],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),p[2]],[0,0,0,1]],dtype=float)
 m[:3,:3]=m[:3,:3]@np.diag(s);return m
def export_texture(ptr):
 if not ptr:return None
 key=(ptr.asset.name,ptr.file_id,ptr.path_id)
 if key in texture_cache:return texture_cache[key]
 tex=ptr.resolve();d=raw(tex);name=d.get('m_Name','texture');identifier=hashlib.sha1((str(key)+name).encode()).hexdigest()[:12];dest=OUT/'textures'/f'{identifier}.webp'
 image=ImageOps.flip(tex.image).convert('RGBA');image.thumbnail((1024,1024))
 hasalpha=image.getextrema()[3][0]<250
 image.save(dest,'WEBP',quality=90,method=5)
 result={'map':f'assets/textures/{identifier}.webp','alpha':hasalpha,'name':name,'size':list(image.size)};texture_cache[key]=result;manifest['textures'][identifier]=result;return result
def material(ptr):
 if not ptr:return {'name':'FusionFall material','color':[.7,.75,.7],'opacity':1}
 d=readptr(ptr);res={'name':d.get('m_Name','Material'),'color':[1,1,1],'opacity':1}
 props=d.get('m_SavedProperties',{});textures=props.get('m_TexEnvs',[])
 selected=next((v for k,v in textures if k=='_MainTex'),textures[0][1] if textures else None)
 if selected and selected['m_Texture']:
  try:
   tx=export_texture(selected['m_Texture']);res['map']=tx['map'];res['alphaTest']=.35 if tx['alpha'] else 0
  except Exception as exc:print('Texture failed',res['name'],repr(exc),flush=True)
 colors=props.get('m_Colors',[])
 for k,v in colors:
  if k=='_Color':res['color']=[v['r'],v['g'],v['b']];res['opacity']=v.get('a',1)
 return res
def components(go):
 return [(p.object.type,p) for pair in go['m_Component'] if (p:=(pair[1] if isinstance(pair,(tuple,list)) else pair))]
def extract(id,path):
 e=next(e for e in catalog if e['path']==path and e['type']=='GameObject');asset=env.get_asset_by_filename(str(CACHE/e['bundle']/e['file']));ptr=next(meta['asset'] for p,meta in asset.objects[1].contents['m_Container'] if p==path)
 parts=[];seen=set()
 def walk(go_ptr,parent):
  key=(go_ptr.asset.name,go_ptr.file_id,go_ptr.path_id)
  if key in seen:return
  seen.add(key);go=readptr(go_ptr);comps=components(go);tptr=next((p for typ,p in comps if typ=='Transform'),None);td=readptr(tptr) if tptr else {};matrix=parent@tmat(td) if td else parent
  renderer=next((readptr(p) for typ,p in comps if typ in ('MeshRenderer','SkinnedMeshRenderer')),None)
  meshptr=None
  if renderer:
   meshptr=renderer.get('m_Mesh')
   if not meshptr:
    mf=next((readptr(p) for typ,p in comps if typ=='MeshFilter'),None)
    if mf:meshptr=mf.get('m_Mesh')
  if meshptr and renderer.get('m_Enabled',True):
   try:
    mesh=meshptr.resolve();md=CompressedMeshData(mesh) if mesh.mesh_compression else MeshData(mesh)
    # MeshData has already reflected X into a right-handed coordinate basis.
    reflection=np.diag([-1,1,1,1]);mt=reflection@matrix@reflection
    verts=np.array([[v.x,v.y,v.z,1] for v in md.vertices],float);verts=(mt@verts.T).T[:,:3]
    normals=np.array([[v.x,v.y,v.z] for v in md.normals],float)
    if len(normals):
     normals=(np.linalg.inv(mt[:3,:3]).T@normals.T).T;normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),.0001)
    indices=[];groups=[]
    for i,tris in enumerate(md.triangles):
     start=len(indices)
     for j in range(0,len(tris)-2,3):indices.extend([tris[j+2],tris[j+1],tris[j]])
     groups.append({'start':start,'count':len(indices)-start,'materialIndex':i})
    mats=[material(p) for p in renderer.get('m_Materials',[])];mats=mats or [material(None)]
    for g in groups:g['materialIndex']=min(g['materialIndex'],len(mats)-1)
    if len(verts)>0 and len(indices)>0:
     if len(normals)!=len(verts):
      normals=np.zeros_like(verts)
      for j in range(0,len(indices),3):
       ia,ib,ic=indices[j:j+3];cr=np.cross(verts[ib]-verts[ia],verts[ic]-verts[ia]);normals[ia]+=cr;normals[ib]+=cr;normals[ic]+=cr
      normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),.0001)
     uvs=np.array([[v.x,v.y] for v in md.uv1],float)
     if len(uvs)!=len(verts):uvs=np.zeros((len(verts),2)) if len(uvs)==0 else uvs[:len(verts)]
     part={'name':go.get('m_Name','part'),'positions':verts,'normals':normals,'uvs':uvs,'indices':indices,'groups':groups,'materials':mats}
     if not (len(md.uv1)==0 and len(verts)<30):parts.append(part)
   except Exception as exc:print('Mesh failed',id,go.get('m_Name'),repr(exc),flush=True)
  for child_transform in td.get('m_Children',[]):
   child=readptr(child_transform);child_go=child['m_GameObject'];walk(child_go,matrix)
 walk(ptr,np.eye(4))
 if not parts:raise RuntimeError('No mesh parts for '+path)
 allverts=np.concatenate([p['positions'] for p in parts]);lo=allverts.min(axis=0);hi=allverts.max(axis=0);offset=np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2]);size=hi-lo
 for part in parts:
  part['positions']=(part['positions']-offset).round(5).ravel().tolist();part['normals']=part['normals'].round(5).ravel().tolist();part['uvs']=part['uvs'].round(6).ravel().tolist()
 bounds={'min':(lo-offset).round(5).tolist(),'max':(hi-offset).round(5).tolist(),'size':size.round(5).tolist()}
 data={'id':id,'source':path,'bounds':bounds,'parts':parts};dest=OUT/'models'/f'{id}.json';dest.write_text(json.dumps(data,separators=(',',':')))
 manifest['assets'][id]={'url':f'assets/models/{id}.json','source':path,'bounds':bounds,'parts':len(parts),'triangles':sum(len(p['indices'])//3 for p in parts),'bytes':dest.stat().st_size}
 print('EXPORTED',id,'parts',len(parts),'size',size.round(2),'triangles',manifest['assets'][id]['triangles'],flush=True)
selected={
 'nano-buttercup':'nano/nano_buttercup.kfm','nano-eddy':'nano/nano_eddy.kfm','nano-deedee':'nano/nano_deedee.kfm',
 'weapon-pistol':'wear/pistol_b10.nif','weapon-rifle':'wear/rifle_microscopegun.nif','weapon-shotgun':'wear/rifle_bruningshotgun.nif','weapon-cannon':'wear/thbazooka_bioplasmacannon.nif',
 'enemy-spawn':'mob/mob_spawn.kfm','enemy-gasspawn':'mob/mob_gasspawn.kfm','enemy-robo':'mob/mob_robo.kfm','enemy-asphalt':'mob/mob_asphalt.kfm',
 'building-lab':'map/technologysquare/dt_sdts_buildinga2_01.nif','building-store':'map/sunkenmall/dt_mtsm_store01.nif',
 'generator':'map/ep/ep_fusion_engien.nif','crate':'map/questitem/quest_item_crates_02.nif','console':'map/questitem/quest_item_computer_consoles.nif',
 'streetlight':'map/dtetc/dt_etc_streetlight.nif','tree':'map/dtetc/dt_tree_04.nif','barrel':'map/salvageyard/sb_slsy_etc_oilcask_00.nif',
 'fence':'map/etc/dt_mtsm_fence_a_5.nif','car':'map/dtetc/dt_etc_passengercar_a_01.nif','bench':'map/dtetc/dt_etc_bench_01.nif',
 'checkpoint':'map/nuclearplant/sb_otnp_checkpoint_01.nif','vending':'map/cityhall/dt_cpch_vendingmachine01.nif',
 'planter':'map/dexter/sb_sbdx_flowerbed01.nif','antenna':'map/wharf/dt_obwh_antenna.nif'
}
for id,path in selected.items():
 try:extract(id,path)
 except Exception:traceback.print_exc()
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
def export_named_texture(path):
 e=next(e for e in catalog if e['path']==path and e['type']=='Texture2D');asset=env.get_asset_by_filename(str(CACHE/e['bundle']/e['file']));ptr=next(meta['asset'] for p,meta in asset.objects[1].contents['m_Container'] if p==path);return export_texture(ptr)
remaps={
 'nano-buttercup':['nano_buttercup','nano_buttercup_face'], 'nano-eddy':['nano_eddy'], 'nano-deedee':['nano_deedee'],
 'weapon-pistol':['pistol_b10'], 'weapon-rifle':['rifle_ppganubislaser'], 'weapon-shotgun':['rifle_burningshotgun'], 'weapon-cannon':['thbazooka_bioplasmacannon'],
 'enemy-spawn':['spawn11_green','mob_gasspawn'], 'enemy-gasspawn':['mob_gasspawn','spawn11_green'], 'enemy-robo':['mob_robo'], 'enemy-asphalt':['mob_asphalt']
}
for id,names in remaps.items():
 if id not in manifest['assets']:continue
 txs=[export_named_texture('texture/'+n+'.dds') for n in names]
 file=OUT/'models'/f'{id}.json';data=json.loads(file.read_text())
 for p in data['parts']:
  for m in p['materials']:
   tx=txs[1] if len(txs)>1 and '-sub-' in m['name'] else txs[0];m['map']=tx['map'];m['alphaTest']=.3 if tx['alpha'] else 0
 file.write_text(json.dumps(data,separators=(',',':')));manifest['assets'][id]['bytes']=file.stat().st_size
manifest['surfaces']={}
for key,path in [('road','map/tile_01/tile_road_basic_02.dds'),('concrete','map/tile_01/tile_road_dt_2d.dds'),('grass','map/tile_01/tile_grass_01.dds'),('ground','map/tile_01/tile_grass_stone_01.dds')]:
 try:manifest['surfaces'][key]=export_named_texture(path)
 except Exception:traceback.print_exc()
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('DONE',len(manifest['assets']),'models',len(manifest['textures']),'textures',flush=True)

