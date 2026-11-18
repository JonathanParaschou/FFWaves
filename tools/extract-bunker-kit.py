"""Review a coherent lab kit from the complete cached library, then publish approved art.

--review exports candidates only into .tools/library-review/candidates.
--publish copies the approved subset into the deployable asset manifest.
Raw game cache and original source models remain read-only.
"""
import json
import hashlib
from pathlib import Path
import sys
import shutil

ROOT=Path(__file__).resolve().parent.parent
DEPS=ROOT.parent/'fusionfall-survival/.tools'
REVIEW=ROOT/'.tools/library-review'
DEST=REVIEW/'candidates'
OUT=DEST/'dist/assets'
base=ROOT/'tools/extract-fusionfall.py'
code=base.read_text().split('\nselected=')[0]
code=code.replace("ROOT=pathlib.Path(__file__).resolve().parent.parent/'.tools'",'ROOT=pathlib.Path('+repr(str(DEPS))+')')
code=code.replace("OUT=ROOT.parent/'dist/assets'",'OUT=pathlib.Path('+repr(str(OUT))+')')
code=code.replace("catalog=json.loads((ROOT/'catalog.json').read_text())",'catalog=json.loads(pathlib.Path('+repr(str(REVIEW/'catalog.json'))+').read_text())')
ns={'__file__':str(base),'__name__':'lab_kit_review'}
exec(compile(code,str(base),'exec'),ns)
selection={
 'lab-cabinet':'map/questitem/quest_item_cabinets_01.nif',
 'lab-cabinet-low':'map/questitem/quest_item_cabinets_02.nif',
 'lab-cargo-case':'map/questitem/quest_item_crates_01.nif',
 'lab-toolbox':'map/questitem/quest_item_box.nif',
 'lab-chest':'map/questitem/quest_item_chests.nif',
 'lab-comms-dish':'map/questitem/quest_item_communications_dish.nif',
 'lab-beacon':'map/questitem/quest_item_floating_beacon.nif',
 'lab-field-device':'map/questitem/quest_item_k_ecom.nif',
 'lab-field-device-b':'map/questitem/quest_item_k_ecom_b2.nif',
 'lab-handcart':'map/etc/etc_handcart_01.nif',
 'lab-chair':'map/etc/etc_chair_01.nif',
 'lab-chair-b':'map/etc/etc_chair_02.nif',
 'lab-office-chair':'map/cityhall/dt_cpch_chair.nif',
 'lab-metal-chair':'map/dtetc/dt_mtdb_chair_a01.nif',
 'lab-control-panel':'map/dinosaurvalley/wd_dldv_panel_01.nif',
 'lab-research-head':'map/questitem/qust_itemt_headoflarry3000.nif',
 'lab-table':'map/dtetc/dt_etc_table_01.nif',
 'lab-table-b':'map/dtetc/dt_etc_table_02.nif',
 'lab-bubble-machine':'map/ep/ep_bubblemachine_00.nif',
 'lab-bubble-module':'map/ep/ep_bubblemachine_00_1.nif',
 'lab-fissure-engine':'map/ep/ep_cpfi_fissure_engine_01.nif',
 'lab-gas-tank':'map/darkengine/dt_sdde_gastank_01.nif',
 'lab-machine-bank':'map/darkengine/dt_sdde_aroundobj_01_01.nif',
 'lab-transformer':'map/darkengine/dt_sdde_aroundobj_02_01.nif',
 'lab-pump':'map/darkengine/dt_sdde_aroundobj_03_01.nif',
 'lab-pipe-straight':'map/ep/ep_pipe_b_01.nif',
 'lab-pipe-elbow':'map/ep/ep_pipe_b_02.nif',
 'lab-pipe-branch':'map/ep/ep_pipe_b_03.nif',
 'lab-pipe-red':'map/ep/ep_pipe_r_01.nif',
 'lab-pipe-yellow':'map/ep/ep_pipe_y_01.nif',
 'lab-duct':'map/ep/ep_obj_pipe_02.nif',
 'lab-cylinder-bank':'map/nuclearplant/sb_otnp_etc_cylinder_02.nif',
 'lab-worklight':'map/nuclearplant/sb_otnp_etc_light.nif',
 'lab-dextech-sign':'map/technologysquare/dt_sdts_dexter_sign_board.nif',
 'lab-dextech-hq':'map/technologysquare/dt_sdts_dextech_headquarters_01.nif',
 'lab-tech-building':'map/technologysquare/dt_sdts_tech_building01.nif',
 'lab-dexter-robot':'map/fuseslair/wd_dlfl_dexter_robot_01.nif',
 'lab-robot-arm':'map/fuseslair/wd_dlfl_war_obj_robot_arm.nif',
 'lab-maintenance-robot':'map/constructionsite/dt_mtct_saferobot_01.nif',
}

