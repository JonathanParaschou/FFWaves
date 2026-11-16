import sys, pathlib, json, traceback, collections, collections.abc
for n in ('Mapping','MutableMapping','Sequence','Iterable','MutableSequence'):
    if not hasattr(collections,n): setattr(collections,n,getattr(collections.abc,n))
ROOT=pathlib.Path(__file__).resolve().parent.parent/'.tools'
sys.path[:0]=[str(ROOT/'UnityPackFF'),str(ROOT/'python-deps')]
from unitypack.asset import Asset
from unitypack.environment import UnityEnvironment
CACHE=pathlib.Path.home()/'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
env=UnityEnvironment(str(CACHE))
entries=[]
names=sys.argv[1:] or ['nano_2eresourceFile','world_5fshared_5fpart1_2eresourceFile','world_5fshared_5fpart2_2eresourceFile','world_5fshared_5fpart3_2eresourceFile','world_5fshared_5fpart4_2eresourceFile','world_5fshared_5fpart5_2eresourceFile','dongresources_5f04_5f04_2eresourceFile','charactercreation_2eresourceFile','characterselection_2eresourceFile','freearea_5fshared_2eresourceFile','chartexture_2eresourceFile','npctexture_2eresourceFile','icons_2eresourceFile','dongresources_5f09_5f06_2eresourceFile','dongresources_5f09_5f07_2eresourceFile','dongresources_5f10_5f10_2eresourceFile']
for name in names:
  folder=CACHE/name
  for file in folder.glob('CustomAssetBundle*'):
    try:
      asset=env.get_asset_by_filename(str(file))
      cont=asset.objects[1].read()['m_Container']
      print(name,'objects',len(asset.objects),'container',len(cont),flush=True)
      for path,meta in cont:
        ptr=meta['asset']
        entries.append({'bundle':name,'file':file.name,'path':path,'id':ptr.path_id,'file_id':ptr.file_id,'type':ptr.object.type})
    except Exception as exc: traceback.print_exc()
out=ROOT/'catalog.json';out.write_text(json.dumps(entries,indent=2));print('Entries',len(entries))
for e in entries:
  if any(word in e['path'].lower() for word in ['gun','rifle','pistol','shotgun','nano','dex','crat','fence','tree','zombie','fusion','golem','scamp','slime']): print(e['type'],e['path'])

