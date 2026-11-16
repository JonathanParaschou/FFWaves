"""Read-only export of FusionFall's original skeletons, packed skin and animation clips."""
import sys,pathlib,json,collections,collections.abc,math,traceback
for n in ('Mapping','MutableMapping','Sequence','Iterable','MutableSequence'):
 if not hasattr(collections,n):setattr(collections,n,getattr(collections.abc,n))
PROJECT=pathlib.Path(__file__).resolve().parent.parent
TOOLS=PROJECT/'.tools';sys.path[:0]=[str(TOOLS/'UnityPackFF'),str(TOOLS/'python-deps')]
import numpy as np
from unitypack.environment import UnityEnvironment
from unitypack.export import MeshData,CompressedMeshData
CACHE=pathlib.Path.home()/'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
OUT=PROJECT/'dist/assets/animations';OUT.mkdir(exist_ok=True,parents=True)
catalog=json.loads((TOOLS/'catalog.json').read_text());env=UnityEnvironment(str(CACHE));H=np.diag([-1.,1.,1.,1.])
def raw(o):return o._obj if hasattr(o,'_obj') else o
def resolved(p):return raw(p.resolve()) if p else None
def pointer_key(p):return (p.object.asset.name,p.object.path_id)
def vec(v,keys='xyz'):return [float(v[k]) for k in keys]
def tmat(t):
 p=vec(t['m_LocalPosition']);x,y,z,w=vec(t['m_LocalRotation'],'xyzw');s=vec(t['m_LocalScale'])
 m=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),p[0]],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),p[1]],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),p[2]],[0,0,0,1]],dtype=float)
 m[:3,:3]=m[:3,:3]@np.diag(s);return m
def components(go):return [(p.object.type,p) for pair in go['m_Component'] if (p:=pair[1])]
def packed_int(v):
 n=v['m_NumItems'];bits=v['m_BitSize'];blob=int.from_bytes(v['m_Data'],'little');mask=(1<<bits)-1
 return [(blob>>(i*bits))&mask for i in range(n)]
def unpack_quats(v):
 data=int.from_bytes(v['m_Data'],'little');result=[];bit=0
 for i in range(v['m_NumItems']):
  flags=(data>>bit)&7;bit+=3;missing=flags&3;q=[0.,0.,0.,0.];total=0
  for j in range(4):
   if j==missing:continue
   size=9 if (missing+1)%4==j else 10;value=(data>>bit)&((1<<size)-1);bit+=size;q[j]=value/(.5*((1<<size)-1))-1;total+=q[j]*q[j]
  q[missing]=math.sqrt(max(0,1-total))*(-1 if flags&4 else 1)
  q=np.array([q[0],-q[1],-q[2],q[3]]);q/=max(.00001,np.linalg.norm(q));result.append(q.tolist())
 return result
def decode_skin(mesh,vertexcount,bonecount):
 d=raw(mesh);compressed=d['m_CompressedMesh'];weights=np.zeros((vertexcount,4));indices=np.zeros((vertexcount,4),dtype=np.int32)
 if len(d.get('m_Skin',[])):
  for vi,row in enumerate(d['m_Skin']):
   row=raw(row)
   for j in range(4):weights[vi,j]=row.get(f'weight[{j}]',row.get('weight',[0]*4)[j]);indices[vi,j]=row.get(f'boneIndex[{j}]',row.get('boneIndex',[0]*4)[j])
 else:
  wd=packed_int(compressed['m_Weights']);bd=packed_int(compressed['m_BoneIndices']);wi=bi=vi=0
  while vi<vertexcount and wi<len(wd):
   total=0
   for j in range(4):
    if j==3:weight=31-total
    else:weight=wd[wi];wi+=1
    weights[vi,j]=weight/31;indices[vi,j]=bd[bi];bi+=1;total+=weight
    if total>=31:break
   vi+=1
  if not wd and bonecount==1:weights[:,0]=1
  elif vi!=vertexcount:raise ValueError(f'weight count decoded {vi}/{vertexcount} (weights={len(wd)} bones={len(bd)})')
 assert np.min(weights)>=0 and np.max(indices)<bonecount
 assert np.max(np.abs(weights.sum(axis=1)-1))<1e-5
 return weights,indices
