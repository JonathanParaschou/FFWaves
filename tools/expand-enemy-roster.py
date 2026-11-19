"""Audit the complete original NPC table and curate 40 distinct animated enemy models.

Original cache is read-only. Names, skins and rigs are recovered; FPS roles,
dimensions, wave windows and combat statistics are authored adaptations.
"""
from pathlib import Path
import json,hashlib,subprocess,sys
ROOT=Path(__file__).resolve().parent.parent
DEPS=ROOT.parent/'fusionfall-survival/.tools'
OUT=ROOT/'dist/assets'
cache_catalog=ROOT/'.tools/library-review/catalog.json'
catalog=json.loads(cache_catalog.read_text())
xdt_path=DEPS/'research/xdt.json'
xdt=json.loads(xdt_path.read_text(encoding='utf-8'));table=xdt['m_pNpcTable']
available={e['path'].lower():e for e in catalog if e['type']=='GameObject'}
textures={e['path'].lower():e for e in catalog if e['type']=='Texture2D'}

# ID, original NPC number, FPS tier/role, HP, speed, damage, body radius/height.
selection=[
 ('tech-drone',60,1,'chaser',56,2.25,12,.42,1.05),
 ('cyber-stinger',83,2,'ranged',76,2.1,12,.42,1.05),
 ('tech-wing',99,2,'runner',72,2.8,13,.4,1.10),
 ('newsprint-ninja',69,2,'runner',85,2.95,16,.48,1.8),
 ('painsaw',68,2,'chaser',92,2.35,18,.5,1.65),
 ('motor-raptor',75,3,'runner',126,2.8,19,.55,1.65),
 ('verminator',116,3,'ranged',135,1.55,18,.55,1.9),
 ('dire-hydra',70,2,'ranged',94,1.5,15,.48,1.6),
 ('barrel-buster',66,1,'chaser',78,1.8,15,.52,1.5),
 ('heavy-hauler',73,3,'bruiser',240,1.45,23,.7,2.4),
 ('mech-queen',200,4,'elite',690,1.4,26,.8,2.5),
 ('road-golem',62,3,'bruiser',225,1.55,24,.65,2.35),
 ('doom-boiler',129,3,'ranged',190,1.35,21,.6,2.1),
 ('gear-goon',130,3,'chaser',170,2.1,20,.55,2.0),
 ('weird-welder',128,3,'ranged',150,1.75,18,.5,1.9),
 ('ventilator',127,4,'runner',215,2.8,22,.6,2.1),
 ('killowatt',215,4,'ranged',210,1.75,22,.5,1.9),
 ('hydraulic-enforcer',212,5,'elite',1050,1.4,30,.85,2.65),
 ('riot-rogue',178,4,'bruiser',340,1.5,26,.7,2.3),
 ('sonic-scorpion',145,4,'ranged',240,1.85,23,.6,1.8),
 ('oil-ogre',204,5,'elite',1050,1.25,31,.85,2.65),
 ('magma-hulk',2049,5,'elite',1250,1.25,32,.9,2.65),
 ('eyebulb',2059,5,'ranged',290,1.8,24,.55,2.15),
 ('extremospawn',123,5,'runner',275,2.9,25,.65,2.4),
]
base_ids=['spawn','gas','robo','asphalt','spidertoad','skeeter','stalker','growth','dreadhead','shocktangler','unisickle','packarachnid','crashloader','scraptyrant','junkasaurus','streetgrinder']
runtime=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {ENEMY_TYPES} from './dist/simulation.js';process.stdout.write(JSON.stringify(ENEMY_TYPES));"],cwd=ROOT))
runtime={k:runtime[k]for k in base_ids}
manifest=json.loads((OUT/'manifest.json').read_text())
biome=json.loads((OUT/'biome-kit.json').read_text())
preferred={'spawn':55,'gas':63,'robo':146,'asphalt':543,'skeeter':133}
tiers={'spawn':1,'gas':1,'robo':3,'asphalt':3,'spidertoad':2,'skeeter':2,'stalker':3,'growth':4,'dreadhead':1,'shocktangler':2,'unisickle':3,'packarachnid':1,'crashloader':2,'scraptyrant':3,'junkasaurus':4,'streetgrinder':4}
rows={r['m_iNpcNumber']:r for r in table['m_pNpcData']}

