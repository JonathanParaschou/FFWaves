"""Copy original voice clips read-only from the user's existing FusionFall cache."""
import collections, collections.abc, json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
DEPS = ROOT.parent / 'fusionfall-survival/.tools'
for name in ('Mapping','MutableMapping','Sequence','Iterable','MutableSequence'):
    if not hasattr(collections,name): setattr(collections,name,getattr(collections.abc,name))
sys.path[:0] = [str(DEPS/'UnityPackFF'),str(DEPS/'python-deps')]
from unitypack.environment import UnityEnvironment
CACHE = pathlib.Path.home()/'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
env = UnityEnvironment(str(CACHE))
entries = json.loads((DEPS/'audio_catalog.json').read_text())
paths = {e['path']:e for e in entries if e.get('type')=='AudioClip' or e['bundle']=='effects_2eresourceFile'}
aliases={'buttercup':'btrcup','humongousaur':'humongo','johnnybravo':'jbravo','juniperlee':'juniper','mojojo':'mojo','mojojojo':'mojo','numbuhfive':'numfive','numbuhfour':'numfour','numbuhone':'numone','numbuhthree':'numthree','numbuhtwo':'numtwo','samuraijack':'sjack'}
selected={}
for n in json.loads((ROOT/'dist/assets/nanos-catalog.json').read_text())['nanos']:
    name=n['asset'].removeprefix('nano-'); prefix=aliases.get(name,name)
    for kind,token in [('summon','nansummon'),('power','nanpwr')]:
        matches=sorted(p for p in paths if p.startswith('sound/'+prefix+'_'+token))
        for i,p in enumerate(matches[:3]): selected[f'{kind}-{n["id"]}-{i}']=p
for h in json.loads((ROOT/'dist/assets/heroes-catalog.json').read_text())['heroes']:
    matches=sorted(p for p in paths if p.startswith('sound/'+h['id']+'_hurt'))
    if not matches: matches=[f'sound/{"f" if h["id"] in ["buttercup","blossom","bubbles","deedee","mandy","gwen","numbuhfive","numbuhthree"] else "m"}_avatar_hurt01.wav',f'sound/{"f" if h["id"] in ["buttercup","blossom","bubbles","deedee","mandy","gwen","numbuhfive","numbuhthree"] else "m"}_avatar_hurt02.wav']
    for i,p in enumerate(matches[:2]): selected[f'hurt-{h["id"]}-{i}']=p
for i in range(3): selected[f'exert-{i}']=f'sound/samjack_attackgrunt{i+1}.wav'
manifest=json.loads((ROOT/'dist/assets/manifest.json').read_text())
for key,p in selected.items():
    e=paths[p]; a=env.get_asset_by_filename(str(CACHE/e['bundle']/e['file']))
    ptr=next(m['asset'] for path,m in a.objects[1].contents['m_Container'] if path==p)
    blob=ptr.resolve().audio_data
    ext='ogg' if blob[:4]==b'OggS' else 'wav' if blob[:4]==b'RIFF' else None
    if not ext: raise ValueError((key,blob[:8]))
    file=ROOT/'dist/assets/audio'/f'{key}.{ext}';file.write_bytes(blob)
    manifest['audio'][key]={'url':f'assets/audio/{file.name}','source':p,'bytes':len(blob)}
(ROOT/'dist/assets/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Exported {len(selected)} original player/Nano clips.')