def matrix_array(m):return m.T.round(8).ravel().tolist() # Three Matrix4.fromArray expects column-major
def source_matrix(d):return np.array([[d[f'e{i}{j}'] for j in range(4)] for i in range(4)],float)
def decompose(m):
 p=m[:3,3];s=np.linalg.norm(m[:3,:3],axis=0);r=m[:3,:3]/s
 if np.linalg.det(r)<0:s[0]*=-1;r[:,0]*=-1
 tr=np.trace(r)
 if tr>0:
  k=math.sqrt(1+tr)*2;q=[(r[2,1]-r[1,2])/k,(r[0,2]-r[2,0])/k,(r[1,0]-r[0,1])/k,.25*k]
 else:
  j=int(np.argmax(np.diag(r)))
  if j==0:
   k=math.sqrt(max(.00000001,1+r[0,0]-r[1,1]-r[2,2]))*2;q=[.25*k,(r[0,1]+r[1,0])/k,(r[0,2]+r[2,0])/k,(r[2,1]-r[1,2])/k]
  elif j==1:
   k=math.sqrt(max(.00000001,1+r[1,1]-r[0,0]-r[2,2]))*2;q=[(r[0,1]+r[1,0])/k,.25*k,(r[1,2]+r[2,1])/k,(r[0,2]-r[2,0])/k]
  else:
   k=math.sqrt(max(.00000001,1+r[2,2]-r[0,0]-r[1,1]))*2;q=[(r[0,2]+r[2,0])/k,(r[1,2]+r[2,1])/k,.25*k,(r[1,0]-r[0,1])/k]
 q=np.array(q);q/=np.linalg.norm(q)
 return p.round(8).tolist(),q.round(8).tolist(),s.round(8).tolist()

