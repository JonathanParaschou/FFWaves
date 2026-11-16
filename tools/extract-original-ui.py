import sys,pathlib,json,collections,collections.abc,re
for n in ('Mapping','MutableMapping','Sequence','Iterable','MutableSequence'):
 if not hasattr(collections,n):setattr(collections,n,getattr(collections.abc,n))
ROOT=pathlib.Path(__file__).resolve().parent.parent;sys.path[:0]=[str(ROOT/'.tools/UnityPackFF'),str(ROOT/'.tools/python-deps')]
from PIL import Image,ImageOps,ImageDraw
from unitypack.environment import UnityEnvironment
CACHE=pathlib.Path.home()/'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
OUT=ROOT/'dist/assets/ui-original';OUT.mkdir(parents=True,exist_ok=True)
env=UnityEnvironment(str(CACHE));catalog=json.loads((ROOT/'.tools/catalog.json').read_text());manifest={'source':'Original FusionFall cached icon/help assets','references':{},'textures':{}}
names=['mini-map','nano_com','nano_stamina','nano_wheel','nanocom','rest_100','scores','mob_hp','menu_chat','satellite_map','character_screen','power_selection','powers1','powers2','shortcuts','vendor_screen','mission_journal','nano_tune','selection','login','characterselection']
for name in names:
 path='help/'+name+'.jpg';e=next((e for e in catalog if e['path']==path and e['type']=='Texture2D'),None)
 if not e:continue
 a=env.get_asset_by_filename(str(CACHE/e['bundle']/e['file']));ptr=next(meta['asset'] for p,meta in a.objects[1].contents['m_Container'] if p==path)
 tex=ptr.resolve();image=ImageOps.flip(tex.image).convert('RGBA');dest=OUT/(name+'.webp');image.save(dest,'WEBP',quality=95)
 manifest['references'][name]={'url':f'assets/ui-original/{name}.webp','source':path,'size':list(image.size)}
 print(name,image.size,flush=True)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
thumbW,thumbH=300,245;sheet=Image.new('RGB',(thumbW*4,thumbH*((len(manifest['references'])+3)//4)),'#172326');d=ImageDraw.Draw(sheet)
for i,(name,m) in enumerate(manifest['references'].items()):
 im=Image.open(OUT/(name+'.webp')).convert('RGBA');im.thumbnail((290,215));x=i%4*thumbW+(thumbW-im.width)//2;y=i//4*thumbH;sheet.paste(im,(x,y),im);d.text((i%4*thumbW+8,y+220),name,fill='white')
sheet.save(ROOT/'.tools/original-ui-contact.png')