# Filled from the actual candidate geometry/material review. No random selection.
approved={'lab-cabinet','lab-cabinet-low','lab-cargo-case','lab-toolbox','lab-field-device','lab-field-device-b','lab-table','lab-beacon','lab-bubble-machine','lab-comms-dish','lab-dextech-sign','lab-dextech-hq','lab-tech-building','lab-robot-arm','lab-pump','lab-cylinder-bank','lab-metal-chair','lab-research-head'}
rejection_reasons={
 'lab-chest':'Pirate-style treasure chest does not fit a research workcell.',
 'lab-handcart':'Rustic wooden farm cart does not fit indoor laboratory servicing.',
 'lab-chair':'Heavy wooden domestic chair; use the smaller metal folding chair.',
 'lab-chair-b':'Wooden stool does not match the selected metal workbench.',
 'lab-office-chair':'Actual mesh is an outdoor wooden bench, despite the candidate name.',
 'lab-control-panel':'Actual mesh is a freestanding paper map board, not an electronic console.',
 'lab-table-b':'Low coffee-table form lacks the workbench storage and maintenance role.',
 'lab-bubble-module':'No useful visible surface in the extracted standalone mesh.',
 'lab-fissure-engine':'Organic green fissure asset conflicts with clean DexTech equipment.',
 'lab-gas-tank':'36-metre industrial installation; shrinking it into a room would destroy scale cues.',
 'lab-machine-bank':'Large outdoor industrial block has no clear servicing role in the retained bays.',
 'lab-transformer':'Actual mesh is a rusty drum; adds outdoor salvage clutter.',
 'lab-worklight':'12-metre outdoor mast is inappropriate for the retained ceiling height.',
 'lab-dexter-robot':'Static humanoid robot can be misread as a combatant.',
 'lab-maintenance-robot':'Static humanoid robot can be misread as a combatant.'
}
for ident in selection:
 if ident.startswith('lab-pipe-')or ident=='lab-duct':
  rejection_reasons[ident]='Original texture is moss-covered outdoor pipework; incompatible with the indoor lab palette.'
records={}
for ident,path in selection.items():
 if '--review' in sys.argv or not (OUT/'models'/f'{ident}.json').exists():
  try:ns['extract'](ident,path)
  except Exception as error:print('CANDIDATE FAILED',ident,error,flush=True);continue
 model=json.loads((OUT/'models'/f'{ident}.json').read_text())
 records[ident]={'id':ident,'source':path,'bounds':model['bounds'],'parts':len(model['parts']),'triangles':sum(len(p['indices'])//3 for p in model['parts'])}

if '--review' in sys.argv:
 (OUT/'manifest.json').write_text(json.dumps(ns['manifest'],indent=2))
 renderer=(DEPS/'render_assets.py').read_text().split('\nids=')[0]
 renderer=renderer.replace("ROOT=pathlib.Path(__file__).resolve().parent.parent",'ROOT=pathlib.Path('+repr(str(DEST))+')')
 render_ns={'__file__':str(DEPS/'render_assets.py'),'__name__':'bunker_kit_portraits'}
 exec(compile(renderer,'bunker_kit_portraits','exec'),render_ns)
 from PIL import Image,ImageDraw,ImageFont
 sheet=Image.new('RGB',(320*5,270*((len(records)+4)//5)),'#122333')
 for i,(ident,record)in enumerate(records.items()):
  image=render_ns['render'](ident,size=260,eye=(3,2,5),transparent=False,label=False)
  x=(i%5)*320;y=(i//5)*270
  sheet.paste(image,(x+30,y));draw=ImageDraw.Draw(sheet);draw.text((x+8,y+245),ident,fill='white');draw.text((x+8,y+258),' x '.join(str(round(v,2))for v in record['bounds']['size']),fill='#9abacb')
 sheet.save(REVIEW/'candidate-atlas.jpg',quality=92)
 (REVIEW/'candidate-records.json').write_text(json.dumps(records,indent=2))

if '--publish' in sys.argv:
 prior=json.loads((ROOT/'dist/assets/manifest.json').read_text());candidate_manifest=json.loads((OUT/'manifest.json').read_text())
 used=set()
 for ident in approved:
  if ident not in records:raise RuntimeError('Approved asset missing: '+ident)
  source=OUT/'models'/f'{ident}.json';model=json.loads(source.read_text())
  used.update(m['map']for p in model['parts']for m in p['materials']if m.get('map'))
  shutil.copy2(source,ROOT/'dist/assets/models'/source.name)
  prior['assets'][ident]=candidate_manifest['assets'][ident]
 for key,texture in candidate_manifest['textures'].items():
  if texture['map']not in used:continue
  prior['textures'][key]=texture
  source=DEST/'dist'/texture['map'];shutil.copy2(source,ROOT/'dist'/texture['map'])
 (ROOT/'dist/assets/manifest.json').write_text(json.dumps(prior,indent=2))
 kit={'source':'Original FusionFall cache, read-only extraction from the complete local bundle inventory','inventory':json.loads((REVIEW/'summary.json').read_text()),'assets':{k:v for k,v in records.items()if k in approved},'rejectedCandidates':{k:{**v,'reason':rejection_reasons[k]}for k,v in records.items()if k not in approved}}
 (ROOT/'dist/assets/bunker-kit.json').write_text(json.dumps(kit,indent=2))
 (ROOT/'dist/bunker-prop-bounds.js').write_text('// Original model bounds from the reviewed FusionFall kit.\nexport const BUNKER_PROP_BOUNDS='+json.dumps({**{k:records[k]['bounds']for k in sorted(approved)},**{k:prior['assets'][k]['bounds']for k in ['console','crate','antenna','weapon-rifle','weapon-pistol','waste-drum','waste-tv']}},separators=(',',':'))+';\n')
 print('Published',len(approved),'reviewed lab assets',flush=True)
print('Reviewed',len(records),'candidate models',flush=True)
