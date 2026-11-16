"""Index additional read-only resource bundles without replacing the primary catalog."""
import sys,pathlib,json,collections,collections.abc
for n in ('Mapping','MutableMapping','Sequence','Iterable','MutableSequence'):
 if not hasattr(collections,n):setattr(collections,n,getattr(collections.abc,n))
PROJECT=pathlib.Path(__file__).resolve().parent.parent
TOOLS=PROJECT/'.tools';sys.path[:0]=[str(TOOLS/'UnityPackFF'),str(TOOLS/'python-deps')]
from unitypack.environment import UnityEnvironment
CACHE=pathlib.Path.home()/'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
env=UnityEnvironment(str(CACHE));prior=json.loads((TOOLS/'catalog.json').read_text());known=set(e['bundle'] for e in prior);entries=[]
for folder in sorted(CACHE.iterdir()):
 if not folder.is_dir() or folder.name in known or not folder.name.endswith('resourceFile'):continue
 for file in folder.glob('CustomAssetBundle*'):
  try:
   asset=env.get_asset_by_filename(str(file));cont=asset.objects[1].contents['m_Container']
   for path,meta in cont:
    ptr=meta['asset'];entries.append({'bundle':folder.name,'file':file.name,'path':path,'id':ptr.path_id,'file_id':ptr.file_id,'type':ptr.object.type})
   print(folder.name,len(cont),flush=True)
  except Exception as e:print('SKIP',folder.name,str(e),flush=True)
(TOOLS/'extra-catalog.json').write_text(json.dumps(entries,indent=2))
print('NPCS',sorted(set(e['path'] for e in entries if e['type']=='GameObject' and e['path'].startswith('mob/npc_'))),flush=True)
