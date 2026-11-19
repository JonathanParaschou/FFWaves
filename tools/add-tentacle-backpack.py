"""Recover the original Nergal Tendrils back item without modifying the cache."""
from pathlib import Path
import json,subprocess
ROOT=Path(__file__).resolve().parent.parent
DEPS=ROOT.parent/'fusionfall-survival/.tools'
OUT=ROOT/'dist/assets'
base=ROOT/'tools/extract-fusionfall.py'
code=base.read_text().split('\nselected=')[0]
code=code.replace("ROOT=pathlib.Path(__file__).resolve().parent.parent/'.tools'",'ROOT=pathlib.Path('+repr(str(DEPS))+')')
code=code.replace("OUT=ROOT.parent/'dist/assets'",'OUT=pathlib.Path('+repr(str(OUT))+')')
code=code.replace("catalog=json.loads((ROOT/'catalog.json').read_text())",'catalog=json.loads(pathlib.Path('+repr(str(ROOT/'.tools/library-review/catalog.json'))+').read_text())')
ns={'__file__':str(base),'__name__':'tentacle_backpack_extract'};exec(compile(code,str(base),'exec'),ns)
table=json.loads((DEPS/'research/xdt.json').read_text(encoding='utf-8'))['m_pBackItemTable']
row=next(r for r in table['m_pItemData']if r['m_iItemNumber']==21)
skin=table['m_pItemMeshData'][row['m_iMesh']]
name=table['m_pItemStringData'][row['m_iItemName']]['m_strName']
ident='nergal-tendrils';asset='accessory-'+ident;source='wear/'+skin['m_pstrMMeshModelString'].lower()+'.nif'
ns['extract'](asset,source)
rig_file=ROOT/'tools/export-rigs.py';rig_code=rig_file.read_text().replace("TOOLS=PROJECT/'.tools'",'TOOLS=pathlib.Path('+repr(str(DEPS))+')')
rig_code=rig_code.replace("catalog=json.loads((TOOLS/'catalog.json').read_text())",'catalog=json.loads(pathlib.Path('+repr(str(ROOT/'.tools/library-review/catalog.json'))+').read_text())')
rig_ns={'__file__':str(rig_file),'__name__':'tentacle_backpack_rig'};exec(compile(rig_code,str(rig_file),'exec'),rig_ns)
rig=rig_ns['export_rig'](asset,source,full_clips=True)
manifest=json.loads((OUT/'manifest.json').read_text())
texture_name=skin['m_pstrMTextureString'].lower()
texture=next((t for t in manifest['textures'].values()if t['name'].lower().removesuffix('.dds')==texture_name),None)
if not texture:
 entry=next(e for e in ns['catalog']if e['type']=='Texture2D'and e['path'].lower()=='texture/'+texture_name+'.dds')
 bundle=ns['env'].get_asset_by_filename(str(ns['CACHE']/entry['bundle']/entry['file']))
 pointer=next(meta['asset']for path,meta in bundle.objects[1].contents['m_Container']if path.lower()==entry['path'].lower())
 texture=ns['export_texture'](pointer)
path=OUT/'models'/(asset+'.json');model=json.loads(path.read_text())
for part in model['parts']:
 for material in part['materials']:material['map']=texture['map'];material['alphaTest']=.3 if texture['alpha']else 0
path.write_text(json.dumps(model,separators=(',',':')))
entry=ns['manifest']['assets'][asset];entry['bytes']=path.stat().st_size
manifest['assets'][asset]=entry;manifest['textures'].update(ns['manifest']['textures'])
animation={'url':'assets/animations/'+asset+'.json','source':'Original FusionFall skeleton and AnimationClip curves'}
manifest.setdefault('animations',{})[asset]=animation
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
catalog=json.loads((OUT/'heroes-catalog.json').read_text())
record={'id':ident,'name':name,'asset':asset,'slot':'back','height':1.05,'targetHeight':1.05,'sourceHeight':model['bounds']['size'][1],'sourceDimensions':model['bounds']['size'],'offset':[0,0,-.16],'rotation':[0,0,0],'portrait':'assets/ui/'+asset+'.webp','attachment':{'preferredSocket':'back','anchor':'center','heroRootFallback':[0,.64,-.14],'fallbackUnits':'fraction-of-hero-height','offsetUnits':'world units at hero targetHeight 1.8','fitIsAuthored':True},'sourceItemId':row['m_iItemNumber'],'sourceTable':'m_pBackItemTable','source':source,'bodyTexture':skin['m_pstrMTextureString'],'secondaryTexture':skin['m_pstrMTextureString2']}
record['rig']=animation['url'];record['originalAnimations']=[{'name':c['name'],'duration':c['duration']}for c in rig['clips']]
catalog['accessories']=[r for r in catalog['accessories']if r['id']!=ident]+[record]
catalog['assets'][asset]=entry;catalog['textures'].update(ns['manifest']['textures'])
catalog.setdefault('animations',{})[asset]=animation
(OUT/'heroes-catalog.json').write_text(json.dumps(catalog,indent=2))
renderer=(DEPS/'render_assets.py').read_text().split('\nids=')[0].replace("ROOT=pathlib.Path(__file__).resolve().parent.parent",'ROOT=pathlib.Path('+repr(str(ROOT))+')')
render={'__file__':str(DEPS/'render_assets.py'),'__name__':'tentacle_backpack_portrait'};exec(compile(renderer,'tentacle_backpack_portrait','exec'),render)
render['render'](asset,size=384,transparent=True,label=False).save(ROOT/'dist'/record['portrait'],'WEBP',quality=92,method=5)
print(name,source,'original item',row['m_iItemNumber'],'dimensions',model['bounds']['size'],flush=True)
subprocess.run(['node','tools/fit-tentacle-backpack.mjs'],cwd=ROOT,check=True)