def export_rig(id,source,full_clips=False):
 entry=next(e for e in catalog if e['path']==source and e['type']=='GameObject');a=env.get_asset_by_filename(str(CACHE/entry['bundle']/entry['file']));rootptr=next(meta['asset'] for path,meta in a.objects[1].contents['m_Container'] if path==source)
 nodes=[];node_keys={};renderers=[];worlds=[];animations=[]
 def walk(go_ptr,parent=-1,path=''):
  go=resolved(go_ptr);cs=components(go);tp=next(p for typ,p in cs if typ=='Transform');td=resolved(tp);key=pointer_key(tp)
  if key in node_keys:return
  ix=len(nodes);node_keys[key]=ix;name=go['m_Name'];nodepath=path+'/'+name if path else name
  if parent==-1:nodepath=''
  matrix=(worlds[parent] if parent>=0 else np.eye(4))@tmat(td);worlds.append(matrix)
  p=vec(td['m_LocalPosition']);q=vec(td['m_LocalRotation'],'xyzw');p[0]*=-1;q[1]*=-1;q[2]*=-1
  nodes.append({'name':f'ffbone_{ix}','sourceName':name,'path':nodepath,'parent':parent,'position':p,'quaternion':q,'scale':vec(td['m_LocalScale'])})
  for typ,ptr in cs:
   if typ=='SkinnedMeshRenderer':
    rr=resolved(ptr)
    if rr.get('m_Mesh') and rr.get('m_Enabled',True):renderers.append((name,ix,rr))
   elif typ=='Animation':animations.extend(resolved(ptr)['m_Animations'])
  for child in td['m_Children']:walk(resolved(child)['m_GameObject'],ix,nodepath)
 walk(rootptr)
 geometry=json.loads((PROJECT/'dist/assets/models'/f'{id}.json').read_text());byname={p['name']:p for p in geometry['parts']}
 # Existing static mesh export translated all geometry by one common grounding offset.
 # Recover it exactly from the same source renderer geometry and its stored static positions.
 offsets=[];decoded=[];max_bind_error=0;original_inverses={};inverse_difference=0
 for name,ni,rr in renderers:
  if name not in byname:continue
  mesh=rr['m_Mesh'].resolve();md=CompressedMeshData(mesh) if mesh.mesh_compression else MeshData(mesh);vertexcount=len(md.vertices);part=byname[name]
  if len(part['positions'])//3!=vertexcount:raise ValueError(f'vertex mismatch {name}')
  mt=H@worlds[ni]@H;positions=np.array([[v.x,v.y,v.z,1] for v in md.vertices]);worldpos=(mt@positions.T).T[:,:3];stored=np.array(part['positions']).reshape(-1,3);off=(worldpos-stored).mean(axis=0);offsets.append(off)
  boneptrs=rr['m_Bones'];weights,indices=decode_skin(mesh,vertexcount,len(boneptrs));boneids=[node_keys[pointer_key(p)] for p in boneptrs]
  global_indices=np.array(boneids,dtype=np.int32)[indices]
  # Original Unity inverse binds must agree with the renderer/bone hierarchy.
  bindposes=raw(mesh)['m_BindPose']
  for bp,boneid in zip(bindposes,boneids):
   expected=np.linalg.inv(worlds[boneid])@worlds[ni];err=float(np.max(np.abs(expected-source_matrix(bp))));max_bind_error=max(max_bind_error,err)
   inverse=H@source_matrix(bp)@np.linalg.inv(worlds[ni])@H
   if boneid in original_inverses:inverse_difference=max(inverse_difference,float(np.max(np.abs(original_inverses[boneid]-inverse))))
   else:original_inverses[boneid]=inverse
  decoded.append({'name':name,'skinIndex':global_indices.ravel().tolist(),'skinWeight':weights.round(7).ravel().tolist(),'sourceBoneIndices':boneids,'sourceBindPoses':[matrix_array(source_matrix(m)) for m in bindposes]})
 if not decoded:raise ValueError('No skinned model parts')
 offset=np.mean(offsets,axis=0);offset_error=max(float(np.max(np.abs(o-offset))) for o in offsets)
 for n in nodes:n['sourceRest']={k:list(n[k]) for k in ['position','quaternion','scale']}
 nodes[0]['sourceRest']['position']=(np.array(nodes[0]['sourceRest']['position'])-offset).round(8).tolist()
 shift=np.eye(4);shift[:3,3]=-offset
 unshift=np.eye(4);unshift[:3,3]=offset
 bindworlds=[];inverses=[]
 for i,n in enumerate(nodes):
  if i in original_inverses:inv=original_inverses[i]@unshift;bw=np.linalg.inv(inv)
  else:
   local=H@(np.linalg.inv(worlds[n['parent']])@worlds[i] if n['parent']>=0 else worlds[i])@H
   if n['parent']<0:bw=shift@H@worlds[i]@H
   else:bw=bindworlds[n['parent']]@local
   inv=np.linalg.inv(bw)
  bindworlds.append(bw);inverses.append(matrix_array(inv))
  local=bw if n['parent']<0 else np.linalg.inv(bindworlds[n['parent']])@bw
  n['position'],n['quaternion'],n['scale']=decompose(local)
 pathmap={n['path']:i for i,n in enumerate(nodes)}
 clips=[]
 nano=id.startswith('nano-');priority=['stand1','stand2','walk','run','summon','skill0','skill1','skill2','spellcasting'] if nano else ['stand1','stand2','walk','run','ready','melee1','melee1upper','range1','skill0','skill1','death','wound']
 for cp in animations:
  clip=resolved(cp);name=clip.get('m_Name','clip')
  if not full_clips and name.lower() not in priority:continue
  tracks=[];duration=0
  def track(path,prop,times,values):
   nonlocal duration
   if not times or path not in pathmap:return
   bone=pathmap[path];duration=max(duration,max(times));arr=np.array(values,float);rest=np.array(nodes[bone][prop])
   # Root grounding is handled outside source animation channels.
   if bone==0 and prop=='position':arr-=offset
   if prop=='quaternion':
    for i in range(1,len(arr)):
     if arr[i]@arr[i-1]<0:arr[i]*=-1
    same=np.max(np.abs(arr-arr[0]))<1e-5;restsame=min(np.max(np.abs(arr[0]-rest)),np.max(np.abs(arr[0]+rest)))<.005
   else:same=np.max(np.abs(arr-arr[0]))<1e-6;restsame=np.max(np.abs(arr[0]-rest))<1e-5
   if same and restsame:return
   if same:times=[times[0]];arr=arr[:1]
   tracks.append({'bone':bone,'property':prop,'times':np.array(times).round(6).tolist(),'values':arr.round(7).ravel().tolist()})
  for curve in clip.get('m_CompressedRotationCurves',[]):
   delta=packed_int(curve['m_Times']);times=np.cumsum(delta)*.01;quats=unpack_quats(curve['m_Values']);track(curve['m_Path'],'quaternion',times.tolist(),quats)
  for key,prop in [('m_RotationCurves','quaternion'),('m_PositionCurves','position'),('m_ScaleCurves','scale')]:
   for curve in clip.get(key,[]):
    keys=curve['curve']['m_Curve'];times=[k['time'] for k in keys];values=[vec(k['value'],'xyzw' if prop=='quaternion' else 'xyz') for k in keys]
    if prop=='position':values=[[-v[0],v[1],v[2]] for v in values]
    elif prop=='quaternion':values=[[v[0],-v[1],-v[2],v[3]] for v in values]
    track(curve['path'],prop,times,values)
  for event in clip.get('m_Events',[]):duration=max(duration,event['time'])
  clips.append({'name':name,'duration':round(duration,6),'sampleRate':clip['m_SampleRate'],'tracks':tracks,'events':[{'time':e['time'],'function':e['functionName'],'data':e['data']} for e in clip.get('m_Events',[])]})
 data={'version':1,'id':id,'source':source,'coordinateSystem':'right-handed Y-up, forward +Z; same space as model JSON','offset':offset.round(8).tolist(),'bones':nodes,'boneInverses':inverses,'parts':decoded,'clips':clips,'validation':{'maxSourceRestVsBindError':max_bind_error,'maxSharedInverseDifference':inverse_difference,'maxPartOffsetDifference':offset_error,'sourceAnimationCount':len(animations),'exportedClips':len(clips),'originalSkin':True,'originalClips':True}}
 file=OUT/f'{id}.json';file.write_text(json.dumps(data,separators=(',',':')))
 print(id,'bones',len(nodes),'parts',len(decoded),'clips',[(c['name'],c['duration'],len(c['tracks'])) for c in clips],'binderr',round(max_bind_error,7),'offseterr',round(offset_error,7),'KB',round(file.stat().st_size/1024,1),flush=True)
 return data

def main():
 ids=sys.argv[1:] or ['nano-buttercup','nano-eddy','nano-deedee','enemy-spawn','enemy-gasspawn','enemy-robo','enemy-asphalt']
 for id in ids:
  try:
   model=json.loads((PROJECT/'dist/assets/models'/f'{id}.json').read_text());export_rig(id,model['source'])
  except Exception:traceback.print_exc()
if __name__=='__main__':main()