# Publish the entire hostile table, including Fusion heroes and unavailable models.
library={}
for row in table['m_pNpcData']:
 if row['m_iTeam']!=2:continue
 mesh=table['m_pNpcMeshData'][row['m_iMesh']];name=table['m_pNpcStringData'][row['m_iNpcName']]['m_strName']
 source='mob/'+mesh['m_pstrMMeshModelString'].lower()+'.kfm'
 key=(name,source,mesh['m_pstrMTextureString'],mesh['m_pstrMTextureString2'])
 if key not in library:library[key]={'name':name,'source':source,'bodyTexture':key[2],'secondaryTexture':key[3],'npcIds':[],'sourceLevels':[],'cachedModel':source in available}
 item=library[key];item['npcIds'].append(row['m_iNpcNumber'])
 if row['m_iNpcLevel']not in item['sourceLevels']:item['sourceLevels'].append(row['m_iNpcLevel'])
inventory={'source':'Original XDT NPC table, m_iTeam == 2; duplicate encounter/stat rows grouped by name, mesh and skins','tableSha256':hashlib.sha256(xdt_path.read_bytes()).hexdigest(),'hostileRows':sum(r['m_iTeam']==2 for r in table['m_pNpcData']),'uniqueIdentities':len(library),'cachedEnemyModelPaths':len([p for p in available if p.startswith('mob/mob_')]),'entries':sorted(library.values(),key=lambda r:r['name'].lower())}
(OUT/'enemy-library.json').write_text(json.dumps(inventory,indent=2))
print('AUDIT',inventory['hostileRows'],'hostile rows,',len(library),'identities,',inventory['cachedEnemyModelPaths'],'cached monster models',flush=True)

base=ROOT/'tools/extract-fusionfall.py';code=base.read_text().split('\nselected=')[0]
code=code.replace("ROOT=pathlib.Path(__file__).resolve().parent.parent/'.tools'",'ROOT=pathlib.Path('+repr(str(DEPS))+')')
code=code.replace("OUT=ROOT.parent/'dist/assets'",'OUT=pathlib.Path('+repr(str(OUT))+')')
code=code.replace("catalog=json.loads((ROOT/'catalog.json').read_text())",'catalog=json.loads(pathlib.Path('+repr(str(cache_catalog))+').read_text())')
ns={'__file__':str(base),'__name__':'enemy_roster_extract'};exec(compile(code,str(base),'exec'),ns)
rig_file=ROOT/'tools/export-rigs.py';code=rig_file.read_text().replace("TOOLS=PROJECT/'.tools'",'TOOLS=pathlib.Path('+repr(str(DEPS))+')')
code=code.replace("catalog=json.loads((TOOLS/'catalog.json').read_text())",'catalog=json.loads(pathlib.Path('+repr(str(cache_catalog))+').read_text())')
rig={'__file__':str(rig_file),'__name__':'enemy_roster_rigs'};exec(compile(code,str(rig_file),'exec'),rig)
reuse={r['name'].lower().removesuffix('.dds'):r for r in manifest['textures'].values()}
def texture(name):
 key=name.lower().removesuffix('.dds')
 if key in reuse:return reuse[key]
 entry=textures['texture/'+key+'.dds'];asset=ns['env'].get_asset_by_filename(str(ns['CACHE']/entry['bundle']/entry['file']))
 ptr=next(meta['asset']for path,meta in asset.objects[1].contents['m_Container']if path.lower()==entry['path'].lower())
 reuse[key]=ns['export_texture'](ptr);return reuse[key]

