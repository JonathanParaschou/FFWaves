"""Recover selected original recordings byte-for-byte from the existing local cache."""
import collections, collections.abc, hashlib, json, pathlib, struct, sys
ROOT=pathlib.Path(__file__).resolve().parent.parent
DEPS=ROOT.parent/'fusionfall-survival/.tools'
for n in ('Mapping','MutableMapping','Sequence','Iterable','MutableSequence'):
    if not hasattr(collections,n):setattr(collections,n,getattr(collections.abc,n))
sys.path[:0]=[str(DEPS/'UnityPackFF'),str(DEPS/'python-deps')]
from unitypack.environment import UnityEnvironment
CACHE=pathlib.Path.home()/'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
OUT=ROOT/'dist/assets/music-original';OUT.mkdir(exist_ok=True)
env=UnityEnvironment(str(CACHE))
selected={
 'main-theme':('Main Theme','lobbymusic_2eresourceFile','bgm/00 main theme.ogg'),
 'tech-center':('Tech Center','pastmusic_2eresourceFile','bgm/06 tech center.ogg'),
 'suburbia':('Suburbia','pastmusic_2eresourceFile','bgm/02 suburbia.ogg'),
 'woods':('Woods','pastmusic_2eresourceFile','bgm/08 woods.ogg'),
 'reactor-works':('Reactor Works','pastmusic_2eresourceFile','bgm/08 reactor works.ogg'),
 'midtown':('Midtown','pastmusic_2eresourceFile','bgm/05 midtown.ogg'),
}
catalog={'version':1,'source':'Original FusionFall Unity Web Player cache, read-only','processing':'Unmodified original Ogg/Vorbis bytes; no resampling or transcoding.','ownership':'Original recordings remain the property of their original rights holders.','tracks':{}}
for ident,(title,bundle,path) in selected.items():
    found=False
    for file in (CACHE/bundle).glob('CustomAssetBundle*'):
        a=env.get_asset_by_filename(str(file))
        for p,meta in a.objects[1].contents['m_Container']:
            if p!=path:continue
            data=meta['asset'].resolve().audio_data
            assert data[:4]==b'OggS'
            sample=struct.unpack_from('<I',data,data.index(b'\x01vorbis')+12)[0]
            samples=struct.unpack_from('<Q',data,data.rindex(b'OggS')+6)[0]
            (OUT/(ident+'.ogg')).write_bytes(data)
            catalog['tracks'][ident]={'title':title,'url':'assets/music-original/'+ident+'.ogg','source':path,'bundle':bundle,'file':file.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'duration':round(samples/sample,3),'sampleRate':sample}
            found=True
    assert found,path
(OUT/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
print(json.dumps({k:{'title':v['title'],'seconds':v['duration'],'bytes':v['bytes']} for k,v in catalog['tracks'].items()}))
