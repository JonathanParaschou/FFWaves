"""Read-only inventory of every locally present FusionFall bundle container.

This indexes paths and types, not the full game's unavailable/downloadable assets.
Each bundle gets its own environment so the complete cache need not stay in RAM.
"""
import collections
import collections.abc
import gc
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
DEPS = ROOT.parent / 'fusionfall-survival/.tools'
for name in ('Mapping','MutableMapping','Sequence','Iterable','MutableSequence'):
    if not hasattr(collections,name):
        setattr(collections,name,getattr(collections.abc,name))
sys.path[:0] = [str(DEPS/'UnityPackFF'),str(DEPS/'python-deps')]
from unitypack.environment import UnityEnvironment

CACHE = Path.home()/'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
OUT = ROOT/'.tools/library-review'
OUT.mkdir(parents=True,exist_ok=True)
files = sorted(CACHE.glob('*/CustomAssetBundle*'))
records=[]
bundles=[]
for index,file in enumerate(files):
    env=UnityEnvironment(str(CACHE))
    start=time.time()
    try:
        asset=env.get_asset_by_filename(str(file))
        entries=[]
        for path,meta in asset.objects[1].contents['m_Container']:
            ptr=meta['asset']
            entries.append({'bundle':file.parent.name,'file':file.name,'path':path,'id':ptr.path_id,'file_id':ptr.file_id,'type':ptr.object.type})
        records.extend(entries)
        bundles.append({'bundle':file.parent.name,'file':file.name,'bytes':file.stat().st_size,'entries':len(entries),'status':'indexed'})
        print(index+1,'/',len(files),file.parent.name,len(entries),round(time.time()-start,2),'s',flush=True)
    except Exception as error:
        bundles.append({'bundle':file.parent.name,'file':file.name,'bytes':file.stat().st_size,'status':'failed','error':str(error)})
        print('FAILED',file.parent.name,str(error),flush=True)
    finally:
        del env
        if 'asset' in locals():del asset
        gc.collect()
    (OUT/'catalog.json').write_text(json.dumps(records,separators=(',',':')))
    (OUT/'bundles.json').write_text(json.dumps(bundles,indent=2))
models={r['path']:r for r in records if r['type']=='GameObject' and r['path'].startswith('map/')}
summary={'scope':'Every CustomAssetBundle file actually present in the local FusionFall cache; unavailable cache directories are not recovered assets.',
    'cacheFolders':sum(p.is_dir()for p in CACHE.iterdir()),'bundlesPresent':len(files),'bundlesIndexed':sum(b['status']=='indexed'for b in bundles),
    'failures':[b for b in bundles if b['status']=='failed'],'containerEntries':len(records),'uniqueMapModels':len(models),
    'regions':dict(sorted(collections.Counter(p.split('/')[1]for p in models).items()))}
(OUT/'summary.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary),flush=True)