records={}
def record(ident,row,cfg):
 mesh=table['m_pNpcMeshData'][row['m_iMesh']];name=table['m_pNpcStringData'][row['m_iNpcName']]['m_strName'];source='mob/'+mesh['m_pstrMMeshModelString'].lower()+'.kfm'
 cfg['name']=name;cfg['tier']=cfg.get('tier',tiers.get(ident,1));cfg['role']=cfg.get('role','elite'if cfg.get('elite')else'ranged'if cfg.get('ranged')else'runner'if cfg.get('runner')else'chaser')
 cfg['fromWave']=[0,1,3,7,12,20][cfg['tier']];cfg['toWave']=[0,9,18,28,None,None][cfg['tier']]
 if cfg.get('elite'):cfg['fromWave']=max(5,cfg['fromWave']);cfg['toWave']=None
 if ident=='gas':cfg['fromWave']=2
 if ident=='asphalt':cfg['fromWave']=5
 if ident=='growth':cfg['fromWave']=5
 cfg['sourceNpcId']=row['m_iNpcNumber'];cfg['sourceLevel']=row['m_iNpcLevel']
 if cfg.get('ranged'):
  kind='electric'if ident in ['shocktangler','cyber-stinger','killowatt','sonic-scorpion']else'fire'if ident in ['doom-boiler','weird-welder']else'void'if ident=='eyebulb'else'plasma'if ident=='verminator'else'toxic'
  cfg['projectile']={'kind':kind,'speed':8.5 if cfg['tier']<3 else 10,'size':.38 if cfg['tier']<4 else .46,'count':3 if ident in ['killowatt','eyebulb']else 2 if ident=='verminator'else 1,'spread':.14,'windup':.85 if cfg['tier']<4 else 1.05,'cooldown':2.5}
 records[ident]={'id':ident,'name':name,'asset':cfg['asset'],'source':source,'npcId':row['m_iNpcNumber'],'sourceLevel':row['m_iNpcLevel'],'bodyTexture':mesh['m_pstrMTextureString'],'secondaryTexture':mesh['m_pstrMTextureString2'],'portrait':'assets/ui/'+cfg['asset']+'.webp','tier':cfg['tier'],'role':cfg['role'],'fromWave':cfg['fromWave'],'toWave':cfg['toWave'],'fpsAdaptation':True,'stats':cfg}
 runtime[ident]=cfg

for ident in base_ids:
 cfg=runtime[ident];npc=preferred.get(ident,biome['enemies'].get(cfg['asset'],{}).get('npcId'))
 record(ident,rows[npc],cfg)
for ident,npc,tier,role,hp,speed,damage,radius,height in selection:
 row=rows[npc];mesh=table['m_pNpcMeshData'][row['m_iMesh']];source='mob/'+mesh['m_pstrMMeshModelString'].lower()+'.kfm';asset_id='enemy-'+ident
 ns['extract'](asset_id,source);skin=texture(mesh['m_pstrMTextureString']);second=mesh['m_pstrMTextureString2'];sub=texture(second)if second and second.lower()not in('null','')else skin
 path=OUT/'models'/f'{asset_id}.json';model=json.loads(path.read_text())
 for part in model['parts']:
  for mat in part['materials']:
   tex=sub if '-sub-'in mat['name'].lower()else skin;mat['map']=tex['map'];mat['alphaTest']=.3 if tex['alpha']else 0
 path.write_text(json.dumps(model,separators=(',',':')))
 ns['manifest']['assets'][asset_id]['bytes']=path.stat().st_size
 rig['export_rig'](asset_id,source,full_clips=True)
 manifest.setdefault('animations',{})[asset_id]={'url':'assets/animations/'+asset_id+'.json','source':'Original FusionFall skeleton and AnimationClip curves'}
 cfg=dict(asset=asset_id,tier=tier,role=role,hp=hp,speed=speed,damage=damage,radius=radius,height=height,reward=85+tier*20)
 if role=='ranged':cfg['ranged']=True
 if role=='runner':cfg['runner']=True
 if role=='elite':cfg.update(elite=True,slam=True,reward=450+tier*25)
 if ident in ['cyber-stinger','tech-wing']:cfg['hover']=.45
 record(ident,row,cfg)
manifest['assets'].update(ns['manifest']['assets']);manifest['textures'].update(ns['manifest']['textures']);(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
assert len(records)==40 and len({r['source']for r in records.values()})==40
roster={'source':'Original FusionFall table names/skins and read-only cached geometry/rigs. FPS behavior and wave assignments are authored.','librarySummary':{k:v for k,v in inventory.items()if k!='entries'},'enemies':records}
(OUT/'enemy-roster.json').write_text(json.dumps(roster,indent=2))
(ROOT/'dist/enemy-roster.js').write_text('// Original source identities; authored FPS balance and progression.\nexport const ENEMY_TYPES='+json.dumps(runtime,separators=(',',':'))+';\n')
# Reuse the established source-model portrait renderer after publishing textures.
code=(DEPS/'render_assets.py').read_text().split('\nids=')[0].replace("ROOT=pathlib.Path(__file__).resolve().parent.parent",'ROOT=pathlib.Path('+repr(str(ROOT))+')')
renderer={'__file__':str(DEPS/'render_assets.py'),'__name__':'enemy_roster_portraits'};exec(compile(code,'enemy_roster_portraits','exec'),renderer)
for ident,record_data in records.items():renderer['render'](record_data['asset'],size=256,transparent=True,label=False).save(ROOT/'dist'/record_data['portrait'],'WEBP',quality=92,method=5)
print('CURATED',len(records),'distinct animated original enemies',flush=True)
